import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader, StatCard, EmptyState } from "@/components/admin/ui";
import type { AnalyticsEventName } from "@/lib/types";

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
  const { data } = await supabase
    .from("events")
    .select("name,path,meta,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = (data ?? []) as unknown as EventRow[];

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

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Privacy-conscious funnel, last 30 days. No personal data is collected (Module K)."
      />

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
                    <span className="text-ink-700">{path.replace("/services/", "/")}</span>
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
        enquiry_submitted, whatsapp_cta_clicked. No names, phones or emails are ever stored here.
      </p>
    </div>
  );
}
