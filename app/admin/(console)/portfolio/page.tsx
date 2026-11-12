import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import PortfolioManager from "@/components/admin/PortfolioManager";
import type { PortfolioItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPortfolioPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const allowed = can(role, "portfolio.manage");

  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_items")
    .select("*")
    .order("display_order")
    .order("created_at", { ascending: false });
  const items = (data ?? []) as unknown as PortfolioItem[];

  return (
    <div>
      <PageHeader title="Portfolio" description="Social proof that sells — keep it fresh." />
      {allowed ? (
        <PortfolioManager items={items} />
      ) : (
        <div className="card p-8 text-sm text-ink-500">You don&apos;t have portfolio permissions.</div>
      )}
    </div>
  );
}
