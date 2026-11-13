import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getCurrentRole } from "@/lib/guard";
import { can } from "@/lib/rbac";
import StudentsBoard from "@/components/admin/StudentsBoard";
import { PageHeader } from "@/components/admin/ui";
import type {
  Batch,
  Course,
  CourseEnquiry,
  Enrollment,
  FeePayment,
  Student,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const user = await getCurrentUser();
  const role = user ? await getCurrentRole(user.id) : null;

  if (!can(role, "courses.manage")) {
    return (
      <div>
        <PageHeader title="Students & fees" />
        <div className="card p-8 text-sm text-ink-500">
          The academy ledger is available to the owner and managers only.
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [enquiriesRes, enrollmentsRes, paymentsRes, coursesRes, batchesRes] = await Promise.all([
    supabase.from("course_enquiries").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
    supabase.from("fee_payments").select("*").order("paid_on", { ascending: false }),
    supabase.from("courses").select("*").order("display_order").order("name"),
    supabase.from("batches").select("*").order("start_date"),
  ]);

  const enrollments = (enrollmentsRes.data ?? []) as unknown as Enrollment[];

  // All students (manually added ones + those with enrollments), newest first.
  const { data: studentsData } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });
  const students = (studentsData ?? []) as unknown as Student[];

  const batchSeats: Record<string, number> = {};
  for (const e of enrollments) {
    if (e.batch_id) batchSeats[e.batch_id] = (batchSeats[e.batch_id] ?? 0) + 1;
  }

  return (
    <div>
      <PageHeader
        title="Students & fees"
        description={`Enquiry → registration → batch → fee ledger. ${students.length} student(s), ${enrollments.length} enrollment(s).`}
      />
      <StudentsBoard
        enquiries={(enquiriesRes.data ?? []) as unknown as CourseEnquiry[]}
        students={students}
        enrollments={enrollments}
        payments={(paymentsRes.data ?? []) as unknown as FeePayment[]}
        courses={(coursesRes.data ?? []) as unknown as Course[]}
        batches={(batchesRes.data ?? []) as unknown as Batch[]}
        batchSeats={batchSeats}
      />
    </div>
  );
}
