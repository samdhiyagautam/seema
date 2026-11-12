import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import UserRoleManager from "@/components/admin/UserRoleManager";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const canManage = can(role, "users.manage");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,email,role")
    .order("created_at", { ascending: true });

  const profiles = (data ?? []) as unknown as Array<{
    id: string;
    full_name: string;
    email: string | null;
    role: Role;
  }>;

  return (
    <div>
      <PageHeader
        title="Users & roles"
        description="Who can do what in the studio console. Matrix: docs/03-rbac.md."
      />
      <UserRoleManager
        profiles={profiles}
        currentUserId={user?.id ?? ""}
        canManage={canManage}
      />
      <p className="mt-6 rounded-xl bg-ink-100/70 px-4 py-3 text-xs text-ink-500">
        Current console roles: {ROLE_LABELS.super_admin}, {ROLE_LABELS.manager},{" "}
        {ROLE_LABELS.staff}, {ROLE_LABELS.content_manager}. Staff roles see the diary only —
        no money. Content managers see services, portfolio, reviews and site copy only.
      </p>
    </div>
  );
}
