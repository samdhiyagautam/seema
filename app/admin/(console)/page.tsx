import Link from "next/link";
import { CalendarDays, Inbox, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader, StatCard, Badge, EmptyState, tableWrap, table, th, thead, td } from "@/components/admin/ui";
import {
  BOOKING_STATUS_META,
  balance,
  formatDate,
  formatINR,
  formatTime,
  netTotal,
} from "@/lib/utils";
import type { Booking, Lead, Review } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const showFinance = can(role, "finance.view");

  const supabase = await createClient();
  const today = new Date();
  const todayISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString();

  const [bookingsRes, leadsRes, reviewsRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, customer:customers(full_name,phone)")
      .gte("appointment_date", monthStart)
      .order("appointment_date")
      .order("appointment_time"),
    supabase.from("leads").select("*").gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(5),
    supabase.from("reviews").select("*").eq("is_approved", false).order("created_at", { ascending: false }).limit(5),
  ]);

  const bookings = (bookingsRes.data ?? []) as unknown as Booking[];
  const leads = (leadsRes.data ?? []) as unknown as Lead[];
  const pendingReviews = (reviewsRes.data ?? []) as unknown as Review[];

  const monthBookings = bookings;
  const todays = monthBookings.filter((b) => b.appointment_date === todayISO);
  const pending = monthBookings.filter((b) => b.status === "pending");
  const completed = monthBookings.filter((b) => b.status === "completed");

  const collected = monthBookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.amount_paid - b.refund_amount, 0);
  const recognized = completed.reduce((sum, b) => sum + netTotal(b) - b.refund_amount, 0);
  const outstanding = monthBookings
    .filter((b) => ["confirmed", "completed"].includes(b.status))
    .reduce((sum, b) => sum + balance(b), 0);
  const avgValue = completed.length ? Math.round(recognized / completed.length) : 0;

  const leadCount = (await supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", weekAgo)).count ?? 0;
  const bookingCountToday = (
    await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("appointment_date", todayISO)
  ).count ?? 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        actions={
          <Link href="/admin/bookings" className="btn btn-outline btn-sm">
            <CalendarDays size={14} /> All bookings
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's appointments"
          value={bookingCountToday}
          sub={todays.length ? `Next: ${formatTime(todays[0].appointment_time)}` : "Nothing booked today"}
          href={`/admin/bookings?date=${todayISO}`}
        />
        <StatCard
          label="Pending confirmation"
          value={pending.length}
          sub="Requests waiting for your WhatsApp confirmation"
          href="/admin/bookings?status=pending"
        />
        <StatCard
          label="New leads (7 days)"
          value={leadCount}
          sub={leads.length ? "Latest below" : "Pipeline is quiet"}
          href="/admin/leads"
        />
        <StatCard
          label="Reviews to moderate"
          value={pendingReviews.length}
          sub="Not shown publicly until approved"
          href="/admin/reviews"
        />
      </div>

      {showFinance && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Collected this month" value={formatINR(collected)} sub="Advances + full payments" />
          <StatCard label="Earned revenue" value={formatINR(recognized)} sub={`From ${completed.length} completed booking(s)`} />
          <StatCard label="Outstanding" value={formatINR(outstanding)} sub="Balance to collect" />
          <StatCard label="Avg booking value" value={formatINR(avgValue)} sub="Completed bookings this month" />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Today / upcoming */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Today&apos;s diary</h2>
            <Link href="/admin/bookings" className="text-xs font-medium text-brand-700 hover:underline">
              View all →
            </Link>
          </div>
          {todays.length === 0 ? (
            <EmptyState title="No appointments today" hint="A good day for content, follow-ups or rest." />
          ) : (
            <div className={tableWrap}>
              <table className={table + " min-w-0"}>
                <thead className={thead}>
                  <tr>
                    <th className={th}>Time</th>
                    <th className={th}>Customer</th>
                    <th className={th}>Service</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {todays.map((b) => (
                    <tr key={b.id}>
                      <td className={td + " whitespace-nowrap font-medium"}>{formatTime(b.appointment_time)}</td>
                      <td className={td}>{b.customer?.full_name ?? "—"}</td>
                      <td className={td}>{b.service_name}</td>
                      <td className={td}>
                        <Badge className={BOOKING_STATUS_META[b.status].className}>
                          {BOOKING_STATUS_META[b.status].label}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Leads */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Latest leads</h2>
            <Link href="/admin/leads" className="text-xs font-medium text-brand-700 hover:underline">
              Open pipeline →
            </Link>
          </div>
          {leads.length === 0 ? (
            <EmptyState title="No new leads this week" hint="Website and WhatsApp enquiries land here." />
          ) : (
            <ul className="card divide-y divide-ink-100">
              {leads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {l.full_name} <span className="text-ink-400">· {l.phone}</span>
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {l.service_interest || "General enquiry"} · {new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <Link
                    href="/admin/leads"
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                  >
                    <Inbox size={13} /> Pipeline
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {!showFinance && (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-ink-100/70 px-4 py-3 text-xs text-ink-500">
          <Wallet size={14} /> Financial cards are hidden for your role. Ask the owner for
          manager access if you need them.
        </p>
      )}
    </div>
  );
}
