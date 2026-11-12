"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateCustomerAction } from "@/lib/actions/admin/crm";

export default function CustomerNotes({
  customerId,
  initialNotes,
  canEdit,
}: {
  customerId: string;
  initialNotes: string;
  canEdit: boolean;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateCustomerAction(customerId, { notes });
      setFeedback(res.ok ? "Saved ✓" : res.error ?? "Failed");
    });
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Studio notes</h2>
        {canEdit && (
          <button onClick={save} disabled={pending} className="btn btn-outline btn-xs py-1 text-xs">
            {pending ? <Loader2 size={12} className="animate-spin" /> : null} Save
          </button>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={!canEdit || pending}
        placeholder="Preferences, skin sensitivities, family details, colour choices…"
        className="input mt-2 min-h-32"
      />
      {feedback && <p className="mt-1 text-xs text-emerald-700">{feedback}</p>}
      {!canEdit && <p className="mt-1 text-[11px] text-ink-400">Only managers can edit notes.</p>}
    </div>
  );
}
