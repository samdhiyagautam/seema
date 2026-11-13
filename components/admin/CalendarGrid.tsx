"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarOff, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { rescheduleBookingAction } from "@/lib/actions/admin/bookings";
import {
  BOOKING_STATUS_META,
  cx,
  formatTime,
  WEEKDAYS,
} from "@/lib/utils";
import type { BookingStatus } from "@/lib/types";

export type CalendarBooking = {
  id: string;
  code: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  duration_minutes: number;
  service_name: string;
  status: BookingStatus;
  customer_name: string;
  customer_phone: string;
};

type Toast = { kind: "ok" | "error"; message: string } | null;

function parseDay(iso: string) {
  return new Date(`${iso}T12:00:00`);
}
function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(iso: string, days: number) {
  const d = parseDay(iso);
  d.setDate(d.getDate() + days);
  return isoOf(d);
}
/** Monday-first week start. */
function weekStart(iso: string) {
  const d = parseDay(iso);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return isoOf(d);
}
function addMonths(iso: string, delta: number) {
  const d = parseDay(iso);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return isoOf(d);
}

const BLOCKED_STATUSES: BookingStatus[] = ["completed", "cancelled"];

export default function CalendarGrid({
  bookings,
  blockedDates,
  closedWeekdays,
  anchor,
  canManage,
}: {
  bookings: CalendarBooking[];
  blockedDates: string[];
  closedWeekdays: number[];
  anchor: string; // YYYY-MM-DD
  canManage: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(anchor);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [pending, startTransition] = useTransition();

  const blocked = useMemo(() => new Set(blockedDates), [blockedDates]);
  const closed = useMemo(() => new Set(closedWeekdays), [closedWeekdays]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      const list = map.get(b.appointment_date) ?? [];
      list.push(b);
      map.set(b.appointment_date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    }
    return map;
  }, [bookings]);

  const today = useMemo(() => isoOf(new Date()), []);

  const cells = useMemo(() => {
    if (view === "week") {
      const start = weekStart(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = `${cursor.slice(0, 7)}-01`;
    const start = weekStart(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  function move(id: string, targetDate: string, time: string) {
    setToast(null);
    startTransition(async () => {
      const res = await rescheduleBookingAction(id, targetDate, time);
      if (res.ok) {
        setToast({ kind: "ok", message: `Moved to ${targetDate} — slot re-checked and free.` });
        router.refresh();
      } else {
        setToast({ kind: "error", message: res.error ?? "Could not move that appointment." });
        router.refresh();
      }
    });
  }

  const chip = (b: CalendarBooking) => {
    const movable = canManage && !BLOCKED_STATUSES.includes(b.status);
    const meta = BOOKING_STATUS_META[b.status];
    return (
      <a
        key={b.id}
        href={`/admin/bookings?date=${b.appointment_date}`}
        draggable={movable}
        onDragStart={(e) => {
          if (!movable) {
            e.preventDefault();
            return;
          }
          setDragId(b.id);
          e.dataTransfer.setData("text/plain", b.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => setDragId(null)}
        title={`${b.customer_name} · ${b.service_name} · ${formatTime(b.appointment_time)}${
          movable ? " — drag to another day to reschedule" : ""
        }`}
        className={cx(
          "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] leading-tight transition",
          meta.className,
          movable && "cursor-grab active:cursor-grabbing hover:brightness-95",
          !movable && "opacity-80",
          dragId === b.id && "opacity-40"
        )}
      >
        <span className="shrink-0 font-semibold">{formatTime(b.appointment_time)}</span>
        <span className="truncate">{b.customer_name}</span>
      </a>
    );
  };

  const dayCell = (iso: string) => {
    const d = parseDay(iso);
    const dow = (d.getDay() + 6) % 7 + 1; // ISO 1..7
    const isCurrentMonth = view === "week" || iso.slice(0, 7) === cursor.slice(0, 7);
    const isBlocked = blocked.has(iso);
    const isClosed = closed.has(dow);
    const list = byDay.get(iso) ?? [];

    return (
      <div
        key={iso}
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          setHoverDay(iso);
        }}
        onDragLeave={() => setHoverDay((h) => (h === iso ? null : h))}
        onDrop={(e) => {
          e.preventDefault();
          setHoverDay(null);
          const id = dragId ?? e.dataTransfer.getData("text/plain");
          setDragId(null);
          if (!id) return;
          const b = bookings.find((x) => x.id === id);
          if (!b || b.appointment_date === iso) return;
          move(id, iso, b.appointment_time);
        }}
        className={cx(
          "flex min-h-24 flex-col gap-1 border border-ink-100 bg-white p-1.5 transition sm:min-h-28",
          !isCurrentMonth && "bg-ink-50/50 text-ink-300",
          isBlocked && "bg-rose-50/60",
          hoverDay === iso && "ring-2 ring-brand-400 bg-brand-50/50"
        )}
      >
        <div className="flex items-center justify-between px-0.5">
          <span
            className={cx(
              "text-[11px] font-semibold",
              iso === today ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white" : isCurrentMonth ? "text-ink-700" : "text-ink-300"
            )}
          >
            {d.getDate()}
          </span>
          {isBlocked && (
            <span title="Studio blocked">
              <CalendarOff size={11} className="text-rose-400" />
            </span>
          )}
          {!isBlocked && isClosed && (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-300">closed</span>
          )}
        </div>
        <div className="flex flex-col gap-1">{list.map(chip)}</div>
      </div>
    );
  };

  return (
    <div>
      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(view === "week" ? addDays(cursor, -7) : addMonths(cursor, -1))}
            className="rounded-lg border border-ink-100 bg-white p-2 text-ink-600 hover:border-brand-200 hover:text-brand-700"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="min-w-44 text-center text-sm font-semibold text-ink-900">
            {new Date(`${cursor}T12:00:00`).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
              ...(view === "week" ? { day: "numeric" } : {}),
            })}
          </p>
          <button
            type="button"
            onClick={() => setCursor(view === "week" ? addDays(cursor, 7) : addMonths(cursor, 1))}
            className="rounded-lg border border-ink-100 bg-white p-2 text-ink-600 hover:border-brand-200 hover:text-brand-700"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(anchor)}
            className="ml-1 rounded-lg border border-ink-100 bg-white px-2.5 py-2 text-xs font-medium text-ink-600 hover:border-brand-200 hover:text-brand-700"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          {pending && <Loader2 size={15} className="animate-spin text-brand-600" />}
          <div className="flex rounded-lg border border-ink-100 bg-white p-0.5">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cx(
                  "rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition",
                  view === v ? "bg-brand-600 text-white" : "text-ink-600 hover:text-brand-700"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={cx(
            "mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm",
            toast.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-700"
          )}
        >
          {toast.kind === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto text-xs font-medium underline opacity-70"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* weekday header */}
      <div className={cx("grid gap-0", view === "week" ? "grid-cols-7" : "grid-cols-7")}>
        {WEEKDAYS.map((w) => (
          <div key={w.n} className="border border-ink-100 bg-ink-50/70 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            {w.label}
          </div>
        ))}
      </div>

      <div className={cx("grid", view === "week" ? "grid-cols-7" : "grid-cols-7")}>
        {cells.map(dayCell)}
      </div>

      <p className="mt-3 text-xs text-ink-400">
        {canManage
          ? "Drag a chip to another day to reschedule — the slot is re-checked server-side, so clashes are impossible. Tap a chip for full booking controls."
          : "Read-only view for your role. Ask the owner for manager access to move appointments."}
      </p>
    </div>
  );
}
