import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import CourseManager from "@/components/admin/CourseManager";
import { PageHeader } from "@/components/admin/ui";
import type { Batch, Course } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;

  if (!can(role, "courses.manage")) {
    return (
      <div>
        <PageHeader title="Courses" />
        <div className="card p-8 text-sm text-ink-500">
          Course management is available to the owner and managers only.
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [coursesRes, batchesRes, enrollmentRes] = await Promise.all([
    supabase.from("courses").select("*").order("display_order").order("name"),
    supabase.from("batches").select("*").order("start_date"),
    supabase.from("enrollments").select("id,batch_id").not("batch_id", "is", null),
  ]);

  const courses = (coursesRes.data ?? []) as unknown as Course[];
  const batches = (batchesRes.data ?? []) as unknown as Batch[];
  const seats: Record<string, number> = {};
  for (const e of (enrollmentRes.data ?? []) as Array<{ batch_id: string | null }>) {
    if (e.batch_id) seats[e.batch_id] = (seats[e.batch_id] ?? 0) + 1;
  }

  return (
    <div>
      <PageHeader
        title="Courses"
        description="The academy side: what you teach, what it costs, and which batches are running."
      />
      <CourseManager courses={courses} batches={batches} batchSeats={seats} />
    </div>
  );
}
