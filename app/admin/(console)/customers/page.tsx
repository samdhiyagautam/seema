import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState, tableWrap, table, th, thead, td } from "@/components/admin/ui";
import AddCustomerForm from "@/components/admin/AddCustomerForm";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  last_visit_at: string | null;
};

function segment(visits: number, spend: number) {
  if (visits === 0) return { label: "New", className: "bg-ink-100 text-ink-600" };
  if (spend >= 50000) return { label: "VIP", className: "bg-gold-500/20 text-gold-600" };
  if (visits >= 2) return { label: "Repeat", className: "bg-emerald-50 text-emerald-700" };
  return { label: "New", className: "bg-ink-100 text-ink-600" };
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const canManage = can(role, "customers.manage");

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id,full_name,phone,created_at,last_visit_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (q) {
    const term = `%${q.trim()}%`;
    query = query.or(`full_name.ilike.${term},phone.ilike.${term}`);
  }

  const [{ data: custRaw }, { data: bookingsRaw }] = await Promise.all([
    query,
    supabase
      .from("bookings")
      .select("customer_id,total_price,discount_amount")
      .eq("status", "completed"),
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
  }));

  return (
    <div>
      <PageHeader
        title="Customers"
        description="One profile per phone number — auto-created from bookings, searchable here."
        actions={canManage ? <AddCustomerForm /> : undefined}
      />

      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4" action="/admin/customers">
        <div className="min-w-56 flex-1">
          <label className="admin-label" htmlFor="c-q">Search by name or phone</label>
          <input id="c-q" name="q" defaultValue={q ?? ""} className="input py-2" placeholder="e.g. Priya / 98765…" />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
        {q && <Link href="/admin/customers" className="btn btn-ghost btn-sm">Clear</Link>}
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          hint={q ? "No match for that search." : "Customers are created automatically with their first booking."}
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
              {customers.map((c) => {
                const seg = segment(c.visits, c.spend);
                return (
                  <tr key={c.id} className="transition hover:bg-brand-50/40">
                    <td className={td}>
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                        {c.full_name}
                      </Link>
                      <p className="text-xs text-ink-500">{c.phone}</p>
                    </td>
                    <td className={td}>
                      <span className={`badge ${seg.className}`}>{seg.label}</span>
                    </td>
                    <td className={td}>{c.visits}</td>
                    <td className={td}>{c.spend > 0 ? formatINR(c.spend) : "—"}</td>
                    <td className={td}>{c.last_visit_at ? formatDate(c.last_visit_at.slice(0, 10)) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
