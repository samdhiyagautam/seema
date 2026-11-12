"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, MessageCircle, Trash2 } from "lucide-react";
import {
  assignStaffAction,
  deleteBookingAction,
  rescheduleBookingAction,
  setBookingStatusAction,
  updateBookingPaymentAction,
  updateBookingNotesAction,
} from "@/lib/actions/admin/bookings";
import {
  BOOKING_STATUS_META,
  PAYMENT_STATUS_META,
  balance,
  formatDate,
  formatINR,
  formatTime,
  netTotal,
  waLink,
  cx,
} from "@/lib/utils";
import type { Booking } from "@/lib/types";

type Props = {
  booking: Booking;
  staff: Array<{ id: string; full_name: string }>;
  canDelete: boolean;
  canManage: boolean;
  showMoney: boolean;
};

const STATUS_FLOW: Record<string, Array<"pending" | "confirmed" | "completed" | "cancelled" | "no_show">> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: ["pending", "confirmed"],
  no_show: ["confirmed", "completed"],
};

export default function BookingRow({ booking: b, staff, canDelete, canManage, showMoney }: Props) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"reschedule" | "payment" | "notes" | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const net = netTotal(b);
  const due = balance(b);
  const name = b.customer?.full_name ?? "—";
  const phone = b.customer?.phone ?? "";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setFeedback(null);
    startTransition(async () => {
      const res = await fn();
      setFeedback(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error ?? "Failed" });
    });
  }

  function reschedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = String(fd.get("date") ?? "");
    const time = String(fd.get("time") ?? "");
    run(() => rescheduleBookingAction(b.id, date, time), "Rescheduled ✓");
  }

  function savePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amountPaid = parseInt(String(fd.get("amountPaid") ?? "0"), 10) || 0;
    const discount = parseInt(String(fd.get("discount") ?? "0"), 10) || 0;
    run(
      () => updateBookingPaymentAction(b.id, { amount_paid: amountPaid, discount_amount: discount }),
      "Payment updated ✓"
    );
  }

  function saveNotes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(() => updateBookingNotesAction(b.id, String(fd.get("notes") ?? "")), "Notes saved ✓");
  }

  function cancelWithReason() {
    const reason = window.prompt("Reason for cancellation (saved to admin notes):");
    if (reason === null) return;
    run(() => setBookingStatusAction(b.id, "cancelled", reason || undefined), "Cancelled");
  }

  function remove() {
    if (!window.confirm(`Delete booking ${b.code}? This cannot be undone.`)) return;
    run(() => deleteBookingAction(b.id), "Deleted");
  }

  const waText =
    b.status === "pending"
      ? `Hi ${name}! We've received your booking ${b.code} for ${b.service_name} on ${formatDate(
          b.appointment_date
        )}, ${formatTime(b.appointment_time)}. We'll confirm shortly. — Seema Makeover Studio`
      : `Hi ${name}! Reminder: your ${b.service_name} appointment is on ${formatDate(
          b.appointment_date
        )} at ${formatTime(b.appointment_time)}. Booking code ${b.code}. See you then!`;

  return (
    <tr className={cx("align-top", pending && "opacity-60")}>
      <td className="px-4 py-3 text-sm">
        <p className="font-mono text-xs text-ink-500">{b.code}</p>
        <p className="mt-1 font-medium text-ink-900">{formatDate(b.appointment_date)}</p>
        <p className="text-xs text-ink-500">
          {formatTime(b.appointment_time)} · {b.duration_minutes} min
        </p>
      </td>
      <td className="px-4 py-3 text-sm">
        <p className="font-medium text-ink-900">{name}</p>
        <p className="text-xs text-ink-500">{phone}</p>
        <p className="mt-0.5 text-[11px] text-ink-400">via {b.channel}</p>
      </td>
      <td className="px-4 py-3 text-sm">{b.service_name}</td>
      <td className="px-4 py-3">
        <span className={cx("badge", BOOKING_STATUS_META[b.status].className)}>
          {BOOKING_STATUS_META[b.status].label}
        </span>
      </td>
      {showMoney ? (
        <td className="px-4 py-3 text-sm">
          <span className={cx("badge", PAYMENT_STATUS_META[b.payment_status].className)}>
            {PAYMENT_STATUS_META[b.payment_status].label}
          </span>
          <p className="mt-1 text-xs text-ink-500">
            {formatINR(net)}
            {b.discount_amount > 0 && <span className="text-emerald-600"> (−{formatINR(b.discount_amount)})</span>}
          </p>
          {due > 0 && ["confirmed", "completed"].includes(b.status) && (
            <p className="text-xs font-medium text-amber-700">Due {formatINR(due)}</p>
          )}
          {b.refund_amount > 0 && <p className="text-xs text-rose-600">Refunded {formatINR(b.refund_amount)}</p>}
        </td>
      ) : (
        <td className="px-4 py-3 text-sm text-ink-300" aria-hidden>
          —
        </td>
      )}
      <td className="px-4 py-3">
        {canManage ? (
        <div className="relative">
          <button
            onClick={() => {
              setOpen((v) => !v);
              setPanel(null);
              setFeedback(null);
            }}
            className="flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:border-brand-300"
          >
            Manage <ChevronDown size={13} className={cx("transition", open && "rotate-180")} />
          </button>

          {open && (
            <div className="absolute right-2 z-20 mt-2 w-64 rounded-xl border border-ink-100 bg-white p-3 shadow-lg">
              {feedback && (
                <p className={cx("mb-2 text-xs font-medium", feedback.ok ? "text-emerald-700" : "text-rose-700")}>
                  {feedback.text}
                </p>
              )}

              <a
                href={waLink(phone, waText)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-emerald-50"
              >
                <MessageCircle size={14} className="text-emerald-600" /> WhatsApp customer
              </a>

              {(STATUS_FLOW[b.status] ?? []).map((s) => (
                <button
                  key={s}
                  disabled={pending}
                  onClick={() => run(() => setBookingStatusAction(b.id, s), `Marked ${s.replace("_", " ")}`)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-brand-50"
                >
                  <Check size={14} className="text-brand-600" />
                  Mark {s.replace("_", " ")}
                </button>
              ))}

              <button
                onClick={() => setPanel(panel === "reschedule" ? null : "reschedule")}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-brand-50"
              >
                Reschedule
              </button>
              <button
                onClick={() => setPanel(panel === "payment" ? null : "payment")}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-brand-50"
              >
                Payments
              </button>
              <button
                onClick={() => setPanel(panel === "notes" ? null : "notes")}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-brand-50"
              >
                Admin notes
              </button>

              {staff.length > 0 && (
                <select
                  value={b.assigned_staff_id ?? ""}
                  onChange={(e) =>
                    run(() => assignStaffAction(b.id, e.target.value || null), "Artist assigned ✓")
                  }
                  className="input mt-2 py-1.5 text-xs"
                >
                  <option value="">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              )}

              {panel === "reschedule" && (
                <form onSubmit={reschedule} className="mt-2 space-y-2 rounded-lg bg-ink-50 p-2">
                  <input type="date" name="date" defaultValue={b.appointment_date} className="input py-1.5 text-xs" required />
                  <input type="time" name="time" defaultValue={b.appointment_time.slice(0, 5)} className="input py-1.5 text-xs" required />
                  <button type="submit" className="btn btn-primary btn-xs w-full justify-center py-1.5 text-xs" disabled={pending}>
                    Save new time
                  </button>
                </form>
              )}

              {panel === "payment" && (
                <form onSubmit={savePayment} className="mt-2 space-y-2 rounded-lg bg-ink-50 p-2">
                  <label className="text-[11px] font-semibold text-ink-500">Amount received (₹)</label>
                  <input
                    type="number"
                    name="amountPaid"
                    min={0}
                    defaultValue={b.amount_paid}
                    className="input py-1.5 text-xs"
                  />
                  <label className="text-[11px] font-semibold text-ink-500">Discount (₹)</label>
                  <input
                    type="number"
                    name="discount"
                    min={0}
                    defaultValue={b.discount_amount}
                    className="input py-1.5 text-xs"
                  />
                  <button type="submit" className="btn btn-primary w-full justify-center py-1.5 text-xs" disabled={pending}>
                    Save payment
                  </button>
                  {due > 0 && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            updateBookingPaymentAction(b.id, {
                              amount_paid: net,
                              discount_amount: b.discount_amount,
                            }),
                          "Marked fully paid ✓"
                        )
                      }
                      className="btn btn-outline w-full justify-center py-1.5 text-xs"
                    >
                      Mark fully paid ({formatINR(due)} due)
                    </button>
                  )}
                </form>
              )}

              {panel === "notes" && (
                <form onSubmit={saveNotes} className="mt-2 space-y-2 rounded-lg bg-ink-50 p-2">
                  <textarea
                    name="notes"
                    defaultValue={b.admin_notes ?? ""}
                    placeholder="Internal notes (not shown to customer)"
                    className="input min-h-16 py-1.5 text-xs"
                  />
                  <button type="submit" className="btn btn-primary w-full justify-center py-1.5 text-xs" disabled={pending}>
                    Save notes
                  </button>
                </form>
              )}

              {canDelete && (
                <button
                  onClick={remove}
                  disabled={pending}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 size={14} /> Delete booking
                </button>
              )}
             </div>
           )}
        </div>
        ) : (
          <span className="text-xs text-ink-300">View only</span>
        )}
      </td>
    </tr>
  );
}
