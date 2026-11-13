"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitCourseEnquiryAction } from "@/lib/actions/public";

type Status = { kind: "idle" } | { kind: "success" } | { kind: "error"; message: string };

export default function CourseEnquiryForm({
  courses,
  defaultCourseId,
  defaultCourseName,
}: {
  courses: Array<{ id: string; name: string }>;
  defaultCourseId?: string;
  defaultCourseName?: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setStatus({ kind: "idle" });
    const courseId = String(formData.get("courseId") ?? "");
    const picked = courses.find((c) => c.id === courseId);
    const input = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      courseId,
      courseName: picked?.name ?? "Not sure yet",
      message: String(formData.get("message") ?? ""),
    };

    startTransition(async () => {
      const result = await submitCourseEnquiryAction(input);
      if (result.ok) setStatus({ kind: "success" });
      else setStatus({ kind: "error", message: result.error });
    });
  }

  if (status.kind === "success") {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 size={36} className="text-emerald-600" />
        <p className="font-display text-xl font-semibold text-ink-900">Enquiry sent!</p>
        <p className="max-w-sm text-sm text-ink-500">
          Seema will call you to talk through the course, batch timings and the next steps. Keep
          your phone nearby.
        </p>
      </div>
    );
  }

  return (
    <form
      className="card space-y-4 p-6 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
    >
      <div>
        <h3 className="font-display text-xl font-semibold text-ink-900">Enquire about a course</h3>
        <p className="mt-1 text-sm text-ink-500">
          Tell us which course you&apos;re eyeing. We&apos;ll share batch dates, seat availability
          and how the fee works.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ce-name">Name *</label>
          <input id="ce-name" name="name" className="input" required maxLength={80} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="ce-phone">Mobile (WhatsApp) *</label>
          <input
            id="ce-phone"
            name="phone"
            className="input"
            inputMode="tel"
            placeholder="10-digit mobile"
            required
            autoComplete="tel"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ce-email">Email (optional)</label>
          <input id="ce-email" name="email" type="email" className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="ce-course">Course</label>
          <select
            id="ce-course"
            name="courseId"
            className="input"
            defaultValue={defaultCourseId ?? ""}
          >
            <option value="">Not sure yet</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {defaultCourseName && (
            <p className="mt-1 text-xs text-ink-400">Selected: {defaultCourseName}</p>
          )}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="ce-message">Anything we should know?</label>
        <textarea
          id="ce-message"
          name="message"
          className="input min-h-24"
          maxLength={1000}
          placeholder="Current skill level, preferred timing, when you want to start…"
        />
      </div>

      {status.kind === "error" && <p className="field-error">{status.message}</p>}

      <button type="submit" className="btn btn-primary w-full justify-center" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {pending ? "Sending…" : "Send course enquiry"}
      </button>
    </form>
  );
}
