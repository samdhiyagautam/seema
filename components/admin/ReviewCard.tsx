"use client";

import { useTransition } from "react";
import { BadgeCheck, Check, Trash2, X } from "lucide-react";
import { deleteReviewAction, moderateReviewAction } from "@/lib/actions/admin/catalog";
import Stars from "@/components/site/Stars";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review: r, mode }: { review: Review; mode: "pending" | "approved" }) {
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      await fn();
    });
  }

  return (
    <div className={`card p-5 ${pending ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stars rating={r.rating} />
        <div className="flex items-center gap-2">
          {r.is_verified && (
            <span className="badge bg-emerald-50 text-emerald-700">
              <BadgeCheck size={12} /> Verified booking
            </span>
          )}
          <span className="text-[11px] text-ink-400">
            {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
            {r.author_phone ?? "no phone"}
          </span>
        </div>
      </div>
      <blockquote className="mt-2 text-sm leading-relaxed text-ink-600">“{r.comment}”</blockquote>
      <p className="mt-2 text-sm font-semibold text-ink-900">{r.author_name}</p>

      <div className="mt-3 flex gap-2">
        {mode === "pending" ? (
          <>
            <button
              onClick={() => act(() => moderateReviewAction(r.id, true))}
              className="btn btn-primary btn-xs py-1.5 text-xs"
              disabled={pending}
            >
              <Check size={13} /> Approve
            </button>
            <button
              onClick={() => act(() => moderateReviewAction(r.id, false))}
              className="btn btn-ghost btn-xs border border-ink-200 py-1.5 text-xs"
              disabled={pending}
            >
              <X size={13} /> Reject
            </button>
          </>
        ) : (
          <button
            onClick={() => act(() => moderateReviewAction(r.id, false))}
            className="btn btn-ghost btn-xs border border-ink-200 py-1.5 text-xs"
            disabled={pending}
          >
            Unpublish
          </button>
        )}
        <button
          onClick={() => {
            if (window.confirm("Delete this review permanently?")) act(() => deleteReviewAction(r.id));
          }}
          className="btn btn-ghost btn-xs py-1.5 text-xs text-rose-700"
          disabled={pending}
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}
