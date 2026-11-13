"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import {
  batchInputSchema,
  courseInputSchema,
  enrollInputSchema,
  feePaymentInputSchema,
  friendlyError,
  studentInputSchema,
} from "@/lib/validations";
import type { BatchStatus, EnrollmentStatus } from "@/lib/types";

export type MutationResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): MutationResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: friendlyError(message) };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function revalidateAcademy() {
  revalidatePath("/admin/students");
  revalidatePath("/admin/courses");
  revalidatePath("/admin");
  revalidatePath("/courses");
  revalidatePath("/courses/[slug]", "page");
}

/* ---------------------------------------------------------------- courses */

export async function createCourseAction(input: {
  name: string;
  category: string;
  summary?: string;
  description?: string;
  syllabus?: string;
  duration_days: number;
  fee_inr: number;
  kit_included?: boolean;
  is_active?: boolean;
}): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const parsed = courseInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the course details." };
    }
    const d = parsed.data;

    const supabase = await createClient();
    // slug: unique-safe with a retry loop on the unique constraint
    let slug = slugify(d.name) || "course";
    for (let i = 0; i < 5; i++) {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          slug,
          name: d.name,
          category: d.category,
          summary: d.summary || null,
          description: d.description || null,
          syllabus: d.syllabus || null,
          duration_days: d.duration_days,
          fee_inr: d.fee_inr,
          kit_included: d.kit_included,
          is_active: d.is_active,
        })
        .select("id")
        .single();
      if (!error) break;
      if (!error.message.includes("duplicate key") && !error.message.includes("unique")) throw error;
      slug = `${slugify(d.name)}-${Math.random().toString(36).slice(2, 6)}`;
      void data;
    }

    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateCourseAction(
  id: string,
  patch: Partial<{
    name: string;
    category: string;
    summary: string | null;
    description: string | null;
    syllabus: string | null;
    duration_days: number;
    fee_inr: number;
    kit_included: boolean;
    is_active: boolean;
    display_order: number;
    image_url: string | null;
  }>
): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("courses").update(patch).eq("id", id);
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------------------------------------------- batches */

