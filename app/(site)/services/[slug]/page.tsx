import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MessageCircle } from "lucide-react";
import { getServiceBySlug, getServices, getSiteContent } from "@/lib/data";
import TrackView from "@/components/site/TrackView";
import MediaPlaceholder from "@/components/site/MediaPlaceholder";
import WhatsAppLink from "@/components/site/WhatsAppLink";
import { formatINR, waLink } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "Service not found" };
  return {
    title: service.name,
    description: service.description ?? undefined,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [service, all, content] = await Promise.all([
    getServiceBySlug(slug),
    getServices(),
    getSiteContent(),
  ]);

  if (!service) notFound();

  const related = all.filter((s) => s.id !== service.id && s.category === service.category).slice(0, 3);

  return (
    <div className="container-page py-12">
      <TrackView event="service_viewed" meta={{ slug: service.slug, service: service.name }} />

      <nav className="text-xs text-ink-400">
        <Link href="/services" className="hover:text-brand-700">Services</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-600">{service.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink-50">
          {service.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.image_url} alt={service.name} className="h-full w-full object-cover" />
          ) : (
            <MediaPlaceholder label={service.category} />
          )}
        </div>

        <div className="flex flex-col">
          <span className="badge w-fit bg-brand-50 text-brand-700">{service.category}</span>
          <h1 className="mt-3 font-display text-4xl font-semibold text-ink-900">{service.name}</h1>

          <div className="mt-4 flex items-center gap-6">
            <span className="font-display text-2xl font-semibold text-brand-700">
              {formatINR(service.price_inr)}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-ink-500">
              <Clock size={15} /> {service.duration_minutes} minutes
            </span>
          </div>

          {service.description ? (
            <p className="mt-6 leading-relaxed text-ink-600">{service.description}</p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/book?service=${service.slug}`} className="btn btn-primary">
              Book this service
            </Link>
            <WhatsAppLink
              href={waLink(
                content.whatsapp_number,
                `Hi ${content.studio_name}! I'd like to enquire about ${service.name} (${formatINR(service.price_inr)}).`
              )}
              label={`service:${service.slug}`}
              className="btn btn-outline"
            >
              <MessageCircle size={15} /> Ask on WhatsApp
            </WhatsAppLink>
          </div>

          <div className="mt-8 rounded-xl border border-ink-100 bg-white p-5 text-sm text-ink-500">
            <p className="font-semibold text-ink-800">Good to know</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Booking is confirmed after a short WhatsApp confirmation from the studio.</li>
              <li>Same-day bookings need {content.min_notice_hours}+ hours notice.</li>
              <li>{content.advance_note}</li>
            </ul>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold text-ink-900">You may also like</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.slug}`}
                className="card flex items-center justify-between gap-4 p-5 transition hover:border-brand-200"
              >
                <div>
                  <p className="font-semibold text-ink-900">{s.name}</p>
                  <p className="text-xs text-ink-500">{s.duration_minutes} min</p>
                </div>
                <span className="font-semibold text-brand-700">{formatINR(s.price_inr)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
