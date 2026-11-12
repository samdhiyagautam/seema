import { createClient } from "@/lib/supabase/server";
import { mergeContent, type SiteContent } from "@/lib/site";
import type {
  BlockedDate,
  PortfolioItem,
  Review,
  Service,
  StaffMember,
} from "@/lib/types";

/**
 * Public data queries with fail-soft behavior: if Supabase is not configured
 * or unreachable, the storefront renders with defaults / empty lists instead
 * of crashing (docs/00-overview.md §6).
 */

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function getSiteContent(): Promise<SiteContent> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_content").select("key,value");
    if (error) throw error;
    return mergeContent(data ?? []);
  }, mergeContent([]));
}

export async function getServices(): Promise<Service[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .order("name");
    if (error) throw error;
    return (data ?? []) as Service[];
  }, []);
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return (data as Service) ?? null;
  }, null);
}

export async function getPortfolio(): Promise<PortfolioItem[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("portfolio_items")
      .select("*")
      .eq("is_published", true)
      .order("display_order")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PortfolioItem[];
  }, []);
}

export async function getApprovedReviews(limit = 12): Promise<Review[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Review[];
  }, []);
}

export async function getBlockedDates(): Promise<BlockedDate[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blocked_dates")
      .select("*")
      .gte("blocked_on", new Date().toISOString().slice(0, 10))
      .order("blocked_on");
    if (error) throw error;
    return (data ?? []) as BlockedDate[];
  }, []);
}

export async function getActiveStaff(): Promise<StaffMember[]> {
  return safe(async () => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff_members")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (error) throw error;
    return (data ?? []) as StaffMember[];
  }, []);
}
