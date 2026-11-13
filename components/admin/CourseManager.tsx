"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, ChevronDown, Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  createBatchAction,
  createCourseAction,
  deleteBatchAction,
  updateBatchStatusAction,
  updateCourseAction,
} from "@/lib/actions/admin/courses";
import { BATCH_STATUS_META, cx, formatINR, formatDate, todayISO } from "@/lib/utils";
import type { Batch, BatchStatus, Course } from "@/lib/types";

const CATEGORIES = ["Makeup", "Hair", "Skin", "Nails", "Personal"] as const;
const BATCH_STATUSES: BatchStatus[] = ["upcoming", "ongoing", "completed"];

type Feedback = { kind: "ok" | "error"; message: string } | null;

export default function CourseManager({
  courses,
  batches,
  batchSeats,
}: {
  courses: Course[];
  batches: Batch[];
  batchSeats: Record<string, number>;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [openCourse, setOpenCourse] = useState<string | null>(courses[0]?.id ?? null);

  /* add-course form state */
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Makeup");
  const [duration, setDuration] = useState("45");
  const [fee, setFee] = useState("45000");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [kit, setKit] = useState(false);

  /* add-batch form state per course */
  const [batchForm, setBatchForm] = useState<{ courseId: string; name: string; start: string; end: string; schedule: string; capacity: string } | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setFeedback(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) setFeedback({ kind: "ok", message: okMsg });
      else setFeedback({ kind: "error", message: res.error ?? "Something went wrong." });
    });
  }

  function addCourse(e: React.FormEvent) {
    e.preventDefault();
    run(
      () =>
        createCourseAction({
          name,
          category,
          summary,
          description,
          syllabus,
          duration_days: Number(duration),
          fee_inr: Number(fee),
          kit_included: kit,
          is_active: true,
        }),
      "Course created ✓"
    );
    setShowAdd(false);
    setName("");
    setSummary("");
    setDescription("");
    setSyllabus("");
  }

  function addBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!batchForm) return;
    run(
      () =>
        createBatchAction(batchForm.courseId, {
          name: batchForm.name,
          start_date: batchForm.start,
          end_date: batchForm.end,
          schedule: batchForm.schedule,
          capacity: Number(batchForm.capacity),
        }),
      "Batch created ✓"
    );
    setBatchForm(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500">{courses.length} course(s)</p>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="btn btn-primary btn-sm">
          <Plus size={14} /> New course
        </button>
      </div>

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

      {showAdd && (
        <form onSubmit={addCourse} className="card mb-6 space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="c-name">Course name *</label>
              <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="c-cat">Category</label>
              <select id="c-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="c-days">Duration (days)</label>
              <input id="c-days" type="number" min={1} className="input" value={duration} onChange={(e) => setDuration(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="c-fee">Fee (₹)</label>
              <input id="c-fee" type="number" min={0} className="input" value={fee} onChange={(e) => setFee(e.target.value)} required />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-ink-700">
              <input type="checkbox" checked={kit} onChange={(e) => setKit(e.target.checked)} className="h-4 w-4" />
              Kit included
            </label>
          </div>
          <div>
            <label className="label" htmlFor="c-summary">One-line summary</label>
            <input id="c-summary" className="input" maxLength={300} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="c-desc">Full description</label>
            <textarea id="c-desc" className="input min-h-24" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="c-syl">Syllabus (one topic per line)</label>
            <textarea id="c-syl" className="input min-h-24" maxLength={2000} value={syllabus} onChange={(e) => setSyllabus(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create course
          </button>
        </form>
      )}

      <div className="space-y-3">
        {courses.map((c) => {
          const courseBatches = batches.filter((b) => b.course_id === c.id);
          const open = openCourse === c.id;
          return (
            <div key={c.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCourse(open ? null : c.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-ink-900">
                    {c.name}
                    {!c.is_active && <span className="badge bg-ink-100 text-ink-500">Hidden</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {c.category} · {c.duration_days} days · {formatINR(c.fee_inr)} · {courseBatches.length} batch(es)
                  </p>
                </div>
                <ChevronDown size={16} className={cx("shrink-0 text-ink-400 transition", open && "rotate-180")} />
              </button>

              {open && (
                <div className="border-t border-ink-100 px-5 py-4">
                  {/* quick edits */}
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs text-ink-500">
                      Fee (₹)
                      <input
                        type="number"
                        min={0}
                        defaultValue={c.fee_inr}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== c.fee_inr) run(() => updateCourseAction(c.id, { fee_inr: v }), "Fee updated ✓");
                        }}
                        className="input mt-1 w-32 py-1.5"
                      />
                    </label>
                    <label className="text-xs text-ink-500">
                      Duration (days)
                      <input
                        type="number"
                        min={1}
                        defaultValue={c.duration_days}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== c.duration_days) run(() => updateCourseAction(c.id, { duration_days: v }), "Duration updated ✓");
                        }}
                        className="input mt-1 w-24 py-1.5"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => updateCourseAction(c.id, { is_active: !c.is_active }), c.is_active ? "Course hidden ✓" : "Course published ✓")}
                      className={cx("btn btn-sm", c.is_active ? "btn-outline" : "btn-primary")}
                    >
                      {c.is_active ? "Hide from site" : "Publish"}
                    </button>
                  </div>

                  {/* batches */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-ink-900">Batches</h4>
                      <button
                        type="button"
                        onClick={() =>
                          setBatchForm(
                            batchForm?.courseId === c.id
                              ? null
                              : { courseId: c.id, name: "", start: todayISO(), end: "", schedule: "", capacity: "6" }
                          )
                        }
                        className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                      >
                        <CalendarPlus size={13} /> Add batch
                      </button>
                    </div>

                    {batchForm?.courseId === c.id && (
                      <form onSubmit={addBatch} className="mt-3 grid gap-3 rounded-xl bg-ink-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <label className="label">Batch name *</label>
                          <input
                            className="input"
                            required
                            maxLength={80}
                            placeholder="e.g. April 2026 - Morning"
                            value={batchForm.name}
                            onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Starts on *</label>
                          <input
                            type="date"
                            className="input"
                            required
                            value={batchForm.start}
                            onChange={(e) => setBatchForm({ ...batchForm, start: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Ends on</label>
                          <input
                            type="date"
                            className="input"
                            value={batchForm.end}
                            onChange={(e) => setBatchForm({ ...batchForm, end: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Schedule</label>
                          <input
                            className="input"
                            maxLength={120}
                            placeholder="Mon-Fri, 11am-2pm"
                            value={batchForm.schedule}
                            onChange={(e) => setBatchForm({ ...batchForm, schedule: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="label">Seats</label>
                          <input
                            type="number"
                            min={1}
                            className="input"
                            required
                            value={batchForm.capacity}
                            onChange={(e) => setBatchForm({ ...batchForm, capacity: e.target.value })}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
                            <Plus size={14} /> Save batch
                          </button>
                          <button type="button" onClick={() => setBatchForm(null)} className="btn btn-outline btn-sm">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {courseBatches.length === 0 ? (
                      <p className="mt-3 text-xs text-ink-400">No batches yet — add one to open enrollments.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {courseBatches
                          .sort((a, b) => a.start_date.localeCompare(b.start_date))
                          .map((b) => {
                            const seats = batchSeats[b.id] ?? 0;
                            const full = seats >= b.capacity;
                            return (
                              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium text-ink-900">{b.name}</p>
                                  <p className="text-[11px] text-ink-500">
                                    {formatDate(b.start_date)}{b.end_date ? ` → ${formatDate(b.end_date)}` : ""}
                                    {b.schedule ? ` · ${b.schedule}` : ""} · {seats}/{b.capacity} enrolled{full ? " · FULL" : ""}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={b.status}
                                    disabled={pending}
                                    onChange={(e) => run(() => updateBatchStatusAction(b.id, e.target.value as BatchStatus), "Batch updated ✓")}
                                    className={`input w-28 py-1 text-xs ${BATCH_STATUS_META[b.status].className}`}
                                  >
                                    {BATCH_STATUSES.map((s) => (
                                      <option key={s} value={s}>{BATCH_STATUS_META[s].label}</option>
                                    ))}
                                  </select>
                                  <Trash2
                                    size={14}
                                    className="cursor-pointer text-ink-300 hover:text-rose-600"
                                    onClick={() => {
                                      if (window.confirm(`Delete batch "${b.name}"? Enrollments keep their record.`)) {
                                        run(() => deleteBatchAction(b.id), "Batch deleted ✓");
                                      }
                                    }}
                                  />
                                </div>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
