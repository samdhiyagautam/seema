import { getSiteContent } from "@/lib/data";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import ContentForm from "@/components/admin/ContentForm";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const allowed = can(role, "content.manage");

  const content = await getSiteContent();

  return (
    <div>
      <PageHeader
        title="Site content"
        description="Hero copy, about text, contact details, studio hours and socials."
      />
      {allowed ? (
        <ContentForm initial={content} />
      ) : (
        <div className="card p-8 text-sm text-ink-500">You don&apos;t have content permissions.</div>
      )}
    </div>
  );
}
