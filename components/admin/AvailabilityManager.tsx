"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addBlockedDateAction, removeBlockedDateAction } from "@/lib/actions/admin/site";
import { formatDate } from "@/lib/utils";
import type { BlockedDate } from "@/lib/types";

export default function AvailabilityManager({
  items,
  closedWeekdays,
}: {
  items: BlockedDate[];
  closedWeekdays: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await addBlockedDateAction(String(fd.get("date") ?? ""), String(fd.get("reason") ?? ""));
      if (!res.ok) setError(res.error);
      else e.currentTarget.reset();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeBlockedDateAction(id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="font-semibold text-ink-900">Block a date</h2>
        <p className="mt-1 text-xs text-ink-500">
          Festivals, leave, shoots — blocked dates are rejected by the booking system instantly.
        </p>
        <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="admin-label">Date</label>
            <input type="date" name="date" required className="input" />
          </div>
          <div className="min-w-40 flex-1">
            <label className="admin-label">Reason (optional)</label>
            <input name="reason" className="input" placeholder="e.g. Diwali" />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            <Plus size={14} /> Block
          </button>
        </form>
        {error && <p className="field-error mt-2">{error}</p>}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-ink-900">Weekly closed days</h2>
        <p className="mt-1 text-xs text-ink-500">
          Currently: <span className="font-medium">{closedWeekdays}</span> — change them in{" "}
          <a href="/admin/content" className="text-brand-700 hover:underline">Site content → Contact &amp; hours</a>.
        </p>

        <h3 className="mt-5 text-sm font-semibold text-ink-800">Upcoming blocked dates</h3>
        {items.length === 0 ? (
          <p className="mt-3 rounded-lg bg-ink-50 p-4 text-sm text-ink-500">
            No blocked dates ahead — the full weekly schedule is open.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100 rounded-lg border border-ink-100">
            {items.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink-900">{formatDate(b.blocked_on)}</p>
                  {b.reason && <p className="text-xs text-ink-500">{b.reason}</p>}
                </div>
                <button
                  onClick={() => remove(b.id)}
                  disabled={pending}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-rose-600 hover:border-rose-300"
                  aria-label="Unblock date"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
