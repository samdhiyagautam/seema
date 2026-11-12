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
