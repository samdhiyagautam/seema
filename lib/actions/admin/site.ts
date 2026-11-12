"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import { friendlyError } from "@/lib/validations";
import { ALL_CONTENT_FIELDS } from "@/lib/site";
import type { Role } from "@/lib/types";

export type MutationResult = { ok: true } | { ok: false, error: string };

function fail(error: unknown): MutationResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: friendlyError(message) };
}

/* --------------------------------------------------------- site content */

export async function saveContentAction(values: Record<string, string>): Promise<MutationResult> {
  try {
    await requireRole("content.manage");
    const supabase = await createClient();

    const known = new Set(ALL_CONTENT_FIELDS.map((f) => f.key));
    const rows = Object.entries(values)
      .filter(([key]) => known.has(key))
      .map(([key, value]) => ({ key, value: String(value ?? "").slice(0, 4000) }));

    if (rows.length === 0) return { ok: false, error: "Nothing to save." };

    const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
    if (error) throw error;

    revalidatePath("/admin/content");
    revalidatePath("/", "layout"); // storefront reads content everywhere
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* --------------------------------------------------------- availability */

export async function addBlockedDateAction(date: string, reason: string): Promise<MutationResult> {
  try {
    await requireRole("content.manage");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, error: "Pick a valid date." };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("blocked_dates")
      .upsert({ blocked_on: date, reason: reason.trim().slice(0, 200) || null }, { onConflict: "blocked_on" });
    if (error) throw error;
    revalidatePath("/admin/availability");
    revalidatePath("/book");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeBlockedDateAction(id: string): Promise<MutationResult> {
  try {
    await requireRole("content.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/availability");
    revalidatePath("/book");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* -------------------------------------------------------------- staff (F) */

export type StaffInput = {
  id?: string;
  full_name: string;
  role_title: string;
  bio: string;
  specialties: string;
  phone: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
};

export async function upsertStaffAction(input: StaffInput): Promise<MutationResult> {
  try {
    await requireRole("bookings.manage"); // manager+
    if (input.full_name.trim().length < 2) return { ok: false, error: "Enter the artist's name." };

    const supabase = await createClient();
    const row = {
      full_name: input.full_name.trim().slice(0, 80),
      role_title: input.role_title.trim().slice(0, 60) || "Artist",
      bio: input.bio.trim().slice(0, 1500) || null,
      specialties: input.specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10),
      phone: input.phone.trim() || null,
      image_url: input.image_url.trim() || null,
      is_active: input.is_active,
      display_order: Math.round(input.display_order) || 0,
    };

    const { error } = input.id
      ? await supabase.from("staff_members").update(row).eq("id", input.id)
      : await supabase.from("staff_members").insert(row);
    if (error) throw error;

    revalidatePath("/admin/staff");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deactivateStaffAction(id: string, isActive: boolean): Promise<MutationResult> {
  try {
    await requireRole("bookings.manage");
    const supabase = await createClient();

    if (!isActive) {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("assigned_staff_id", id)
        .in("status", ["pending", "confirmed"]);
      if (count && count > 0) {
        return {
          ok: false,
          error: `This artist has ${count} upcoming booking(s). Reassign them first.`,
        };
      }
    }

    const { error } = await supabase.from("staff_members").update({ is_active: isActive }).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/staff");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Super Admin only: change a user's role (Module J). */
export async function updateUserRoleAction(userId: string, role: Role): Promise<MutationResult> {
  try {
    await requireRole("users.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) throw error;
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
