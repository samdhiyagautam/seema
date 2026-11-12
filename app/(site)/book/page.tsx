import { getBlockedDates, getServices, getSiteContent } from "@/lib/data";
import { slotsConfigFrom } from "@/lib/site";
import BookingForm from "@/components/site/BookingForm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description:
    "Pick a real, system-validated slot at Seema Makeover Studio and get an instant booking code.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; category?: string }>;
}) {
  const { service, category } = await searchParams;
  const [services, content, blocked] = await Promise.all([
    getServices(),
    getSiteContent(),
    getBlockedDates(),
  ]);

  const config = slotsConfigFrom(
    content,
    blocked.map((b) => b.blocked_on)
  );

  return (
    <div className="container-page py-12">
      <header className="mx-auto mb-10 max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Book now</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink-900">
          Reserve your slot
        </h1>
        <p className="mt-3 text-sm text-ink-500">
          The slots below are live availability — no double-bookings. You&apos;ll get an instant
          booking code and a WhatsApp confirmation.
        </p>
      </header>

      <BookingForm
        services={services.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          category: s.category,
          price_inr: s.price_inr,
          duration_minutes: s.duration_minutes,
        }))}
        config={config}
        initialSlug={service}
        initialCategory={category}
      />
    </div>
  );
}
