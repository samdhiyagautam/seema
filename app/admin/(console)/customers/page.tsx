import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState, tableWrap, table, th, thead, td } from "@/components/admin/ui";
import AddCustomerForm from "@/components/admin/AddCustomerForm";
import {
  SEGMENT_META,
  cx,
  customerSegment,
  formatDate,
  formatINR,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  last_visit_at: string | null;
};

type Segment = "vip" | "lapsed" | "regular" | "new";
const SEGMENTS: Segment[] = ["vip", "regular", "lapsed", "new"];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; seg?: string }>;
}) {
  const { q, seg } = await searchParams;
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const canManage = can(role, "customers.manage");
  const canExport = can(role, "customers.view") && can(role, "finance.view");

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id,full_name,phone,created_at,last_visit_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (q) {
    const term = `%${q.trim()}%`;
    query = query.or(`full_name.ilike.${term},phone.ilike.${term}`);
  }

  const [{ data: custRaw }, { data: bookingsRaw }] = await Promise.all([
    query,
    supabase
      .from("bookings")
      .select("customer_id,total_price,discount_amount")
      .eq("status", "completed")
      .order("appointment_date", { ascending: false }),
  ]);

  const visitsByCustomer = new Map<string, number>();
  const spendByCustomer = new Map<string, number>();
  for (const b of (bookingsRaw ?? []) as unknown as Array<{
    customer_id: string;
    total_price: number;
    discount_amount: number;
  }>) {
    visitsByCustomer.set(b.customer_id, (visitsByCustomer.get(b.customer_id) ?? 0) + 1);
    spendByCustomer.set(
      b.customer_id,
      (spendByCustomer.get(b.customer_id) ?? 0) + b.total_price - b.discount_amount
    );
  }

  const customers = ((custRaw ?? []) as unknown as Row[]).map((c) => ({
    ...c,
    visits: visitsByCustomer.get(c.id) ?? 0,
    spend: spendByCustomer.get(c.id) ?? 0,
    segment: customerSegment({
      visits: visitsByCustomer.get(c.id) ?? 0,
      lifetime_value: spendByCustomer.get(c.id) ?? 0,
      last_completed_on: c.last_visit_at?.slice(0, 10) ?? null,
    }) as Segment,
  }));

  const counts: Record<Segment, number> = { vip: 0, regular: 0, lapsed: 0, new: 0 };
  for (const c of customers) counts[c.segment] += 1;

  const activeSeg = SEGMENTS.includes(seg as Segment) ? (seg as Segment) : null;
  const visible = activeSeg ? customers.filter((c) => c.segment === activeSeg) : customers;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="One profile per phone number — auto-created from bookings, searchable here."
        actions={
          <>
            {canExport && (
              <a href="/admin/analytics/export?type=customers" className="btn btn-outline btn-sm">
                <Download size={14} /> Export CSV
              </a>
            )}
            {canManage ? <AddCustomerForm /> : undefined}
          </>
        }
      />

      {/* segment summary = filter chips */}
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {SEGMENTS.map((s) => {
          const meta = SEGMENT_META[s];
          const active = activeSeg === s;
          return (
            <Link
              key={s}
              href={active ? "/admin/customers" : `/admin/customers?seg=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cx(
                "card flex items-center justify-between p-4 transition hover:border-brand-200",
                active && "border-brand-300 bg-brand-50/50"
              )}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{meta.label}</p>
                <p className="mt-1 font-display text-xl font-semibold text-ink-900">{counts[s]}</p>
              </div>
              <span className={`badge ${meta.className}`}>{active ? "Filtering" : "Filter"}</span>
            </Link>
          );
        })}
      </div>

      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4" action="/admin/customers">
        {activeSeg && <input type="hidden" name="seg" value={activeSeg} />}
        <div className="min-w-56 flex-1">
          <label className="admin-label" htmlFor="c-q">Search by name or phone</label>
          <input id="c-q" name="q" defaultValue={q ?? ""} className="input py-2" placeholder="e.g. Priya / 98765…" />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
        {(q || activeSeg) && (
          <Link href="/admin/customers" className="btn btn-ghost btn-sm">Clear</Link>
        )}
      </form>

      {visible.length === 0 ? (
        <EmptyState
          title="No customers here"
          hint={q || activeSeg ? "Try clearing the search or segment filter." : "Customers are created automatically with their first booking."}
        />
      ) : (
        <div className={tableWrap}>
          <table className={table + " min-w-[720px]"}>
            <thead className={thead}>
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>Segment</th>
                <th className={th}>Visits</th>
                <th className={th}>Lifetime spend</th>
                <th className={th}>Last visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {visible.map((c) => (
                <tr key={c.id} className="transition hover:bg-brand-50/40">
                  <td className={td}>
                    <Link href={`/admin/customers/${c.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                      {c.full_name}
                    </Link>
                    <p className="text-xs text-ink-500">{c.phone}</p>
                  </td>
                  <td className={td}>
                    <span className={`badge ${SEGMENT_META[c.segment].className}`}>
                      {SEGMENT_META[c.segment].label}
                    </span>
                  </td>
                  <td className={td}>{c.visits}</td>
                  <td className={td}>{c.spend > 0 ? formatINR(c.spend) : "—"}</td>
                  <td className={td}>{c.last_visit_at ? formatDate(c.last_visit_at.slice(0, 10)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-ink-400">
        Segments: <b>VIP</b> ≥ ₹25,000 lifetime or 3+ visits · <b>Lapsed</b> no completed visit in 90+ days ·
        <b> Regular</b> visited and still warm · <b>New</b> not completed a visit yet.
      </p>
    </div>
  );
}
