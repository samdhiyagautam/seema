import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getSiteContent } from "@/lib/data";
import { parseClosedWeekdays } from "@/lib/site";
import CalendarGrid, { type CalendarBooking } from "@/components/admin/CalendarGrid";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const canManage = can(role, "bookings.manage");

  const supabase = await createClient();
  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonthEnd = new Date(`${monthStart}T00:00:00`);
  nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 2);
  nextMonthEnd.setDate(0);
  const until = nextMonthEnd.toISOString().slice(0, 10);

  const [bookingsRes, blockedRes, content] = await Promise.all([
    supabase
      .from("bookings")
      .select("id,code,appointment_date,appointment_time,duration_minutes,service_name,status,customer:customers(full_name,phone)")
      .gte("appointment_date", monthStart)
      .lte("appointment_date", until)
      .order("appointment_date")
      .order("appointment_time"),
    supabase.from("blocked_dates").select("blocked_on").gte("blocked_on", monthStart),
    getSiteContent(),
  ]);

  const rows = (bookingsRes.data ?? []) as unknown as Array<
    CalendarBooking & { customer: { full_name: string; phone: string } | null }
  >;
  const bookings: CalendarBooking[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    appointment_date: r.appointment_date,
    appointment_time: r.appointment_time.slice(0, 5),
    duration_minutes: r.duration_minutes,
    service_name: r.service_name,
    status: r.status,
    customer_name: r.customer?.full_name ?? "—",
    customer_phone: r.customer?.phone ?? "",
  }));

  const blockedDates = ((blockedRes.data ?? []) as Array<{ blocked_on: string }>).map((b) => b.blocked_on);
  const closedWeekdays = parseClosedWeekdays(content.closed_weekdays);

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="The studio diary at a glance — month for planning, week for the busy days."
        actions={
          <Link href="/admin/bookings" className="btn btn-outline btn-sm">
            List view
          </Link>
        }
      />

      {bookings.length === 0 && blockedDates.length === 0 ? (
        <EmptyState
          title="Nothing on the calendar yet"
          hint="New bookings appear here the moment they come in."
        />
      ) : (
        <CalendarGrid
          bookings={bookings}
          blockedDates={blockedDates}
          closedWeekdays={closedWeekdays}
          anchor={today}
          canManage={canManage}
        />
      )}
    </div>
  );
}
