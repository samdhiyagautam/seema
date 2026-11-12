import { getBlockedDates, getSiteContent } from "@/lib/data";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui";
import AvailabilityManager from "@/components/admin/AvailabilityManager";
import { WEEKDAYS } from "@/lib/utils";
import { parseClosedWeekdays } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminAvailabilityPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;
  const allowed = can(role, "content.manage");

  const [content, blocked] = await Promise.all([getSiteContent(), getBlockedDates()]);
  const closed = parseClosedWeekdays(content.closed_weekdays);
  const closedLabel = closed.length
    ? closed.map((n) => WEEKDAYS.find((d) => d.n === n)?.label ?? "").filter(Boolean).join(", ")
    : "Open all week";

  return (
    <div>
      <PageHeader
        title="Availability"
        description="Working hours, weekly closures and blocked dates feed the booking engine."
      />
      {allowed ? (
        <AvailabilityManager items={blocked} closedWeekdays={closedLabel} />
      ) : (
        <div className="card p-8 text-sm text-ink-500">You don&apos;t have content permissions.</div>
      )}
    </div>
  );
}
