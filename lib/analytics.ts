"use client";

import { getBrowserClient } from "@/lib/supabase/browser";
import type { AnalyticsEventName } from "@/lib/types";

/**
 * Module K — privacy-conscious first-party analytics.
 * No cookies, no third parties, no personal data: event name + page path +
 * non-personal metadata only. Silently no-ops when Supabase is unreachable.
 */

const ALLOWED: AnalyticsEventName[] = [
  "service_viewed",
  "booking_started",
  "booking_submitted",
  "booking_confirmed",
  "enquiry_submitted",
  "whatsapp_cta_clicked",
  "course_enquiry_submitted",
];

export function track(name: AnalyticsEventName, meta: Record<string, unknown> = {}) {
  try {
    if (!ALLOWED.includes(name)) return;
    const supabase = getBrowserClient();
    if (!supabase) return;

    const safeMeta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (["string", "number", "boolean"].includes(typeof v)) safeMeta[k] = v;
    }

    void supabase
      .from("events")
      .insert({ name, path: window.location.pathname, meta: safeMeta })
      .then(() => {}, () => {});
  } catch {
    // analytics must never break UX
  }
}
