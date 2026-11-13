import { Download } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getMonthComparison } from "@/lib/finance";
import { PageHeader, StatCard, EmptyState, tableWrap, table, th, thead, td } from "@/components/admin/ui";
import { cx, formatINR, monthLabel, monthKey, shiftMonth, todayISO, SOURCE_LABELS } from "@/lib/utils";
import type { AnalyticsEventName, FinanceMonth, SourceChannel } from "@/lib/types";

export const dynamic = "force-dynamic";

type EventRow = { name: string; path: string | null; meta: Record<string, unknown>; created_at: string };

const FUNNEL: Array<{ name: AnalyticsEventName; label: string }> = [
  { name: "service_viewed", label: "Service views" },
  { name: "booking_started", label: "Booking starts" },
  { name: "booking_submitted", label: "Booking submits" },
  { name: "enquiry_submitted", label: "Enquiries" },
  { name: "whatsapp_cta_clicked", label: "WhatsApp clicks" },
];

function pct(a: number, b: number) {
  return b > 0 ? `${Math.round((a / b) * 100)}%` : "—";
}

function delta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "New this month" : "—";
  const d = Math.round(((current - previous) / previous) * 100);
  return (
    <span className={cx(d >= 0 ? "text-emerald-600" : "text-rose-600")}>
      {d >= 0 ? "+" : ""}
      {d}%
    </span>
  );
}

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;

  if (!can(role, "analytics.view")) {
    return (
      <div>
        <PageHeader title="Analytics" />
        <div className="card p-8 text-sm text-ink-500">
          Analytics is available to managers and owners only.
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();

  const [eventsRes, comparison, sourcesRes] = await Promise.all([
    supabase
      .from("events")
      .select("name,path,meta,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    getMonthComparison(),
    supabase
      .from("bookings")
      .select("channel,status")
      .gte("appointment_date", `${shiftMonth(monthKey(todayISO()), -3)}-01`),
  ]);

  const rows = (eventsRes.data ?? []) as unknown as EventRow[];

  const counts = new Map<string, number>();
  const waLabels = new Map<string, number>();
  const paths = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.name, (counts.get(r.name) ?? 0) + 1);
    if (r.name === "whatsapp_cta_clicked") {
      const label = typeof r.meta?.label === "string" ? r.meta.label : "other";
      waLabels.set(label, (waLabels.get(label) ?? 0) + 1);
    }
    if (r.name === "service_viewed" && r.path) {
      paths.set(r.path, (paths.get(r.path) ?? 0) + 1);
    }
  }
  const n = (name: string) => counts.get(name) ?? 0;

  const topPaths = [...paths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const { current, previous, rows: financeRows } = comparison;

  /* channel mix, last 3 months of bookings */
  const channelMix = new Map<SourceChannel, number>();
  for (const b of (sourcesRes.data ?? []) as Array<{ channel: SourceChannel }>) {
    channelMix.set(b.channel, (channelMix.get(b.channel) ?? 0) + 1);
  }
  const topChannels = [...channelMix.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Business numbers and the website funnel. No personal data is collected (Module K)."
        actions={
          <>
            <a href="/admin/analytics/export?type=analytics" className="btn btn-outline btn-sm">
              <Download size={14} /> Funnel CSV
            </a>
            <a href="/admin/analytics/export?type=finance" className="btn btn-outline btn-sm">
              <Download size={14} /> Finance CSV
            </a>
          </>
        }
      />

      {/* ------------------------------------------------ business section */}
      <h2 className="mb-3 font-semibold text-ink-900">This month vs last month</h2>
      {current && previous ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Completed bookings"
            value={current.completed_bookings}
            sub={delta(current.completed_bookings, previous.completed_bookings)}
          />
          <StatCard
            label="Recognized revenue"
            value={formatINR(current.recognized_revenue)}
            sub={delta(current.recognized_revenue, previous.recognized_revenue)}
          />
          <StatCard
            label="Avg booking value"
            value={formatINR(current.avg_booking_value)}
            sub={delta(current.avg_booking_value, previous.avg_booking_value)}
          />
          <StatCard
            label="Estimated profit"
            value={formatINR(current.estimated_profit)}
            sub={delta(current.estimated_profit, previous.estimated_profit)}
          />
        </div>
      ) : (
        <EmptyState
          title="Not enough history yet"
          hint="Comparison appears from your second month of bookings."
        />
      )}

      {financeRows.length > 0 && (
        <div className={cx(tableWrap, "mt-4")}>
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Month</th>
                <th className={th}>Completed</th>
                <th className={th}>Revenue</th>
                <th className={th}>Expenses</th>
                <th className={th}>Profit</th>
                <th className={th}>Avg value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {financeRows.slice(0, 6).map((r: FinanceMonth) => (
                <tr key={r.month} className={cx(r.month === current?.month && "bg-brand-50/50")}>
                  <td className={cx(td, "font-medium text-ink-900")}>{monthLabel(r.month)}</td>
                  <td className={td}>{r.completed_bookings}</td>
                  <td className={td}>{formatINR(r.recognized_revenue)}</td>
                  <td className={td}>{formatINR(r.expenses)}</td>
                  <td className={cx(td, "font-semibold", r.estimated_profit < 0 && "text-rose-600")}>
                    {formatINR(r.estimated_profit)}
                  </td>
                  <td className={td}>{formatINR(r.avg_booking_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------------------------------------------ website funnel */}
      <h2 className="mb-3 mt-8 font-semibold text-ink-900">Website funnel (last 30 days)</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {FUNNEL.map((f) => (
          <StatCard key={f.name} label={f.label} value={n(f.name)} sub="Last 30 days" />
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Service view → booking start"
          value={pct(n("booking_started"), n("service_viewed"))}
          sub="Catalogue interest converting"
        />
        <StatCard
          label="Start → submitted booking"
          value={pct(n("booking_submitted"), n("booking_started"))}
          sub="Form drop-off check"
        />
        <StatCard
          label="WhatsApp CTA clicks"
          value={n("whatsapp_cta_clicked")}
          sub="Conversation entry points"
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No events recorded yet"
            hint="Events appear as visitors browse services, start bookings and click WhatsApp."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900">Most viewed services</h2>
            {topPaths.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">No service views yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {topPaths.map(([path, count]) => (
                  <li key={path} className="flex items-center justify-between text-sm">
                    <Link href={path} className="text-ink-700 hover:text-brand-700">
                      {path.replace("/services/", "/")}
                    </Link>
                    <span className="font-medium text-ink-900">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900">Where bookings come from (3 months)</h2>
            {topChannels.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">No bookings yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {topChannels.map(([channel, count]) => (
                  <li key={channel} className="flex items-center justify-between text-sm">
                    <span className="text-ink-700">{SOURCE_LABELS[channel] ?? channel}</span>
                    <span className="font-medium text-ink-900">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900">WhatsApp clicks by placement</h2>
            {waLabels.size === 0 ? (
              <p className="mt-3 text-sm text-ink-500">No WhatsApp clicks yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {[...waLabels.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, count]) => (
                    <li key={label} className="flex items-center justify-between text-sm">
                      <span className="text-ink-700">{label}</span>
                      <span className="font-medium text-ink-900">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <p className="mt-6 rounded-xl bg-ink-100/70 px-4 py-3 text-xs text-ink-500">
        Events tracked: service_viewed, booking_started, booking_submitted, booking_confirmed,
        enquiry_submitted, course_enquiry_submitted, whatsapp_cta_clicked. No names, phones or emails
        are ever stored here.
      </p>
    </div>
  );
}
