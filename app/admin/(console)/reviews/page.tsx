import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import ReviewCard from "@/components/admin/ReviewCard";
import type { Review } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const allowed = can(role, "reviews.moderate");

  const supabase = await createClient();
  const [{ data: pendingRaw }, { data: approvedRaw }] = await Promise.all([
    supabase.from("reviews").select("*").eq("is_approved", false).order("created_at", { ascending: false }),
    supabase.from("reviews").select("*").eq("is_approved", true).order("created_at", { ascending: false }),
  ]);

  const pending = (pendingRaw ?? []) as unknown as Review[];
  const approved = (approvedRaw ?? []) as unknown as Review[];

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Nothing goes public until you approve it. Verified = matched to a real booking."
      />
      {!allowed ? (
        <div className="card p-8 text-sm text-ink-500">You don&apos;t have moderation permissions.</div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 font-semibold text-ink-900">
              Pending ({pending.length})
            </h2>
            <div className="space-y-4">
              {pending.length === 0 ? (
                <EmptyState title="Queue is clear" hint="New submissions appear here for approval." />
              ) : (
                pending.map((r) => <ReviewCard key={r.id} review={r} mode="pending" />)
              )}
            </div>
          </section>
          <section>
            <h2 className="mb-3 font-semibold text-ink-900">Published ({approved.length})</h2>
            <div className="space-y-4">
              {approved.length === 0 ? (
                <EmptyState title="Nothing published yet" hint="Approve reviews to show them on the website." />
              ) : (
                approved.map((r) => <ReviewCard key={r.id} review={r} mode="approved" />)
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
