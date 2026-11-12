import { createClient } from "@/lib/supabase/server";
import { can, type Capability } from "@/lib/rbac";
import type { Role } from "@/lib/types";

/**
 * Server-side auth guard for admin server actions and pages.
 * Defense in depth: middleware → layout → requireRole() → RLS.
 */

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentRole(userId: string): Promise<Role | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (data?.role as Role) ?? null;
}

export type AdminContext = {
  userId: string;
  email: string;
  role: Role;
};

/** Throws "FORBIDDEN" (or "NO_SESSION") — actions convert these to user-safe errors. */
export async function requireRole(...allowed: Capability[]): Promise<AdminContext> {
  const user = await getCurrentUser();
  if (!user || !user.email) throw new Error("NO_SESSION");

  const role = await getCurrentRole(user.id);
  if (!role) throw new Error("NO_PROFILE");

  // super_admin can do everything; otherwise check each capability
  if (role !== "super_admin" && !allowed.some((c) => can(role, c))) {
    throw new Error("FORBIDDEN");
  }

  return { userId: user.id, email: user.email, role };
}

export function isRecordOwnerError(message: string) {
  return ["NO_SESSION", "NO_PROFILE", "FORBIDDEN"].includes(message);
}
