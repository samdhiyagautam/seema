/**
 * Website content management (Module: website content CMS).
 * `site_content` table stores key/value text rows; these are the keys, their
 * labels, types and fallback values. The storefront renders DEFAULTS when the
 * database is unreachable or a key is missing — the site never goes blank.
 */

export type ContentType = "text" | "textarea" | "time" | "number" | "weekdays";

export type ContentField = {
  key: string;
  label: string;
  type: ContentType;
  default: string;
};

export type ContentGroup = { title: string; fields: ContentField[] };

export const CONTENT_GROUPS: ContentGroup[] = [
  {
    title: "Brand",
    fields: [
      { key: "studio_name", label: "Studio name", type: "text", default: "Seema Makeover Studio" },
      {
        key: "tagline",
        label: "Tagline",
        type: "text",
        default: "Bridal & occasion makeup artistry",
      },
      { key: "years_experience", label: "Years of experience", type: "number", default: "8" },
      { key: "happy_clients", label: "Happy clients (count)", type: "number", default: "1200" },
    ],
  },
  {
    title: "Hero section",
    fields: [
      { key: "hero_kicker", label: "Kicker (small line)", type: "text", default: "Bridal • Party • Occasion Makeup" },
      {
        key: "hero_title",
        label: "Headline",
        type: "text",
        default: "Look effortlessly radiant on your biggest day",
      },
      {
        key: "hero_subtitle",
        label: "Sub-headline",
        type: "textarea",
        default:
          "Professional makeup and hairstyling by Seema — premium products, a fully hygienic kit, and a look that lasts from the mandap to midnight.",
      },
    ],
  },
  {
    title: "About section",
    fields: [
      { key: "about_title", label: "Title", type: "text", default: "Meet Seema" },
      {
        key: "about_body",
        label: "Body",
        type: "textarea",
        default:
          "Seema is a professional makeup artist with 8+ years of experience in bridal, party and occasion looks. Trained in HD and airbrush techniques, she works only with premium, skin-safe products and maintains a fully sanitised kit for every client. Every look starts with understanding you — your outfit, your event, your comfort — so you feel like yourself, only luminous.",
      },
    ],
  },
  {
    title: "Contact & hours",
    fields: [
      { key: "phone", label: "Phone (display)", type: "text", default: "+91 98765 43210" },
      { key: "whatsapp_number", label: "WhatsApp number (digits, with country code)", type: "text", default: "919876543210" },
      { key: "upi_id", label: "UPI ID (for advance payments)", type: "text", default: "seema@upi" },
      { key: "address_line", label: "Address line", type: "text", default: "Shop 12, Sunrise Plaza, MG Road" },
      { key: "city", label: "City", type: "text", default: "Indore" },
      { key: "maps_url", label: "Google Maps URL", type: "text", default: "https://maps.google.com/?q=Seema+Makeover+Studio" },
      { key: "open_time", label: "Opens at", type: "time", default: "10:00" },
      { key: "close_time", label: "Closes at", type: "time", default: "19:00" },
      { key: "slot_interval_minutes", label: "Slot interval (minutes)", type: "number", default: "30" },
      { key: "min_notice_hours", label: "Same-day minimum notice (hours)", type: "number", default: "3" },
      { key: "closed_weekdays", label: "Weekly closed days", type: "weekdays", default: '["1"]' },
      {
        key: "advance_note",
        label: "Advance payment note",
        type: "textarea",
        default: "Pay ₹2,000 advance via UPI to hold your slot. Balance after your session.",
      },
    ],
  },
  {
    title: "Social links",
    fields: [
      { key: "instagram_url", label: "Instagram URL", type: "text", default: "https://instagram.com/seemamakeover" },
      { key: "facebook_url", label: "Facebook URL", type: "text", default: "" },
      { key: "youtube_url", label: "YouTube URL", type: "text", default: "" },
    ],
  },
];

export const ALL_CONTENT_FIELDS = CONTENT_GROUPS.flatMap((g) => g.fields);

export type SiteContent = Record<string, string>;

export function buildDefaults(): SiteContent {
  const out: SiteContent = {};
  for (const f of ALL_CONTENT_FIELDS) out[f.key] = f.default;
  return out;
}

export function mergeContent(rows: Array<{ key: string; value: string }>): SiteContent {
  const merged = buildDefaults();
  for (const row of rows) {
    if (row.value !== null && row.value !== undefined) merged[row.key] = row.value;
  }
  return merged;
}

export function parseClosedWeekdays(raw: string | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : []).map(Number).filter((n) => n >= 1 && n <= 7);
  } catch {
    return [];
  }
}

export type SlotsConfig = {
  open: string;
  close: string;
  interval: number;
  noticeHours: number;
  closedWeekdays: number[];
  blockedDates: string[];
  whatsapp: string;
  upiId: string;
  studioName: string;
  advanceNote: string;
};

export function slotsConfigFrom(content: SiteContent, blockedDates: string[] = []): SlotsConfig {
  return {
    open: content.open_time || "10:00",
    close: content.close_time || "19:00",
    interval: Math.max(15, parseInt(content.slot_interval_minutes || "30", 10) || 30),
    noticeHours: Math.max(0, parseInt(content.min_notice_hours || "0", 10) || 0),
    closedWeekdays: parseClosedWeekdays(content.closed_weekdays),
    blockedDates,
    whatsapp: content.whatsapp_number || "",
    upiId: content.upi_id || "",
    studioName: content.studio_name || "Seema Makeover Studio",
    advanceNote: content.advance_note || "",
  };
}
