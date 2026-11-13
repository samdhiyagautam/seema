import type { Role } from "@/lib/types";

/**
 * Capability-based permissions (Module J). Single source of truth for UI
 * filtering AND server-action guards. The database RLS policies mirror this
 * matrix — see docs/02-data-model.md §6 and docs/03-rbac.md.
 */

export const CAPABILITIES = [
  "bookings.view",
  "bookings.manage",
  "customers.view",
  "customers.manage",
  "leads.view",
  "leads.manage",
  "catalog.manage",
  "portfolio.manage",
  "reviews.moderate",
  "content.manage",
  "finance.view",
  "finance.manage",
  "courses.manage",
  "analytics.view",
  "users.manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ALL: Capability[] = [...CAPABILITIES];

export const PERMISSIONS: Record<Role, Capability[]> = {
  super_admin: ALL,
  manager: ALL.filter((c) => c !== "users.manage"),
  staff: ["bookings.view", "customers.view", "leads.view"],
  content_manager: ["catalog.manage", "portfolio.manage", "reviews.moderate", "content.manage"],
};

export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return PERMISSIONS[role].includes(capability);
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  staff: "Staff",
  content_manager: "Content Manager",
};
