"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/guard";
import { expenseInputSchema, friendlyError } from "@/lib/validations";

export type MutationResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): MutationResult {
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, error: friendlyError(message) };
}

function revalidateFinance() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  revalidatePath("/admin/analytics");
}

export async function createExpenseAction(input: {
  spent_on: string;
  category: string;
  description?: string;
  amount_inr: number;
}): Promise<MutationResult> {
  try {
    const ctx = await requireRole("finance.manage");
    const parsed = expenseInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the expense details." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("expenses").insert({
      ...parsed.data,
      description: parsed.data.description || null,
      created_by: ctx.userId,
    });
    if (error) throw error;

    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteExpenseAction(id: string): Promise<MutationResult> {
  try {
    await requireRole("finance.manage");
    const supabase = await createClient();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
    revalidateFinance();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
