import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState, tableWrap, table, th, thead, td } from "@/components/admin/ui";
import LeadRow from "@/components/admin/LeadRow";
import AddLeadForm from "@/components/admin/AddLeadForm";
import { LEAD_STATUS_META, SOURCE_LABELS } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = { status?: string; source?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { status, source } = await searchParams;
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const canManage = can(role, "leads.manage");

  const supabase = await createClient();
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(300);
  if (status && status !== "all") query = query.eq("status", status);
  if (source) query = query.eq("source", source);

  const { data: leadsRaw } = await query;
  const leads = (leadsRaw ?? []) as unknown as Lead[];

  const tabs: Array<{ key: string; label: string }> = [
    { key: "all", label: "All" },
    ...(Object.entries(LEAD_STATUS_META) as Array<[LeadStatus, { label: string }]>).map(
      ([key, meta]) => ({ key, label: meta.label })
    ),
  ];

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Every enquiry in one pipeline — website, WhatsApp, Instagram, referrals."
        actions={canManage ? <AddLeadForm /> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const active = (status ?? "all") === t.key;
          const params = new URLSearchParams();
          if (t.key !== "all") params.set("status", t.key);
          if (source) params.set("source", source);
          const href = `/admin/leads${params.toString() ? `?${params}` : ""}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:border-brand-300"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
        {source && (
          <Link href={status ? `/admin/leads?status=${status}` : "/admin/leads"} className="text-xs font-medium text-brand-700 hover:underline">
            Clear source: {SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] ?? source} ✕
          </Link>
        )}
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title="No leads here"
          hint="Website enquiries and manually captured DMs/calls will show up in this pipeline."
        />
      ) : (
        <div className={tableWrap}>
          <table className={table + " min-w-[820px]"}>
            <thead className={thead}>
              <tr>
                <th className={th}>Lead</th>
                <th className={th}>Interest</th>
                <th className={th}>Status</th>
                <th className={th}>Follow-up</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {leads.map((l) => (
                <LeadRow key={l.id} lead={l} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