export async function createBatchAction(
  courseId: string,
  input: {
    name: string;
    start_date: string;
    end_date?: string;
    schedule?: string;
    capacity: number;
  }
): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const parsed = batchInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the batch details." };
    }
    const d = parsed.data;
    if (d.end_date && d.end_date < d.start_date) {
      return { ok: false, error: "End date can't be before the start date." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("batches").insert({
      course_id: courseId,
      name: d.name,
      start_date: d.start_date,
      end_date: d.end_date || null,
      schedule: d.schedule || null,
      capacity: d.capacity,
    });
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateBatchStatusAction(id: string, status: BatchStatus): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("batches").update({ status }).eq("id", id);
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBatchAction(id: string): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const supabase = await createClient();
    // enrollments keep their record; batch reference is nullable and set to null first
    const { error: detachErr } = await supabase.from("enrollments").update({ batch_id: null }).eq("batch_id", id);
    if (detachErr) throw detachErr;
    const { error } = await supabase.from("batches").delete().eq("id", id);
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* --------------------------------------------------------- course enquiries */

/** Turn an enquiry into a student + enrollment (the "registration" step). */
export async function convertCourseEnquiryAction(
  enquiryId: string,
  input: { course_id: string; batch_id?: string; fee_inr: number; discount_amount?: number }
): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    if (input.discount_amount && input.discount_amount < 0) {
      return { ok: false, error: "Discount can't be negative." };
    }
    if ((input.discount_amount ?? 0) > input.fee_inr) {
      return { ok: false, error: "Discount can't exceed the course fee." };
    }

    const supabase = await createClient();

    // 1) enquiry -> snapshot + status guard
    const { data: enquiry, error: eqErr } = await supabase
      .from("course_enquiries")
      .select("id, full_name, phone, email, status, course_name")
      .eq("id", enquiryId)
      .maybeSingle();
    if (eqErr) throw eqErr;
    if (!enquiry) return { ok: false, error: "Enquiry not found." };
    if (enquiry.status === "converted") {
      return { ok: false, error: "This enquiry is already registered." };
    }

    // 2) student (upsert by phone)
    const { data: student, error: stErr } = await supabase
      .from("students")
      .upsert(
        {
          full_name: enquiry.full_name,
          phone: enquiry.phone,
          email: enquiry.email,
        },
        { onConflict: "phone" }
      )
      .select("id")
      .single();
    if (stErr || !student) throw stErr ?? new Error("Student create failed.");

    // 3) course snapshot
    const { data: course, error: cErr } = await supabase
      .from("courses")
      .select("name")
      .eq("id", input.course_id)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!course) return { ok: false, error: "Course not found." };

    // 4) enrollment (fee ledger header)
    const { data: enrollment, error: enErr } = await supabase
      .from("enrollments")
      .insert({
        student_id: student.id,
        course_id: input.course_id,
        batch_id: input.batch_id || null,
        course_name: course.name,
        fee_inr: input.fee_inr,
        discount_amount: input.discount_amount ?? 0,
      })
      .select("id")
      .single();
    if (enErr || !enrollment) throw enErr ?? new Error("Enrollment failed.");

    // 5) close the enquiry loop
    const { error: upErr } = await supabase
      .from("course_enquiries")
      .update({ status: "converted", converted_enrollment_id: enrollment.id })
      .eq("id", enquiryId);
    if (upErr) throw upErr;

    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateCourseEnquiryAction(
  id: string,
  patch: { status?: string; admin_notes?: string }
): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("course_enquiries").update(patch).eq("id", id);
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* --------------------------------------------------------------- students */

export async function createStudentAction(input: {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const parsed = studentInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the student details." };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("students").insert({
      full_name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
    });
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function enrollStudentAction(input: {
  student_id: string;
  course_id: string;
  batch_id?: string;
  fee_inr: number;
  discount_amount?: number;
}): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const parsed = enrollInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the enrollment details." };
    }
    const d = parsed.data;
    if (d.discount_amount > d.fee_inr) {
      return { ok: false, error: "Discount can't exceed the course fee." };
    }

    const supabase = await createClient();
    const { data: course, error: cErr } = await supabase
      .from("courses")
      .select("name")
      .eq("id", d.course_id)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!course) return { ok: false, error: "Course not found." };

    const { error } = await supabase.from("enrollments").insert({
      student_id: d.student_id,
      course_id: d.course_id,
      batch_id: d.batch_id || null,
      course_name: course.name,
      fee_inr: d.fee_inr,
      discount_amount: d.discount_amount ?? 0,
    });
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateEnrollmentStatusAction(
  id: string,
  status: EnrollmentStatus
): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("enrollments").update({ status }).eq("id", id);
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------ fee ledger */

/** Records one fee installment; the DB trigger re-sums enrollments.amount_paid. */
export async function recordFeePaymentAction(input: {
  enrollment_id: string;
  paid_on: string;
  amount_inr: number;
  method: "upi" | "cash" | "bank" | "other";
  note?: string;
}): Promise<MutationResult> {
  try {
    const ctx = await requireRole("courses.manage");
    const parsed = feePaymentInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the payment details." };
    }
    const d = parsed.data;

    const supabase = await createClient();
    const { data: enrollment, error: eErr } = await supabase
      .from("enrollments")
      .select("fee_inr, discount_amount, amount_paid")
      .eq("id", d.enrollment_id)
      .maybeSingle();
    if (eErr) throw eErr;
    if (!enrollment) return { ok: false, error: "Enrollment not found." };

    const due = enrollment.fee_inr - enrollment.discount_amount - enrollment.amount_paid;
    if (d.amount_inr > due) {
      return { ok: false, error: `That's more than the due balance (${due}).` };
    }

    const { error } = await supabase.from("fee_payments").insert({
      enrollment_id: d.enrollment_id,
      paid_on: d.paid_on,
      amount_inr: d.amount_inr,
      method: d.method,
      note: d.note || null,
      created_by: ctx.userId,
    });
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteFeePaymentAction(id: string): Promise<MutationResult> {
  try {
    await requireRole("courses.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("fee_payments").delete().eq("id", id);
    if (error) throw error;
    revalidateAcademy();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
