import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import ServiceManager from "@/components/admin/ServiceManager";
import type { Service } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const allowed = can(role, "catalog.manage");

  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").order("display_order").order("name");
  const services = (data ?? []) as unknown as Service[];

  return (
    <div>
      <PageHeader
        title="Services"
        description="Everything on the public menu — prices, durations and availability."
      />
      {allowed ? (
        <ServiceManager services={services} />
      ) : (
        <div className="card p-8 text-sm text-ink-500">
          You don&apos;t have catalogue permissions. Ask the owner for content-manager or manager access.
        </div>
      )}
    </div>
  );
}
