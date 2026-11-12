"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import { friendlyError, phoneSchema } from "@/lib/validations";
import type { LeadStatus, SourceChannel } from "@/lib/types";

export type MutationResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): MutationResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: friendlyError(message) };
}

function revalidateCrm() {
  revalidatePath("/admin/leads");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/customers/[id]", "page");
  revalidatePath("/admin");
}

/* ---------------------------------------------------------------- leads */

export async function updateLeadAction(
  id: string,
  patch: { status?: LeadStatus; follow_up_on?: string | null; admin_notes?: string; lost_reason?: string }
): Promise<MutationResult> {
  try {
    await requireRole("leads.manage");
    const supabase = await createClient();

    if (patch.status === "lost" && !patch.lost_reason) {
      return { ok: false, error: "Add a reason before marking a lead as lost." };
    }

    const clean: Record<string, unknown> = {};
    if (patch.status) clean.status = patch.status;
    if (patch.follow_up_on !== undefined) clean.follow_up_on = patch.follow_up_on || null;
    if (patch.admin_notes !== undefined) clean.admin_notes = patch.admin_notes.slice(0, 2000);
    if (patch.lost_reason !== undefined) clean.lost_reason = patch.lost_reason.slice(0, 500);

    const { error } = await supabase.from("leads").update(clean).eq("id", id);
    if (error) throw error;
    revalidateCrm();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function convertLeadAction(id: string, bookingId: string | null): Promise<MutationResult> {
  try {
    await requireRole("leads.manage");
    const supabase = await createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status: "converted", converted_booking_id: bookingId })
      .eq("id", id);
    if (error) throw error;
    revalidateCrm();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Manual lead capture (Instagram DM, call, walk-in) from the admin panel. */
export async function createLeadAction(input: {
  name: string;
  phone: string;
  source: SourceChannel;
  serviceInterest?: string;
  message?: string;
}): Promise<MutationResult> {
  try {
    await requireRole("leads.manage");
    const phone = phoneSchema.safeParse(input.phone);
    if (!input.name || input.name.trim().length < 2) {
      return { ok: false, error: "Enter the lead's name." };
    }
    if (!phone.success) return { ok: false, error: phone.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.from("leads").insert({
      full_name: input.name.trim().slice(0, 80),
      phone: phone.data,
      source: input.source,
      service_interest: input.serviceInterest?.slice(0, 120) || null,
      message: input.message?.slice(0, 1000) || null,
    });
    if (error) throw error;
    revalidateCrm();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------- customers */

export async function createCustomerAction(input: {
  name: string;
  phone: string;
  email?: string;
  source?: SourceChannel;
}): Promise<MutationResult> {
  try {
    await requireRole("customers.manage");
    const phone = phoneSchema.safeParse(input.phone);
    if (!input.name || input.name.trim().length < 2) {
      return { ok: false, error: "Enter the customer's name." };
    }
    if (!phone.success) return { ok: false, error: phone.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.from("customers").insert({
      full_name: input.name.trim().slice(0, 80),
      phone: phone.data,
      email: input.email?.trim() || null,
      source: input.source ?? "walk_in",
    });
    if (error) throw error;
    revalidateCrm();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateCustomerAction(
  id: string,
  patch: { full_name?: string; email?: string; notes?: string }
): Promise<MutationResult> {
  try {
    await requireRole("customers.manage");
    const clean: Record<string, unknown> = {};
    if (patch.full_name !== undefined) clean.full_name = patch.full_name.trim().slice(0, 80);
    if (patch.email !== undefined) clean.email = patch.email.trim() || null;
    if (patch.notes !== undefined) clean.notes = patch.notes.slice(0, 4000);
    if (Object.keys(clean).length === 0) return { ok: true };

    const supabase = await createClient();
    const { error } = await supabase.from("customers").update(clean).eq("id", id);
    if (error) throw error;
    revalidateCrm();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
