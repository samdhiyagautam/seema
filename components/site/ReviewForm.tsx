"use client";

import { useState, useTransition } from "react";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import { submitReviewAction } from "@/lib/actions/public";
import { cx } from "@/lib/utils";

type Status = { kind: "idle" } | { kind: "success" } | { kind: "error"; message: string };

export default function ReviewForm() {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setStatus({ kind: "idle" });
    const input = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      rating,
      comment: String(formData.get("comment") ?? ""),
      bookingCode: String(formData.get("bookingCode") ?? ""),
    };

    startTransition(async () => {
      const result = await submitReviewAction(input);
      if (result.ok) {
        setStatus({ kind: "success" });
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  if (status.kind === "success") {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 size={36} className="text-emerald-600" />
        <p className="font-display text-xl font-semibold text-ink-900">Thank you!</p>
        <p className="max-w-sm text-sm text-ink-500">
          Your review was submitted and will appear once the studio approves it — we only publish
          genuine feedback.
        </p>
      </div>
    );
  }

  return (
    <form
      className="card space-y-4 p-6 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
    >
      <div>
        <h3 className="font-display text-xl font-semibold text-ink-900">Share your experience</h3>
        <p className="mt-1 text-sm text-ink-500">
          Had a booking with us? Add your booking code to earn the <strong>Verified</strong> badge.
        </p>
      </div>

      <div>
        <span className="label">Your rating</span>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star
                size={26}
                className={cx(
                  (hover || rating) >= n ? "fill-gold-500 text-gold-500" : "fill-none text-ink-300"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="rv-name">Name *</label>
          <input id="rv-name" name="name" className="input" required maxLength={80} />
        </div>
        <div>
          <label className="label" htmlFor="rv-phone">Mobile number *</label>
          <input
            id="rv-phone"
            name="phone"
            className="input"
            inputMode="tel"
            placeholder="10-digit mobile"
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="rv-comment">Your review *</label>
        <textarea
          id="rv-comment"
          name="comment"
          className="input min-h-24"
          required
          maxLength={1000}
          placeholder="How was your experience?"
        />
      </div>

      <div>
        <label className="label" htmlFor="rv-code">Booking code (optional)</label>
        <input
          id="rv-code"
          name="bookingCode"
          className="input"
          placeholder="e.g. BK-260101-A1B2"
        />
      </div>

      {status.kind === "error" && <p className="field-error">{status.message}</p>}

      <button
        type="submit"
        className="btn btn-primary w-full justify-center"
        disabled={pending}
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
