"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import { friendlyError } from "@/lib/validations";
import type { BookingStatus } from "@/lib/types";

export type MutationResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): MutationResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: friendlyError(message) };
}

/** Module K — booking_confirmed is logged server-side with actor info. */
async function logEvent(meta: Record<string, unknown>) {
  try {
    const supabase = await createClient();
    await supabase.from("events").insert({
      name: "booking_confirmed",
      path: "/admin/bookings",
      meta,
    });
  } catch {
    /* noop */
  }
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/customers");
}

export async function setBookingStatusAction(
  id: string,
  status: BookingStatus,
  reason?: string
): Promise<MutationResult> {
  try {
    const ctx = await requireRole("bookings.manage");
    const supabase = await createClient();

    const patch: Record<string, unknown> = { status };
    if (reason) patch.admin_notes = reason;

    const { error } = await supabase.from("bookings").update(patch).eq("id", id);
    if (error) throw error;

    if (status === "confirmed") {
      await logEvent({ booking_id: id, actor: ctx.email });
    }
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateBookingPaymentAction(
  id: string,
  patch: { amount_paid?: number; discount_amount?: number; refund_amount?: number }
): Promise<MutationResult> {
  try {
    await requireRole("bookings.manage");
    const supabase = await createClient();

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("total_price, discount_amount, amount_paid, refund_amount")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!booking) return { ok: false, error: "Booking not found." };

    const merged = {
      discount_amount: patch.discount_amount ?? booking.discount_amount,
      amount_paid: patch.amount_paid ?? booking.amount_paid,
      refund_amount: patch.refund_amount ?? booking.refund_amount,
    };

    for (const v of [merged.discount_amount, merged.amount_paid, merged.refund_amount]) {
      if (!Number.isFinite(v) || v < 0) return { ok: false, error: "Amounts must be 0 or more." };
    }

    const net = booking.total_price - merged.discount_amount;
    let payment_status: string;
    if (merged.refund_amount > 0) payment_status = "refunded";
    else if (merged.amount_paid >= net && net > 0) payment_status = "paid";
    else if (merged.amount_paid > 0) payment_status = "advance_paid";
    else payment_status = "unpaid";

    const { error } = await supabase
      .from("bookings")
      .update({ ...merged, payment_status })
      .eq("id", id);
    if (error) throw error;

    revalidateAdmin();
    revalidatePath("/admin/finance"); // future-proof, harmless today
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateBookingNotesAction(id: string, notes: string): Promise<MutationResult> {
  try {
    await requireRole("bookings.manage");
    const supabase = await createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ admin_notes: notes.slice(0, 2000) })
      .eq("id", id);
    if (error) throw error;
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function assignStaffAction(id: string, staffId: string | null): Promise<MutationResult> {
  try {
    await requireRole("bookings.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("bookings").update({ assigned_staff_id: staffId }).eq("id", id);
    if (error) throw error;
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function rescheduleBookingAction(
  id: string,
  date: string,
  time: string
): Promise<MutationResult> {
  try {
    await requireRole("bookings.manage");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return { ok: false, error: "Pick a valid date and time." };
    }
    const supabase = await createClient();
    const { error } = await supabase.rpc("reschedule_booking", {
      p_booking_id: id,
      p_date: date,
      p_time: `${time}:00`,
    });
    if (error) throw error;
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBookingAction(id: string): Promise<MutationResult> {
  try {
    await requireRole("bookings.manage");
    const ctx = await requireRole("users.manage"); // super_admin only
    void ctx;
    const supabase = await createClient();
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) throw error;
    revalidateAdmin();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
