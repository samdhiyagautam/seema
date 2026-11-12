"use server";

import { createClient } from "@/lib/supabase/server";
import {
  bookingInputSchema,
  enquiryInputSchema,
  reviewInputSchema,
  friendlyError,
} from "@/lib/validations";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function firstIssue(
  result: { success: false; error: { issues: Array<{ message: string }> } } | { success: true }
) {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Please check your inputs.";
}

async function logEvent(name: string, path: string, meta: Record<string, unknown>) {
  try {
    const supabase = await createClient();
    await supabase.from("events").insert({ name, path, meta });
  } catch {
    // analytics never blocks the business flow
  }
}

/** Public booking creation — validates slot atomically via RPC (docs/02 §5). */
export async function createBookingAction(
  input: unknown
): Promise<ActionResult<{ code: string }>> {
  const parsed = bookingInputSchema.safeParse(input);
  const issue = firstIssue(parsed);
  if (issue || !parsed.success) return { ok: false, error: issue ?? "Invalid booking details." };

  const { name, phone, email, serviceId, date, time, notes } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_booking", {
    p_name: name,
    p_phone: phone,
    p_email: email || null,
    p_service_id: serviceId,
    p_date: date,
    p_time: `${time}:00`,
    p_notes: notes || null,
    p_source: "website",
  });

  if (error) return { ok: false, error: friendlyError(error.message) };

  const code = String(data);
  await logEvent("booking_submitted", "/book", { code, service: serviceId });
  return { ok: true, data: { code } };
}

/** Public enquiry (website contact form). */
export async function submitEnquiryAction(input: unknown): Promise<ActionResult> {
  const parsed = enquiryInputSchema.safeParse(input);
  const issue = firstIssue(parsed);
  if (issue || !parsed.success) return { ok: false, error: issue ?? "Invalid enquiry details." };

  const { name, phone, email, serviceInterest, message, source } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("leads").insert({
    full_name: name,
    phone,
    email: email || null,
    service_interest: serviceInterest || null,
    message: message || null,
    source,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };

  await logEvent("enquiry_submitted", "/contact", {});
  return { ok: true };
}

/** Public review — verified when booking code + phone match (RPC). */
export async function submitReviewAction(input: unknown): Promise<ActionResult> {
  const parsed = reviewInputSchema.safeParse(input);
  const issue = firstIssue(parsed);
  if (issue || !parsed.success) return { ok: false, error: issue ?? "Invalid review details." };

  const { name, phone, rating, comment, bookingCode } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.rpc("submit_review", {
    p_name: name,
    p_phone: phone,
    p_rating: rating,
    p_comment: comment,
    p_booking_code: bookingCode || null,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}
