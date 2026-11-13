import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getFinanceMonthly } from "@/lib/finance";
import ExpenseForm from "@/components/admin/ExpenseForm";
import { PageHeader, StatCard, EmptyState, tableWrap, table, th, thead, td } from "@/components/admin/ui";
import { formatINR, monthLabel } from "@/lib/utils";
import type { Expense, FinanceMonth } from "@/lib/types";

export const dynamic = "force-dynamic";

const cx = (...p: Array<string | false | null | undefined>) => p.filter(Boolean).join(" ");

function profitClass(v: number) {
  return v < 0 ? "text-rose-600" : "text-ink-900";
}

export default async function AdminFinancePage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;

  if (!can(role, "finance.view")) {
    return (
      <div>
        <PageHeader title="Finance" />
        <div className="card p-8 text-sm text-ink-500">
          Finance is visible to the owner and managers only.
        </div>
      </div>
    );
  }

  const canManageExpenses = can(role, "finance.manage");
  const [{ rows, ok }, supabase] = await Promise.all([getFinanceMonthly(), createClient()]);

  const currentMonth = rows[0]?.month;
  const current = rows.find((r) => r.month === currentMonth) as FinanceMonth | undefined;
  const previous = rows[1] as FinanceMonth | undefined;

  const { data: recentRaw } = await supabase
    .from("expenses")
    .select("*")
    .order("spent_on", { ascending: false })
    .limit(30);
  const recent = (recentRaw ?? []) as unknown as Expense[];

  const delta = (a: number, b: number) => {
    if (!b) return "—";
    const pct = Math.round(((a - b) / b) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}% vs last month`;
  };

  return (
    <div>
      <PageHeader
        title="Finance"
        description={
          ok
            ? "Revenue, advances, expenses and profit — the same math the SQL view uses, so every number is checkable."
            : "Showing the current period. Run 0002_phase2.sql to enable the verified 12-month view."
        }
        actions={
          <a href="/admin/analytics/export?type=finance" className="btn btn-outline btn-sm">
            <Download size={14} /> Export CSV
          </a>
        }
      />

      {current ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Recognized revenue"
            value={formatINR(current.recognized_revenue)}
            sub={`${current.completed_bookings} completed · ${delta(current.recognized_revenue, previous?.recognized_revenue ?? 0)}`}
          />
          <StatCard
            label="Advance collections"
            value={formatINR(current.advance_collections)}
            sub="Held on pending + confirmed bookings"
          />
          <StatCard
            label="Outstanding"
            value={formatINR(current.outstanding)}
            sub="Balance still to collect"
          />
          <StatCard
            label="Refunds"
            value={formatINR(current.refunds)}
            sub="Cancelled / refunded bookings"
          />
          <StatCard
            label="Expenses"
            value={formatINR(current.expenses)}
            sub={delta(current.expenses, previous?.expenses ?? 0)}
          />
          <StatCard
            label="Estimated profit"
            value={<span className={profitClass(current.estimated_profit)}>{formatINR(current.estimated_profit)}</span>}
            sub="Revenue − expenses"
          />
          <StatCard
            label="Avg booking value"
            value={formatINR(current.avg_booking_value)}
            sub="Completed bookings"
          />
          <StatCard
            label="Completion rate"
            value={`${current.completion_rate_pct}%`}
            sub="Closed vs all bookings this month"
          />
        </div>
      ) : (
        <EmptyState title="No finance data yet" hint="Numbers appear as bookings and expenses come in." />
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-ink-900">Month by month (last 12)</h2>
        <div className={tableWrap}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Month</th>
                <th className={th}>Completed</th>
                <th className={th}>Recognized</th>
                <th className={th}>Advances</th>
                <th className={th}>Outstanding</th>
                <th className={th}>Refunds</th>
                <th className={th}>Expenses</th>
                <th className={th}>Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.month} className={cx(r.month === currentMonth && "bg-brand-50/50")}>
                  <td className={cx(td, "font-medium text-ink-900")}>{monthLabel(r.month)}</td>
                  <td className={td}>{r.completed_bookings}</td>
                  <td className={td}>{formatINR(r.recognized_revenue)}</td>
                  <td className={td}>{formatINR(r.advance_collections)}</td>
                  <td className={td}>{formatINR(r.outstanding)}</td>
                  <td className={td}>{r.refunds ? formatINR(r.refunds) : "—"}</td>
                  <td className={td}>{formatINR(r.expenses)}</td>
                  <td className={cx(td, "font-semibold", profitClass(r.estimated_profit))}>
                    {formatINR(r.estimated_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-400">
          Verify against SQL: <code className="rounded bg-ink-100 px-1">select * from finance_monthly;</code> —
          the admin cards read the same numbers.
        </p>
      </section>

      {canManageExpenses && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold text-ink-900">Expenses</h2>
          <ExpenseForm recent={recent} />
        </section>
      )}
    </div>
  );
}
