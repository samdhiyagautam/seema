import { redirect } from "next/navigation";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { signOutAction } from "@/lib/actions/auth";
import Sidebar from "@/components/admin/Sidebar";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Admin",
  robots: { index: false, follow: false },
};

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const role = await getCurrentRole(user.id);

  // No redirect here — a signed-in user without a role would bounce forever.
  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-semibold text-ink-900">No admin access yet</h1>
          <p className="mt-2 text-sm text-ink-500">
            Your account <span className="font-medium">{user.email}</span> doesn&apos;t have an admin
            role. Ask the studio owner to assign one (update <code>profiles.role</code>).
          </p>
          <form action={signOutAction} className="mt-6">
            <button type="submit" className="btn btn-outline btn-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink-50/60">
      <Sidebar role={role} email={user.email ?? ""} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}

