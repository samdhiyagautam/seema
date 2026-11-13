import { z } from "zod";

/** Shared zod schemas — used client-side for inline validation and re-validated in every server action. */

const INDIA_PHONE = /^(\+?91[-\s]?)?[6-9]\d{9}$/;

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => INDIA_PHONE.test(v), "Enter a valid 10-digit mobile number")
  .transform((v) => v.replace(/^\+?91/, "").slice(-10));

export const bookingInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(80),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(120)
    .optional()
    .or(z.literal("")),
  serviceId: z.string().uuid("Select a service"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Select a time slot"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;

export const enquiryInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("")),
  serviceInterest: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
  source: z
    .enum([
      "website",
      "instagram",
      "whatsapp",
      "facebook",
      "youtube",
      "referral",
      "walk_in",
      "phone",
      "other",
    ])
    .default("website"),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

export const reviewInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: phoneSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(1000),
  bookingCode: z.string().trim().max(20).optional().or(z.literal("")),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const courseEnquiryInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("")),
  courseId: z.string().uuid("Select a course").optional().or(z.literal("")),
  courseName: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CourseEnquiryInput = z.infer<typeof courseEnquiryInputSchema>;

/* ---- admin form schemas (Phase 2) ---- */

export const expenseInputSchema = z.object({
  spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  category: z.string().trim().min(1, "Pick a category").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  amount_inr: z.coerce.number().int("Whole rupees only").min(1, "Amount must be at least ₹1").max(10000000),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const courseInputSchema = z.object({
  name: z.string().trim().min(3, "Course name is too short").max(120),
  category: z.string().trim().min(1, "Pick a category").max(60),
  summary: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  syllabus: z.string().trim().max(2000).optional().or(z.literal("")),
  duration_days: z.coerce.number().int().min(1, "At least 1 day").max(365),
  fee_inr: z.coerce.number().int("Whole rupees only").min(0).max(10000000),
  kit_included: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type CourseInput = z.infer<typeof courseInputSchema>;

export const batchInputSchema = z.object({
  name: z.string().trim().min(2, "Batch name is too short").max(80),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date").optional().or(z.literal("")),
  schedule: z.string().trim().max(120).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1, "At least 1 seat").max(100),
});

export type BatchInput = z.infer<typeof batchInputSchema>;

export const studentInputSchema = z.object({
  name: z.string().trim().min(2, "Please enter the student's name").max(80),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type StudentInput = z.infer<typeof studentInputSchema>;

export const enrollInputSchema = z.object({
  student_id: z.string().uuid(),
  course_id: z.string().uuid("Select a course"),
  batch_id: z.string().uuid().optional().or(z.literal("")),
  fee_inr: z.coerce.number().int("Whole rupees only").min(0).max(10000000),
  discount_amount: z.coerce.number().int().min(0).max(10000000).default(0),
});

export type EnrollInput = z.infer<typeof enrollInputSchema>;

export const feePaymentInputSchema = z.object({
  enrollment_id: z.string().uuid(),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  amount_inr: z.coerce.number().int("Whole rupees only").min(1, "Amount must be at least ₹1").max(10000000),
  method: z.enum(["upi", "cash", "bank", "other"]).default("upi"),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export type FeePaymentInput = z.infer<typeof feePaymentInputSchema>;

/** Map RPC error codes to human messages (used by public server actions). */
export const BOOKING_ERRORS: Record<string, string> = {
  SLOT_TAKEN: "That slot was just taken. Please pick another time.",
  DATE_BLOCKED: "The studio is unavailable on that date. Please choose another day.",
  DAY_CLOSED: "We're closed that day of the week. Please pick another day.",
  DATE_IN_PAST: "That date has passed. Please pick a future date.",
  OUTSIDE_HOURS: "That time is outside studio hours. Please pick another slot.",
  TOO_LATE: "Too close to booking time for today. Please pick another slot or date.",
  SELECTED_SERVICE_UNAVAILABLE: "That service is no longer available. Please reselect.",
  INVALID_NAME: "Please check your name.",
  INVALID_PHONE: "Please enter a valid 10-digit mobile number.",
  INVALID_COMMENT: "Tell us a little more (10+ characters).",
  INVALID_RATING: "Rating must be between 1 and 5.",
  NOT_FOUND: "We couldn't find that booking.",
  INVALID_STATUS: "That booking can't be changed anymore.",
  FORBIDDEN: "You don't have permission for that action.",
  NO_SESSION: "Please sign in again.",
  NO_PROFILE: "Your account has no admin role yet. Ask the owner to assign one.",
};

export function friendlyError(message: string, fallback = "Something went wrong. Please try again.") {
  const code = message.trim().split("\n")[0];
  return BOOKING_ERRORS[code] ?? fallback;
}
