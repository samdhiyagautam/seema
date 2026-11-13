import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { getSiteContent } from "@/lib/data";
import CopyDigestButton from "@/components/admin/CopyDigestButton";
import { PageHeader, EmptyState, StatCard } from "@/components/admin/ui";
import { BOOKING_STATUS_META, LEAD_STATUS_META, formatDate, formatINR, formatTime, waLink, balance, netTotal } from "@/lib/utils";
import type { SiteContent } from "@/lib/site";
import type { Booking as BookingRow, Lead as LeadRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/* ---------------------------------------------------------------- helpers */

function reminderMessage(b: BookingRow, content: SiteContent) {
  const when = new Date(`${b.appointment_date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const name = b.customer?.full_name?.split(" ")[0] ?? "there";
  return (
    `Hi ${name}! Reminder for your ${b.service_name} appointment at ${content.studio_name} ` +
    `— ${when} at ${formatTime(b.appointment_time)}. ` +
    `Address: ${content.address_line}, ${content.city}. ` +
    `Reply YES to confirm, or call if you need to change anything. ` +
    `See you soon! — ${content.studio_name.split(" ")[0]}`
  );
}

function confirmMessage(b: BookingRow, content: SiteContent) {
  const when = new Date(`${b.appointment_date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const name = b.customer?.full_name?.split(" ")[0] ?? "there";
  return (
    `Hi ${name}! We received your ${b.service_name} booking (${b.code}) for ${when} at ` +
    `${formatTime(b.appointment_time)}. Please confirm so we can lock the slot. ` +
    `${content.advance_note} — ${content.studio_name}`
  );
}

function followUpMessage(l: LeadRow, content: SiteContent) {
  const name = l.full_name.split(" ")[0];
  const service = l.service_interest ? ` about ${l.service_interest}` : "";
  return (
    `Hi ${name}! Following up${service} at ${content.studio_name}. ` +
    `Would you like to book a slot? I can share availability for this week. ` +
    `— ${content.studio_name.split(" ")[0]}`
  );
}

export default async function AdminRemindersPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;

  if (!can(role, "bookings.view")) {
    return (
      <div>
        <PageHeader title="Reminders" />
        <div className="card p-8 text-sm text-ink-500">Available to staff and managers only.</div>
      </div>
    );
  }

  const supabase = await createClient();
  const content = await getSiteContent();

  const today = new Date();
  const todayISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const tomorrow = new Date(today.getTime() + 86400000);
  const tomorrowISO = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

  const [tomorrowRes, pendingRes, followUpRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, customer:customers(full_name,phone)")
      .eq("appointment_date", tomorrowISO)
      .in("status", ["confirmed", "pending"])
      .order("appointment_time"),
    supabase
      .from("bookings")
      .select("*, customer:customers(full_name,phone)")
      .eq("appointment_date", todayISO)
      .eq("status", "pending")
      .order("appointment_time"),
    supabase
      .from("leads")
      .select("*")
      .in("status", ["contacted", "follow_up"])
      .lte("follow_up_on", todayISO)
      .order("follow_up_on")
      .limit(20),
  ]);

  const tomorrowRows = (tomorrowRes.data ?? []) as unknown as BookingRow[];
  const pendingRows = (pendingRes.data ?? []) as unknown as BookingRow[];
  const followUpRows = (followUpRes.data ?? []) as unknown as LeadRow[];

  const digestLines = [
    `TOMORROW (${formatDate(tomorrowISO)}) — ${tomorrowRows.length} appointment(s)`,
    ...tomorrowRows.map(
      (b) => `• ${formatTime(b.appointment_time)} ${b.customer?.full_name ?? "—"} — ${b.service_name}`
    ),
    "",
    `TODAY TO CONFIRM — ${pendingRows.length} pending booking(s)`,
    ...pendingRows.map((b) => `• ${formatTime(b.appointment_time)} ${b.customer?.full_name ?? "—"} (${b.code})`),
    "",
    `FOLLOW-UPS DUE — ${followUpRows.length} lead(s)`,
    ...followUpRows.map((l) => `• ${l.full_name} (${l.phone}) — ${l.service_interest ?? "general"}`),
  ].join("\n");

  return (
    <div>
      <PageHeader
        title="Reminders"
        description="One-tap WhatsApp nudges — tomorrow's appointments, today's unconfirmed bookings, and follow-ups that are due."
        actions={<CopyDigestButton text={digestLines} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tomorrow" value={tomorrowRows.length} sub="Confirmed + pending appointments" />
        <StatCard label="Unconfirmed today" value={pendingRows.length} sub="Pending bookings arriving today" />
        <StatCard label="Follow-ups due" value={followUpRows.length} sub="Leads you promised to contact" />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-ink-900">
          Tomorrow&apos;s reminders <span className="text-ink-400">· {formatDate(tomorrowISO)}</span>
        </h2>
        {tomorrowRows.length === 0 ? (
          <EmptyState title="No appointments tomorrow" hint="The digest fills up automatically as bookings come in." />
        ) : (
          <div className="card divide-y divide-ink-100">
            {tomorrowRows.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">
                    {formatTime(b.appointment_time)} · {b.customer?.full_name ?? "—"}
                    <span className={`badge ml-2 ${BOOKING_STATUS_META[b.status].className}`}>
                      {BOOKING_STATUS_META[b.status].label}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {b.service_name} · {formatINR(netTotal(b))} · balance {formatINR(balance(b))}
                  </p>
                </div>
                <a
                  href={waLink(b.customer?.phone ?? "", reminderMessage(b, content))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  Send reminder
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-ink-900">Bookings today still to confirm</h2>
        {pendingRows.length === 0 ? (
          <EmptyState title="All confirmed for today" hint="Nothing pending — the diary is solid." />
        ) : (
          <div className="card divide-y divide-ink-100">
            {pendingRows.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">
                    {formatTime(b.appointment_time)} · {b.customer?.full_name ?? "—"}{" "}
                    <span className="text-ink-400">({b.code})</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{b.service_name}</p>
                </div>
                <a
                  href={waLink(b.customer?.phone ?? "", confirmMessage(b, content))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Ask to confirm
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold text-ink-900">Follow-ups due</h2>
        {followUpRows.length === 0 ? (
          <EmptyState title="No follow-ups due" hint="When you mark a lead for follow-up, it appears here on the day." />
        ) : (
          <div className="card divide-y divide-ink-100">
            {followUpRows.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">
                    {l.full_name} <span className="text-ink-400">· {l.phone}</span>
                    <span className={`badge ml-2 ${LEAD_STATUS_META[l.status].className}`}>
                      {LEAD_STATUS_META[l.status].label}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {l.service_interest ?? "General enquiry"} · follow-up set {formatDate(l.follow_up_on ?? todayISO)}
                  </p>
                </div>
                <a
                  href={waLink(l.phone, followUpMessage(l, content))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Follow up
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
