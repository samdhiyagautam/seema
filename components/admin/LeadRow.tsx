"use client";

import { useState, useTransition } from "react";
import { MessageCircle, UserCheck } from "lucide-react";
import { convertLeadAction, updateLeadAction } from "@/lib/actions/admin/crm";
import { LEAD_STATUS_META, formatDate, formatINR, waLink } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types";

const STATUSES: LeadStatus[] = ["new", "contacted", "follow_up", "converted", "lost"];

export default function LeadRow({ lead: l }: { lead: Lead }) {
  const [pending, startTransition] = useTransition();
  const [lostReason, setLostReason] = useState(l.lost_reason ?? "");
  const [showReason, setShowReason] = useState(l.status === "lost");
  const [feedback, setFeedback] = useState<string | null>(null);

  function patch(patchBody: Parameters<typeof updateLeadAction>[1], msg: string) {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateLeadAction(l.id, patchBody);
      setFeedback(res.ok ? msg : res.error ?? "Failed");
    });
  }

  const overdue =
    l.follow_up_on && l.status !== "converted" && l.status !== "lost" && l.follow_up_on < new Date().toISOString().slice(0, 10);

  return (
    <tr className={pending ? "opacity-60" : ""}>
      <td className="px-4 py-3 text-sm">
        <p className="font-medium text-ink-900">{l.full_name}</p>
        <p className="text-xs text-ink-500">{l.phone}</p>
        <p className="text-[11px] text-ink-400">
          {new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {l.source}
        </p>
      </td>
      <td className="px-4 py-3 text-sm">
        <p>{l.service_interest || "General"}</p>
        {l.message && <p className="mt-0.5 max-w-56 truncate text-xs text-ink-400">{l.message}</p>}
      </td>
      <td className="px-4 py-3">
        <select
          value={l.status}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as LeadStatus;
            if (next === "lost") {
              setShowReason(true);
              return; // reason set below triggers the actual update
            }
            setShowReason(false);
            patch({ status: next }, "Status updated ✓");
          }}
          className={`input w-32 py-1.5 text-xs ${LEAD_STATUS_META[l.status].className}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_META[s].label}
            </option>
          ))}
        </select>
        {showReason && (
          <form
            className="mt-1 flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!lostReason.trim()) return;
              patch({ status: "lost", lost_reason: lostReason.trim() }, "Marked lost ✓");
            }}
          >
            <input
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Lost reason…"
              className="input py-1 text-xs"
            />
            <button type="submit" className="btn btn-primary py-1 text-[11px]">Save</button>
          </form>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        <input
          type="date"
          defaultValue={l.follow_up_on ?? ""}
          disabled={pending}
          onChange={(e) => patch({ follow_up_on: e.target.value || null }, "Follow-up saved ✓")}
          className={`input w-36 py-1.5 text-xs ${overdue ? "border-rose-300 text-rose-700" : ""}`}
        />
        {overdue && <p className="mt-0.5 text-[11px] font-medium text-rose-600">Overdue</p>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <a
            href={waLink(l.phone, `Hi ${l.full_name}! Following up on your enquiry at Seema Makeover Studio.`)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp lead"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-emerald-600 hover:border-emerald-300"
          >
            <MessageCircle size={14} />
          </a>
          {l.status !== "converted" && (
            <button
              disabled={pending}
              onClick={() => {
                setFeedback(null);
                startTransition(async () => {
                  const res = await convertLeadAction(l.id, null);
                  setFeedback(res.ok ? "Converted ✓" : res.error ?? "Failed");
                });
              }}
              aria-label="Mark converted"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-emerald-700 hover:border-emerald-300"
              title="Mark converted"
            >
              <UserCheck size={14} />
            </button>
          )}
        </div>
        {feedback && <p className="mt-1 max-w-32 text-[11px] text-ink-500">{feedback}</p>}
      </td>
    </tr>
  );
}
