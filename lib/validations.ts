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
