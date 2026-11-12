"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateUserRoleAction } from "@/lib/actions/admin/site";
import { ROLE_LABELS } from "@/lib/rbac";
import type { Role } from "@/lib/types";

type ProfileRow = { id: string; full_name: string; email: string | null; role: Role };

const ROLES: Role[] = ["super_admin", "manager", "staff", "content_manager"];

export default function UserRoleManager({
  profiles,
  currentUserId,
  canManage,
}: {
  profiles: ProfileRow[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function change(userId: string, role: Role) {
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, role);
      if (res.ok) setFeedback("Role updated ✓");
      else setError(res.error);
    });
  }

  return (
    <div>
      {feedback && <p className="mb-3 text-xs font-medium text-emerald-700">{feedback}</p>}
      {error && <p className="mb-3 text-xs font-medium text-rose-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] divide-y divide-ink-100">
          <thead className="bg-ink-50/70">
            <tr>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">User</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">Role</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-ink-100 ${pending ? "opacity-60" : ""}`}>
            {profiles.map((p) => {
              const isSelf = p.id === currentUserId;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-ink-900">{p.full_name}</p>
                    <p className="text-xs text-ink-500">{p.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      disabled={!canManage || isSelf || pending}
                      onChange={(e) => change(p.id, e.target.value as Role)}
                      title={isSelf ? "You can't change your own role" : undefined}
                      className="input w-44 py-1.5 text-xs disabled:cursor-not-allowed disabled:bg-ink-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    {isSelf && <p className="mt-0.5 text-[11px] text-ink-400">Your own account</p>}
                    {!canManage && !isSelf && (
                      <p className="mt-0.5 text-[11px] text-ink-400">Only the owner can change roles</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink-500">
        New sign-ups default to <strong>Content Manager</strong> until you promote them. Role
        changes take effect on the user&apos;s next page load.
      </p>
    </div>
  );
}
