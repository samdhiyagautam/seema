"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createLeadAction } from "@/lib/actions/admin/crm";
import { SOURCE_LABELS } from "@/lib/utils";
import type { SourceChannel } from "@/lib/types";

export default function AddLeadForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await createLeadAction({
        name: String(fd.get("name") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        source: String(fd.get("source") ?? "instagram") as SourceChannel,
        serviceInterest: String(fd.get("serviceInterest") ?? ""),
        message: String(fd.get("message") ?? ""),
      });
      if (res.ok) {
        setDone(true);
        setOpen(false);
        e.currentTarget?.reset?.();
      } else {
        setError(res.error);
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-primary btn-sm">
        <Plus size={14} /> Add lead
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card mb-4 grid gap-3 p-4 sm:grid-cols-2">
      <div>
        <label className="admin-label">Name *</label>
        <input name="name" className="input" required />
      </div>
      <div>
        <label className="admin-label">Mobile *</label>
        <input name="phone" className="input" inputMode="tel" required placeholder="10-digit" />
      </div>
      <div>
        <label className="admin-label">Source</label>
        <select name="source" className="input" defaultValue="instagram">
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="admin-label">Service interest</label>
        <input name="serviceInterest" className="input" placeholder="e.g. Bridal HD Makeup" />
      </div>
      <div className="sm:col-span-2">
        <label className="admin-label">Notes</label>
        <textarea name="message" className="input min-h-16" placeholder="What did they ask?" />
      </div>
      {error && <p className="field-error sm:col-span-2">{error}</p>}
      {done && !error && <p className="text-xs text-emerald-700 sm:col-span-2">Lead added ✓</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : null} Save lead
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
      </div>
    </form>
  );
}
