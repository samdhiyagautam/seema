import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import StaffManager from "@/components/admin/StaffManager";
import type { StaffMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const allowed = can(role, "bookings.manage");

  const supabase = await createClient();
  const { data } = await supabase.from("staff_members").select("*").order("display_order");
  const staff = (data ?? []) as unknown as StaffMember[];

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Team profiles. Performance reports and per-artist scheduling arrive in Phase 3."
      />
      {allowed ? (
        <StaffManager staff={staff} />
      ) : (
        <div className="card p-8 text-sm text-ink-500">Staff management is for managers and owners.</div>
      )}
    </div>
  );
}
