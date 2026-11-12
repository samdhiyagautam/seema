import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState, tableWrap, table, th, thead, td } from "@/components/admin/ui";
import CustomerNotes from "@/components/admin/CustomerNotes";
import {
  BOOKING_STATUS_META,
  PAYMENT_STATUS_META,
  formatDate,
  formatINR,
  formatTime,
  netTotal,
  waLink,
} from "@/lib/utils";
import type { Booking, Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const canManage = can(role, "customers.manage");
  const showMoney = can(role, "finance.view");

  const supabase = await createClient();
  const [{ data: customer }, { data: bookingsRaw }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("bookings")
      .select("*")
      .eq("customer_id", id)
      .order("appointment_date", { ascending: false }),
  ]);

  if (!customer) notFound();
  const c = customer as unknown as Customer;
  const bookings = (bookingsRaw ?? []) as unknown as Booking[];

  const completed = bookings.filter((b) => b.status === "completed");
  const visits = completed.length;
  const spend = completed.reduce((s, b) => s + netTotal(b), 0);
  const lastVisit = c.last_visit_at;
  const preferred =
    Object.entries(
      bookings.reduce<Record<string, number>>((acc, b) => {
        acc[b.service_name] = (acc[b.service_name] ?? 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div>
      <nav className="mb-4 text-xs text-ink-400">
        <Link href="/admin/customers" className="hover:text-brand-700">Customers</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-600">{c.full_name}</span>
      </nav>

      <PageHeader
        title={c.full_name}
        description={`${c.phone}${c.email ? ` · ${c.email}` : ""}${c.source ? ` · via ${c.source}` : ""}`}
        actions={
          <a
            href={waLink(c.phone, `Hi ${c.full_name}! This is Seema Makeover Studio.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
          >
            WhatsApp
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Visits</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink-900">{visits}</p>
        </div>
        {showMoney && (
          <>
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Lifetime spend</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink-900">{formatINR(spend)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Avg value</p>
              <p className="mt-1 font-display text-xl font-semibold text-ink-900">
                {visits ? formatINR(Math.round(spend / visits)) : "—"}
              </p>
            </div>
          </>
        )}
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Last visit</p>
          <p className="mt-1 text-sm font-medium text-ink-900">
            {lastVisit ? formatDate(lastVisit.slice(0, 10)) : "No completed visit yet"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Preferred service</p>
          <p className="mt-1 text-sm font-medium text-ink-900">{preferred}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <h2 className="mb-3 font-semibold text-ink-900">Booking history</h2>
          {bookings.length === 0 ? (
            <EmptyState title="No bookings yet" hint="This profile will fill up as they book." />
          ) : (
            <div className={tableWrap}>
              <table className={table + " min-w-0 min-w-[560px]"}>
                <thead className={thead}>
                  <tr>
                    <th className={th}>When</th>
                    <th className={th}>Service</th>
                    <th className={th}>Status</th>
                    {showMoney && <th className={th}>Value</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td className={td}>
                        <p className="font-medium">{formatDate(b.appointment_date)}</p>
                        <p className="text-xs text-ink-500">{formatTime(b.appointment_time)} · {b.code}</p>
                      </td>
                      <td className={td}>{b.service_name}</td>
                      <td className={td}>
                        <span className={`badge ${BOOKING_STATUS_META[b.status].className}`}>
                          {BOOKING_STATUS_META[b.status].label}
                        </span>
                        {showMoney && (
                          <span className={`badge ml-1 ${PAYMENT_STATUS_META[b.payment_status].className}`}>
                            {PAYMENT_STATUS_META[b.payment_status].label}
                          </span>
                        )}
                      </td>
                      {showMoney && <td className={td}>{formatINR(netTotal(b))}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <CustomerNotes customerId={c.id} initialNotes={c.notes ?? ""} canEdit={canManage} />
      </div>
    </div>
  );
}
