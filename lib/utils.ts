import type { BookingStatus, LeadStatus, PaymentStatus, SourceChannel } from "@/lib/types";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 10);
}

export function formatDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDay(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function waDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${waDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export function netTotal(b: { total_price: number; discount_amount: number }) {
  return b.total_price - b.discount_amount;
}

export function balance(b: { total_price: number; discount_amount: number; amount_paid: number }) {
  return Math.max(0, netTotal(b) - b.amount_paid);
}

export const BOOKING_STATUS_META: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", className: "bg-emerald-100 text-emerald-800" },
  completed: { label: "Completed", className: "bg-sky-100 text-sky-800" },
  cancelled: { label: "Cancelled", className: "bg-ink-100 text-ink-500" },
  no_show: { label: "No-show", className: "bg-rose-100 text-rose-700" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "bg-ink-100 text-ink-600" },
  advance_paid: { label: "Advance", className: "bg-violet-100 text-violet-700" },
  paid: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
  refunded: { label: "Refunded", className: "bg-rose-100 text-rose-700" },
};

export const LEAD_STATUS_META: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: "New", className: "bg-brand-100 text-brand-700" },
  contacted: { label: "Contacted", className: "bg-sky-100 text-sky-800" },
  follow_up: { label: "Follow-up", className: "bg-amber-100 text-amber-800" },
  converted: { label: "Converted", className: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Lost", className: "bg-ink-100 text-ink-500" },
};

export const SOURCE_LABELS: Record<SourceChannel, string> = {
  website: "Website",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  youtube: "YouTube",
  referral: "Referral",
  walk_in: "Walk-in",
  phone: "Phone",
  other: "Other",
};

export const WEEKDAYS = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
  { n: 7, label: "Sun" },
];

export function minutesToTime(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/* ------------------------------------------------------------ Phase 2 ---- */

export const ENROLLMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-brand-100 text-brand-700" },
  completed: { label: "Passed out", className: "bg-emerald-100 text-emerald-800" },
  dropped: { label: "Dropped", className: "bg-ink-100 text-ink-500" },
};

export const BATCH_STATUS_META: Record<string, { label: string; className: string }> = {
  upcoming: { label: "Upcoming", className: "bg-amber-100 text-amber-800" },
  ongoing: { label: "Ongoing", className: "bg-sky-100 text-sky-800" },
  completed: { label: "Completed", className: "bg-ink-100 text-ink-500" },
};

export const FEE_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  cash: "Cash",
  bank: "Bank transfer",
  other: "Other",
};

export const EXPENSE_CATEGORIES = [
  "Products & kit",
  "Rent",
  "Salaries",
  "Marketing",
  "Utilities",
  "Equipment",
  "Travel",
  "Other",
] as const;

/** Net course fee after discount (mirrors bookings' netTotal). */
export function enrollmentBalance(e: { fee_inr: number; discount_amount: number; amount_paid: number }) {
  return Math.max(0, e.fee_inr - e.discount_amount - e.amount_paid);
}

/**
 * CRM segment rules (Phase 2): how the owner thinks about her customers.
 * vip     — ≥ ₹25,000 lifetime spend OR ≥ 3 completed visits
 * lapsed  — visited before, but last completed visit is 90+ days old
 * regular — visited before, still warm
 * new     — no completed visit yet
 */
export const VIP_SPEND_INR = 25000;
export const VIP_VISITS = 3;
export const LAPSED_DAYS = 90;

export function customerSegment(c: {
  visits: number;
  lifetime_value: number;
  last_completed_on: string | null;
}): "vip" | "lapsed" | "regular" | "new" {
  if (c.visits === 0) return "new";
  if (c.lifetime_value >= VIP_SPEND_INR || c.visits >= VIP_VISITS) return "vip";
  if (c.last_completed_on) {
    const last = new Date(`${c.last_completed_on}T00:00:00`).getTime();
    if (Date.now() - last > LAPSED_DAYS * 86400000) return "lapsed";
  }
  return "regular";
}

export const SEGMENT_META: Record<string, { label: string; className: string }> = {
  vip: { label: "VIP", className: "bg-violet-100 text-violet-700" },
  lapsed: { label: "Lapsed", className: "bg-amber-100 text-amber-800" },
  regular: { label: "Regular", className: "bg-sky-100 text-sky-800" },
  new: { label: "New", className: "bg-brand-100 text-brand-700" },
};

/** "YYYY-MM" for a YYYY-MM-DD string. */
export function monthKey(isoDate: string) {
  return isoDate.slice(0, 7);
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Escape a value for CSV export. */
export function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvResponse(filename: string, rows: unknown[][]) {
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  return new Response("\uFEFF" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
