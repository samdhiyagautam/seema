import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState, tableWrap, table, th, thead, td } from "@/components/admin/ui";
import BookingRow from "@/components/admin/BookingRow";
import type { Booking, StaffMember } from "@/lib/types";
import { BOOKING_STATUS_META } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Search = { status?: string; date?: string; q?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { status, date, q } = await searchParams;

  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;

  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("*, customer:customers(full_name,phone)")
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(200);

  if (status && status !== "all") query = query.eq("status", status);
  if (date) query = query.eq("appointment_date", date);
  if (q) {
    const term = `%${q.trim()}%`;
    query = query.or(`code.ilike.${term},service_name.ilike.${term},notes.ilike.${term}`);
  }

  const [{ data: bookingsRaw }, { data: staffRaw }] = await Promise.all([
    query,
    supabase.from("staff_members").select("id,full_name").eq("is_active", true).order("display_order"),
  ]);

  const bookings = (bookingsRaw ?? []) as unknown as Booking[];
  const staff = ((staffRaw ?? []) as unknown as Pick<StaffMember, "id" | "full_name">[]) ?? [];
  const canDelete = can(role, "users.manage");
  const canManage = can(role, "bookings.manage");

  const activeFilter = (status ?? "all") !== "all" || Boolean(date) || Boolean(q);

  return (
    <div>
      <PageHeader
        title="Bookings"
        description="The studio diary. Confirm requests, reschedule safely, record payments."
        actions={
          <Link href="/admin" className="btn btn-ghost btn-sm border border-ink-200">
            Dashboard
          </Link>
        }
      />

      {/* Filters (GET form — shareable URLs) */}
      <form className="card mb-5 flex flex-wrap items-end gap-3 p-4" action="/admin/bookings">
        <div>
          <label className="admin-label" htmlFor="f-status">Status</label>
          <select id="f-status" name="status" defaultValue={status ?? "all"} className="input py-2">
            <option value="all">All</option>
            {Object.entries(BOOKING_STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="admin-label" htmlFor="f-date">Date</label>
          <input id="f-date" type="date" name="date" defaultValue={date ?? ""} className="input py-2" />
        </div>
        <div className="min-w-40 flex-1">
          <label className="admin-label" htmlFor="f-q">Search</label>
          <input
            id="f-q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Booking code, service, note…"
            className="input py-2"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Apply</button>
        {activeFilter && (
          <Link href="/admin/bookings" className="btn btn-ghost btn-sm">Clear</Link>
        )}
      </form>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings match"
          hint={activeFilter ? "Try clearing filters." : "New website bookings will appear here."}
        />
      ) : (
        <div className={tableWrap}>
          <table className={table + " min-w-[860px]"}>
            <thead className={thead}>
              <tr>
                <th className={th}>Booking</th>
                <th className={th}>Customer</th>
                <th className={th}>Service</th>
                <th className={th}>Status</th>
                {can(role, "finance.view") && <th className={th}>Payment</th>}
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {bookings.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  staff={canManage ? staff : []}
                  canDelete={canDelete}
                  canManage={canManage}
                  showMoney={can(role, "finance.view")}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!canManage && (
        <p className="mt-4 text-xs text-ink-500">
          Your role can view the diary but not modify bookings (module J: least privilege).
        </p>
      )}
    </div>
  );
}
