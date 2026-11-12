"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitEnquiryAction } from "@/lib/actions/public";
import { track } from "@/lib/analytics";

type Status = { kind: "idle" } | { kind: "success" } | { kind: "error"; message: string };

export default function EnquiryForm({ services }: { services: string[] }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setStatus({ kind: "idle" });
    const input = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      serviceInterest: String(formData.get("serviceInterest") ?? ""),
      message: String(formData.get("message") ?? ""),
      source: "website" as const,
    };

    startTransition(async () => {
      const result = await submitEnquiryAction(input);
      if (result.ok) {
        track("enquiry_submitted", {});
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
        <p className="font-display text-xl font-semibold text-ink-900">Enquiry sent!</p>
        <p className="max-w-sm text-sm text-ink-500">
          We usually reply within a few hours during studio time. Want a faster answer? Send it
          straight to us on WhatsApp.
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
        <h3 className="font-display text-xl font-semibold text-ink-900">Send an enquiry</h3>
        <p className="mt-1 text-sm text-ink-500">
          Ask about prices, availability or bridal packages. We reply on WhatsApp.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="en-name">Name *</label>
          <input id="en-name" name="name" className="input" required maxLength={80} autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="en-phone">Mobile (WhatsApp) *</label>
          <input
            id="en-phone"
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
          <label className="label" htmlFor="en-email">Email (optional)</label>
          <input id="en-email" name="email" type="email" className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="en-service">Service interested in</label>
          <select id="en-service" name="serviceInterest" className="input" defaultValue="">
            <option value="">Not sure yet</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="Makeup course enquiry">Makeup course enquiry</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="en-message">Message</label>
        <textarea
          id="en-message"
          name="message"
          className="input min-h-24"
          maxLength={1000}
          placeholder="Tell us about your occasion, date, location…"
        />
      </div>

      {status.kind === "error" && <p className="field-error">{status.message}</p>}

      <button type="submit" className="btn btn-primary w-full justify-center" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {pending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
