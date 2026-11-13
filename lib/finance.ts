import { createClient } from "@/lib/supabase/server";
import type { Booking, FinanceMonth } from "@/lib/types";
import { monthKey, shiftMonth, todayISO } from "@/lib/utils";

/**
 * Finance math lives in SQL (view `finance_monthly`, docs/02 §4) so the owner
 * can verify every admin number with one SELECT. This helper reads that view
 * and falls back to identical JS math if the view is missing (older DB).
 */

type RawMonth = {
  month: string;
  recognized_revenue: number;
  completed_bookings: number;
  advance_collections: number;
  outstanding: number;
  refunds: number;
  expenses: number;
  estimated_profit: number;
  avg_booking_value: number;
  completion_rate_pct: number;
};

function num(v: unknown) {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}

async function computeFallback(): Promise<FinanceMonth[]> {
  const supabase = await createClient();
  const startMonth = shiftMonth(monthKey(todayISO()), -11);
  const since = `${startMonth}-01`;

  const [bookingsRes, expensesRes] = await Promise.all([
    supabase.from("bookings").select("*").gte("appointment_date", since),
    supabase.from("expenses").select("spent_on,amount_inr").gte("spent_on", since),
  ]);

  const bookings = (bookingsRes.data ?? []) as unknown as Booking[];
  const expenses = (expensesRes.data ?? []) as Array<{ spent_on: string; amount_inr: number }>;

  const byMonth = new Map<string, FinanceMonth>();
  for (let i = 11; i >= 0; i--) {
    const m = shiftMonth(monthKey(todayISO()), -i);
    byMonth.set(m, {
      month: m,
      recognized_revenue: 0,
      completed_bookings: 0,
      advance_collections: 0,
      outstanding: 0,
      refunds: 0,
      expenses: 0,
      estimated_profit: 0,
      avg_booking_value: 0,
      completion_rate_pct: 0,
    });
  }

  for (const b of bookings) {
    const row = byMonth.get(monthKey(b.appointment_date));
    if (!row) continue;
    const net = b.total_price - b.discount_amount;
    if (b.status === "completed") {
      row.recognized_revenue += net;
      row.completed_bookings += 1;
    }
    if (b.status === "pending" || b.status === "confirmed") {
      row.advance_collections += b.amount_paid;
    }
    if (b.status === "confirmed" || b.status === "completed") {
      row.outstanding += Math.max(0, net - b.amount_paid);
    }
    if (b.payment_status === "refunded") row.refunds += b.refund_amount;
  }

  for (const e of expenses) {
    const row = byMonth.get(monthKey(e.spent_on));
    if (row) row.expenses += e.amount_inr;
  }

  const out = [...byMonth.values()].reverse();
  for (const row of out) {
    row.estimated_profit = row.recognized_revenue - row.expenses;
    row.avg_booking_value = row.completed_bookings
      ? Math.round(row.recognized_revenue / row.completed_bookings)
      : 0;
  }
  return out;
}

/** Last 12 months, newest first. `ok=false` means the JS fallback was used. */
export async function getFinanceMonthly(): Promise<{ rows: FinanceMonth[]; ok: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("finance_monthly")
      .select("*")
      .order("month", { ascending: false });
    if (error) throw error;
    if (!data) throw new Error("empty");
    const rows = (data as unknown as RawMonth[]).map((r) => ({
      month: r.month,
      recognized_revenue: num(r.recognized_revenue),
      completed_bookings: num(r.completed_bookings),
      advance_collections: num(r.advance_collections),
      outstanding: num(r.outstanding),
      refunds: num(r.refunds),
      expenses: num(r.expenses),
      estimated_profit: num(r.estimated_profit),
      avg_booking_value: num(r.avg_booking_value),
      completion_rate_pct: num(r.completion_rate_pct),
    }));
    return { rows, ok: true };
  } catch {
    return { rows: await computeFallback(), ok: false };
  }
}

/** Convenience: this month + last month side by side. */
export async function getMonthComparison() {
  const { rows } = await getFinanceMonthly();
  const thisMonth = monthKey(todayISO());
  const lastMonth = shiftMonth(thisMonth, -1);
  return {
    current: rows.find((r) => r.month === thisMonth) ?? null,
    previous: rows.find((r) => r.month === lastMonth) ?? null,
    rows,
  };
}
