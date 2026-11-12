import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { signOutAction } from "@/lib/actions/auth";
import LoginForm from "@/components/admin/LoginForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-900 to-ink-900 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-display text-xl font-semibold text-white">
            S
          </div>
          <h1 className="mt-4 font-display text-xl font-semibold text-ink-900">Studio Admin</h1>
          <p className="mt-1 text-sm text-ink-500">
            {user
              ? role
                ? "You're already signed in."
                : "Your account has no admin role yet — ask the owner to assign one."
              : "Sign in to manage bookings, customers and content."}
          </p>
        </div>

        {user && role ? (
          <form action={signOutAction} className="mt-6">
            <button type="submit" className="btn btn-outline w-full justify-center">
              Sign out
            </button>
          </form>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
}
