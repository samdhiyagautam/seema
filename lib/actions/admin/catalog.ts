"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import { friendlyError } from "@/lib/validations";

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
    .slice(0, 60) || "service";
}

function revalidateCatalog() {
  revalidatePath("/admin/services");
  revalidatePath("/admin/portfolio");
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/portfolio");
  revalidatePath("/reviews");
  revalidatePath("/book");
}

/* -------------------------------------------------------------- services */

export type ServiceInput = {
  id?: string;
  name: string;
  category: string;
  description: string;
  duration_minutes: number;
  price_inr: number;
  image_url: string;
  is_active: boolean;
  display_order: number;
};

export async function upsertServiceAction(input: ServiceInput): Promise<MutationResult> {
  try {
    await requireRole("catalog.manage");

    if (input.name.trim().length < 2) return { ok: false, error: "Service name is too short." };
    if (!Number.isFinite(input.duration_minutes) || input.duration_minutes < 15 || input.duration_minutes > 720) {
      return { ok: false, error: "Duration must be between 15 and 720 minutes." };
    }
    if (!Number.isFinite(input.price_inr) || input.price_inr < 0) {
      return { ok: false, error: "Price must be 0 or more." };
    }

    const supabase = await createClient();
    const row = {
      name: input.name.trim().slice(0, 120),
      category: input.category.trim().slice(0, 60) || "Makeup",
      description: input.description.trim().slice(0, 2000) || null,
      duration_minutes: Math.round(input.duration_minutes),
      price_inr: Math.round(input.price_inr),
      image_url: input.image_url.trim() || null,
      is_active: input.is_active,
      display_order: Math.round(input.display_order) || 0,
    };

    if (input.id) {
      const { error } = await supabase.from("services").update(row).eq("id", input.id);
      if (error) throw error;
    } else {
      let slug = slugify(input.name);
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await supabase.from("services").insert({ ...row, slug });
        if (!error) break;
        if (!error.message.includes("duplicate key")) throw error;
        slug = `${slugify(input.name)}-${Math.floor(Math.random() * 900 + 100)}`;
        if (attempt === 2) throw error;
      }
    }

    revalidateCatalog();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteServiceAction(id: string): Promise<MutationResult> {
  try {
    await requireRole("catalog.manage");
    const supabase = await createClient();

    const { count, error: countError } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("service_id", id);
    if (countError) throw countError;
    if (count && count > 0) {
      return {
        ok: false,
        error: `This service has ${count} booking(s). Deactivate it instead of deleting.`,
      };
    }

    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) throw error;
    revalidateCatalog();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* -------------------------------------------------------------- portfolio */

export async function updatePortfolioItemAction(
  id: string,
  patch: { title?: string; category?: string; is_published?: boolean; display_order?: number }
): Promise<MutationResult> {
  try {
    await requireRole("portfolio.manage");
    const supabase = await createClient();
    const clean: Record<string, unknown> = {};
    if (patch.title !== undefined) clean.title = patch.title.trim().slice(0, 120) || "Untitled";
    if (patch.category !== undefined) clean.category = patch.category.trim().slice(0, 60) || "Bridal";
    if (patch.is_published !== undefined) clean.is_published = patch.is_published;
    if (patch.display_order !== undefined) clean.display_order = Math.round(patch.display_order) || 0;

    const { error } = await supabase.from("portfolio_items").update(clean).eq("id", id);
    if (error) throw error;
    revalidateCatalog();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createPortfolioItemAction(input: {
  title: string;
  category: string;
  image_url: string;
}): Promise<MutationResult> {
  try {
    await requireRole("portfolio.manage");
    if (!input.image_url) return { ok: false, error: "Upload an image first." };
    const supabase = await createClient();
    const { error } = await supabase.from("portfolio_items").insert({
      title: input.title.trim().slice(0, 120) || "Untitled",
      category: input.category.trim().slice(0, 60) || "Bridal",
      image_url: input.image_url,
    });
    if (error) throw error;
    revalidateCatalog();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Extracts the storage path from a public URL and deletes the object, then the row. */
export async function deletePortfolioItemAction(id: string): Promise<MutationResult> {
  try {
    await requireRole("portfolio.manage");
    const supabase = await createClient();

    const { data: item } = await supabase
      .from("portfolio_items")
      .select("image_url")
      .eq("id", id)
      .maybeSingle();

    if (item?.image_url) {
      const marker = "/object/public/media/";
      const idx = item.image_url.indexOf(marker);
      if (idx > -1) {
        const path = item.image_url.slice(idx + marker.length);
        await supabase.storage.from("media").remove([path]).then(() => {}, () => {});
      }
    }

    const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
    if (error) throw error;
    revalidateCatalog();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------------------------------------------------------- reviews */

export async function moderateReviewAction(id: string, approve: boolean): Promise<MutationResult> {
  try {
    await requireRole("reviews.moderate");
    const supabase = await createClient();
    const { error } = await supabase.from("reviews").update({ is_approved: approve }).eq("id", id);
    if (error) throw error;
    revalidateCatalog();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteReviewAction(id: string): Promise<MutationResult> {
  try {
    await requireRole("reviews.moderate");
    const supabase = await createClient();
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) throw error;
    revalidateCatalog();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
