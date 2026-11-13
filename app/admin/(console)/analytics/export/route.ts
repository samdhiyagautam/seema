import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getFinanceMonthly } from "@/lib/finance";
import { csvResponse } from "@/lib/utils";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * CSV exports (Phase 2). Auth is enforced here because route handlers don't
 * run through the admin layout guard.
 *   /admin/analytics/export?type=finance
 *   /admin/analytics/export?type=analytics
 *   /admin/analytics/export?type=customers
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required.", { status: 401 });
  const role = await getCurrentRole(user.id);

  const type = request.nextUrl.searchParams.get("type") ?? "finance";

  if (type === "finance") {
    if (!can(role, "finance.view")) return new Response("Not allowed.", { status: 403 });
    const { rows } = await getFinanceMonthly();
    return csvResponse(
      `finance-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        ["Month", "Completed bookings", "Recognized revenue", "Advance collections", "Outstanding", "Refunds", "Expenses", "Estimated profit", "Avg booking value", "Completion rate %"],
        ...rows.map((r) => [
          r.month,
          r.completed_bookings,
          r.recognized_revenue,
          r.advance_collections,
          r.outstanding,
          r.refunds,
          r.expenses,
          r.estimated_profit,
          r.avg_booking_value,
          r.completion_rate_pct,
        ]),
      ]
    );
  }

  if (type === "customers") {
    if (!can(role, "customers.view") || !can(role, "finance.view")) {
      return new Response("Not allowed.", { status: 403 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_stats")
      .select("*")
      .order("lifetime_value", { ascending: false });
    if (error) return new Response("Export failed.", { status: 500 });
    type Row = {
      full_name: string;
      phone: string;
      total_bookings: number;
      visits: number;
      lifetime_value: number;
      outstanding: number;
      last_completed_on: string | null;
    };
    const rows = (data ?? []) as unknown as Row[];
    return csvResponse(
      `customers-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        ["Name", "Phone", "Total bookings", "Completed visits", "Lifetime value", "Outstanding", "Last completed visit"],
        ...rows.map((r) => [
          r.full_name,
          r.phone,
          r.total_bookings,
          r.visits,
          r.lifetime_value,
          r.outstanding,
          r.last_completed_on ?? "",
        ]),
      ]
    );
  }

  // default: event funnel, last 30 days
  if (!can(role, "analytics.view")) return new Response("Not allowed.", { status: 403 });
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("name,path,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20000);
  if (error) return new Response("Export failed.", { status: 500 });
  type Row = { name: string; path: string | null; created_at: string };
  const rows = (data ?? []) as unknown as Row[];
  return csvResponse(
    `analytics-${new Date().toISOString().slice(0, 10)}.csv`,
    [["Event", "Path", "When (UTC)"], ...rows.map((r) => [r.name, r.path ?? "", r.created_at])]
  );
}
