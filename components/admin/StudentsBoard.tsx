"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BadgeCheck,
  ChevronDown,
  IndianRupee,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  convertCourseEnquiryAction,
  createStudentAction,
  deleteFeePaymentAction,
  enrollStudentAction,
  recordFeePaymentAction,
  updateCourseEnquiryAction,
  updateEnrollmentStatusAction,
} from "@/lib/actions/admin/courses";
import {
  cx,
  ENROLLMENT_STATUS_META,
  FEE_METHOD_LABELS,
  formatDate,
  formatINR,
  LEAD_STATUS_META,
  todayISO,
  waLink,
} from "@/lib/utils";
import type {
  Batch,
  Course,
  CourseEnquiry,
  Enrollment,
  EnrollmentStatus,
  FeePayment,
  LeadStatus,
  Student,
} from "@/lib/types";

const ENQ_STATUSES: LeadStatus[] = ["new", "contacted", "follow_up", "converted", "lost"];
const ENROLL_STATUSES: EnrollmentStatus[] = ["active", "completed", "dropped"];

type Feedback = { kind: "ok" | "error"; message: string } | null;

export default function StudentsBoard({
  enquiries,
  students,
  enrollments,
  payments,
  courses,
  batches,
  batchSeats,
}: {
  enquiries: CourseEnquiry[];
  students: Student[];
  enrollments: Enrollment[];
  payments: FeePayment[];
  courses: Course[];
  batches: Batch[];
  batchSeats: Record<string, number>;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [stName, setStName] = useState("");
  const [stPhone, setStPhone] = useState("");
  const [stEmail, setStEmail] = useState("");

  const [registering, setRegistering] = useState<CourseEnquiry | null>(null);
  const [enrolling, setEnrolling] = useState<Student | null>(null);
  const [paying, setPaying] = useState<Enrollment | null>(null);

  const byStudent = useMemo(() => {
    const map = new Map<string, Enrollment[]>();
    for (const e of enrollments) {
      const list = map.get(e.student_id) ?? [];
      list.push(e);
      map.set(e.student_id, list);
    }
    return map;
  }, [enrollments]);

  const byEnrollment = useMemo(() => {
    const map = new Map<string, FeePayment[]>();
    for (const p of payments) {
      const list = map.get(p.enrollment_id) ?? [];
      list.push(p);
      map.set(p.enrollment_id, list);
    }
    return map;
  }, [payments]);

  const openEnquiries = enquiries.filter((q) => q.status !== "converted" && q.status !== "lost");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setFeedback(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) setFeedback({ kind: "ok", message: okMsg });
      else setFeedback({ kind: "error", message: res.error ?? "Something went wrong." });
    });
  }

  /* ------------------------------------------------------- register form */

  const registerForm = (enquiry: CourseEnquiry) => {
    const enquiryCourse = courses.find((c) => c.id === enquiry.course_id);
    return (
      <RegisterForm
        key={enquiry.id}
        enquiryPhone={enquiry.phone}
        courses={courses}
        batches={batches}
        batchSeats={batchSeats}
        defaultCourseId={enquiryCourse?.id ?? courses[0]?.id ?? ""}
        onDone={() => setRegistering(null)}
        submit={(courseId, batchId, fee, discount) =>
          run(
            () =>
              convertCourseEnquiryAction(enquiry.id, {
                course_id: courseId,
                batch_id: batchId,
                fee_inr: fee,
                discount_amount: discount,
              }),
            "Registered — student and enrollment created ✓"
          )
        }
        pending={pending}
      />
    );
  };

  /* ------------------------------------------------------- enroll form */

  const enrollForm = (student: Student) => (
    <RegisterForm
      key={student.id}
      enquiryPhone={student.phone}
      courses={courses}
      batches={batches}
      batchSeats={batchSeats}
      defaultCourseId=""
      onDone={() => setEnrolling(null)}
      submit={(courseId, batchId, fee, discount) =>
        run(
          () =>
            enrollStudentAction({
              student_id: student.id,
              course_id: courseId,
              batch_id: batchId,
              fee_inr: fee,
              discount_amount: discount,
            }),
          "Enrollment created ✓"
        )
      }
      pending={pending}
    />
  );

  return (
    <div>
      {feedback && (
        <p
          className={cx(
            "mb-4 rounded-xl px-4 py-2.5 text-sm",
            feedback.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
          )}
        >
          {feedback.message}
        </p>
      )}

      {/* ---------------------------------------------------- enquiries */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">
            Course enquiries <span className="text-ink-400">({openEnquiries.length} open)</span>
          </h2>
        </div>
        {enquiries.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-500">
            No course enquiries yet. They arrive from the Courses page of the website.
          </div>
        ) : (
          <div className="card divide-y divide-ink-100">
            {enquiries.map((q) => (
              <div key={q.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">
                      {q.full_name} <span className="text-ink-400">· {q.phone}</span>
                      <span className={`badge ml-2 ${LEAD_STATUS_META[q.status].className}`}>
                        {LEAD_STATUS_META[q.status].label}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {q.course_name || "Course not specified"}
                      {q.message ? ` — "${q.message.slice(0, 80)}"` : ""}
                      {" · "}
                      {new Date(q.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={q.status}
                      disabled={pending}
                      onChange={(e) =>
                        run(
                          () => updateCourseEnquiryAction(q.id, { status: e.target.value }),
                          "Enquiry updated ✓"
                        )
                      }
                      className="input w-32 py-1.5 text-xs"
                    >
                      {ENQ_STATUSES.map((s) => (
                        <option key={s} value={s}>{LEAD_STATUS_META[s].label}</option>
                      ))}
                    </select>
                    {q.status !== "converted" && q.status !== "lost" && (
                      <button
                        type="button"
                        onClick={() => setRegistering(registering?.id === q.id ? null : q)}
                        className="btn btn-primary btn-sm"
                      >
                        <UserPlus size={13} /> Register
                      </button>
                    )}
                    <a
                      href={waLink(q.phone, `Hi ${q.full_name}! Regarding the makeup course you asked about —`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
                {registering?.id === q.id && <div className="mt-3">{registerForm(q)}</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- students */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">
            Students <span className="text-ink-400">({students.length})</span>
          </h2>
          <button type="button" onClick={() => setShowAddStudent((v) => !v)} className="btn btn-outline btn-sm">
            <Plus size={14} /> Add student
          </button>
        </div>

        {showAddStudent && (
          <form
            className="card mb-4 grid gap-3 p-5 sm:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () =>
                  createStudentAction({
                    name: stName,
                    phone: stPhone,
                    email: stEmail,
                  }),
                "Student added ✓"
              );
              setShowAddStudent(false);
              setStName("");
              setStPhone("");
              setStEmail("");
            }}
          >
            <div>
              <label className="label">Name *</label>
              <input className="input" required minLength={2} maxLength={80} value={stName} onChange={(e) => setStName(e.target.value)} />
            </div>
            <div>
              <label className="label">Mobile (WhatsApp) *</label>
              <input className="input" inputMode="tel" required value={stPhone} onChange={(e) => setStPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={stEmail} onChange={(e) => setStEmail(e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save student
              </button>
            </div>
          </form>
        )}

        {students.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-500">
            No students yet. Register one from an enquiry above, or add manually.
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((s) => {
              const list = byStudent.get(s.id) ?? [];
              const totalDue = list.reduce(
                (sum, e) => sum + Math.max(0, e.fee_inr - e.discount_amount - e.amount_paid),
                0
              );
              return (
                <div key={s.id} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">
                        {s.full_name} <span className="text-ink-400">· {s.phone}</span>
                        {totalDue > 0 && (
                          <span className="badge ml-2 bg-amber-100 text-amber-800">
                            {formatINR(totalDue)} due
                          </span>
                        )}
                        {list.length > 0 && totalDue === 0 && (
                          <span className="badge ml-2 bg-emerald-100 text-emerald-800">Fees clear</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {list.length ? list.map((e) => e.course_name).join(", ") : "No enrollment yet"}
                        {" · joined "}
                        {formatDate(s.joined_on)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={waLink(s.phone, `Hi ${s.full_name}! Quick update about your course at the studio:`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                      >
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => setEnrolling(enrolling?.id === s.id ? null : s)}
                        className="btn btn-primary btn-sm"
                      >
                        <UserPlus size={13} /> Enroll
                      </button>
                    </div>
                  </div>

                  {enrolling?.id === s.id && <div className="border-t border-ink-100 p-4">{enrollForm(s)}</div>}

                  {list.length > 0 && (
                    <div className="divide-y divide-ink-100 border-t border-ink-100">
                      {list.map((e) => {
                        const ledger = byEnrollment.get(e.id) ?? [];
                        const due = Math.max(0, e.fee_inr - e.discount_amount - e.amount_paid);
                        const meta = ENROLLMENT_STATUS_META[e.status];
                        return (
                          <div key={e.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-ink-900">
                                  {e.course_name}
                                  <span className={`badge ml-2 ${meta.className}`}>{meta.label}</span>
                                </p>
                                <p className="mt-0.5 text-xs text-ink-500">
                                  Fee {formatINR(e.fee_inr)}
                                  {e.discount_amount > 0 ? ` − ${formatINR(e.discount_amount)} discount` : ""}
                                  {" · paid "}
                                  {formatINR(e.amount_paid)}
                                  {" · "}
                                  <span className={due > 0 ? "font-semibold text-amber-700" : "text-emerald-700"}>
                                    {due > 0 ? `${formatINR(due)} due` : "fully paid"}
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={e.status}
                                  disabled={pending}
                                  onChange={(ev) =>
                                    run(
                                      () => updateEnrollmentStatusAction(e.id, ev.target.value as EnrollmentStatus),
                                      "Enrollment updated ✓"
                                    )
                                  }
                                  className="input w-28 py-1 text-xs"
                                >
                                  {ENROLL_STATUSES.map((st) => (
                                    <option key={st} value={st}>{ENROLLMENT_STATUS_META[st].label}</option>
                                  ))}
                                </select>
                                {due > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setPaying(paying?.id === e.id ? null : e)}
                                    className="btn btn-outline btn-sm"
                                  >
                                    <IndianRupee size={13} /> Payment
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* fee ledger */}
                            {ledger.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {ledger
                                  .slice()
                                  .sort((a, b) => b.paid_on.localeCompare(a.paid_on))
                                  .map((p) => (
                                    <li key={p.id} className="flex items-center justify-between rounded-lg bg-ink-50/70 px-3 py-1.5 text-xs">
                                      <span className="text-ink-600">
                                        {formatDate(p.paid_on)} · {FEE_METHOD_LABELS[p.method] ?? p.method}
                                        {p.note ? ` · ${p.note}` : ""}
                                      </span>
                                      <span className="flex items-center gap-2 font-semibold text-ink-800">
                                        <BadgeCheck size={12} className="text-emerald-600" />
                                        {formatINR(p.amount_inr)}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (window.confirm("Remove this ledger entry? The paid total re-sums automatically.")) {
                                              run(() => deleteFeePaymentAction(p.id), "Ledger entry removed ✓");
                                            }
                                          }}
                                          className="text-ink-300 hover:text-rose-600"
                                          aria-label="Remove ledger entry"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            )}

                            {paying?.id === e.id && (
                              <PaymentForm
                                due={due}
                                submit={(amount, method, note, paidOn) =>
                                  run(
                                    () =>
                                      recordFeePaymentAction({
                                        enrollment_id: e.id,
                                        paid_on: paidOn,
                                        amount_inr: amount,
                                        method,
                                        note,
                                      }),
                                    "Payment recorded ✓"
                                  )
                                }
                                onDone={() => setPaying(null)}
                                pending={pending}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------- sub-forms */

function RegisterForm({
  courses,
  batches,
  batchSeats,
  defaultCourseId,
  submit,
  onDone,
  pending,
}: {
  enquiryPhone?: string;
  courses: Course[];
  batches: Batch[];
  batchSeats: Record<string, number>;
  defaultCourseId: string;
  submit: (courseId: string, batchId: string, fee: number, discount: number) => void;
  onDone: () => void;
  pending: boolean;
}) {
  const [courseId, setCourseId] = useState(defaultCourseId || courses[0]?.id || "");
  const [batchId, setBatchId] = useState("");
  const [fee, setFee] = useState(String(courses.find((c) => c.id === defaultCourseId)?.fee_inr ?? courses[0]?.fee_inr ?? 0));
  const [discount, setDiscount] = useState("0");

  const courseBatches = batches.filter((b) => b.course_id === courseId && b.status !== "completed");

  return (
    <form
      className="grid gap-3 rounded-xl bg-ink-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!courseId) return;
        submit(courseId, batchId, Number(fee), Number(discount));
        onDone();
      }}
    >
      <div>
        <label className="label">Course *</label>
        <select
          className="input"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            const c = courses.find((x) => x.id === e.target.value);
            setFee(String(c?.fee_inr ?? 0));
            setBatchId("");
          }}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Batch</label>
        <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">No batch yet</option>
          {courseBatches.map((b) => {
            const seats = batchSeats[b.id] ?? 0;
            return (
              <option key={b.id} value={b.id} disabled={seats >= b.capacity}>
                {b.name} ({seats}/{b.capacity})
              </option>
            );
          })}
        </select>
      </div>
      <div>
        <label className="label">Fee (₹) *</label>
        <input type="number" min={0} className="input" required value={fee} onChange={(e) => setFee(e.target.value)} />
      </div>
      <div>
        <label className="label">Discount (₹)</label>
        <input type="number" min={0} className="input" value={discount} onChange={(e) => setDiscount(e.target.value)} />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />} Confirm registration
        </button>
        <button type="button" onClick={onDone} className="btn btn-outline btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function PaymentForm({
  due,
  submit,
  onDone,
  pending,
}: {
  due: number;
  submit: (amount: number, method: "upi" | "cash" | "bank" | "other", note: string, paidOn: string) => void;
  onDone: () => void;
  pending: boolean;
}) {
  const [amount, setAmount] = useState(String(due));
  const [method, setMethod] = useState<"upi" | "cash" | "bank" | "other">("upi");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());

  return (
    <form
      className="mt-3 grid gap-3 rounded-xl bg-emerald-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(Number(amount), method, note, paidOn);
        onDone();
      }}
    >
      <div>
        <label className="label">Amount (₹) · due {formatINR(due)}</label>
        <input type="number" min={1} max={due} className="input" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <label className="label">Method</label>
        <select className="input" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
          <option value="upi">UPI</option>
          <option value="cash">Cash</option>
          <option value="bank">Bank transfer</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label">Date</label>
        <input type="date" className="input" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
      </div>
      <div>
        <label className="label">Note</label>
        <input className="input" maxLength={200} placeholder="e.g. 2nd installment" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : null} Record payment
        </button>
        <button type="button" onClick={onDone} className="btn btn-outline btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
