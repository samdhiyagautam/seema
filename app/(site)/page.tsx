import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  Heart,
  ShieldCheck,
  Sparkles,
  BadgeCheck,
} from "lucide-react";
import { getApprovedReviews, getPortfolio, getServices, getSiteContent, getActiveStaff } from "@/lib/data";
import { slotsConfigFrom, parseClosedWeekdays } from "@/lib/site";
import ServiceCard from "@/components/site/ServiceCard";
import MediaPlaceholder from "@/components/site/MediaPlaceholder";
import Stars from "@/components/site/Stars";
import WhatsAppLink from "@/components/site/WhatsAppLink";
import { waLink } from "@/lib/utils";import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seema Makeover Studio — Bridal & Occasion Makeup",
};

const USPS = [
  { icon: Sparkles, title: "Premium products", text: "HD & airbrush techniques with skin-safe, professional-grade products." },
  { icon: ShieldCheck, title: "Hygienic kit", text: "Sanitised brushes and disposables for every single client, every time." },
  { icon: Heart, title: "Look that lasts", text: "Base engineered for long Indian functions — photos, tears, and dancing." },
  { icon: CalendarCheck, title: "On-time, every time", text: "Slot-based appointments so your event schedule is never at risk." },
];

export default async function HomePage() {
  const [content, services, portfolio, reviews, staff] = await Promise.all([
    getSiteContent(),
    getServices(),
    getPortfolio(),
    getApprovedReviews(3),
    getActiveStaff(),
  ]);

  const featured = services.slice(0, 6);
  const founder = staff[0];
  const closed = parseClosedWeekdays(content.closed_weekdays);
  const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const closedLabels = [1, 2, 3, 4, 5, 6, 7].filter((n) => closed.includes(n)).map((n) => weekdayNames[n - 1]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: content.studio_name,
    description: content.tagline,
    telephone: content.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: content.address_line,
      addressLocality: content.city,
      addressCountry: "IN",
    },
    openingHours: `${content.open_time}-${content.close_time}`,
    priceRange: "₹₹",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-ink-900" />
        <div
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #c9a24b 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #e0adc2 0%, transparent 70%)" }}
        />

        <div className="container-page relative flex flex-col items-start gap-6 py-24 md:py-32">
          <span className="badge border border-gold-500/40 bg-white/10 text-gold-400 backdrop-blur">
            {content.hero_kicker}
          </span>
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-white md:text-6xl">
            {content.hero_title}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-brand-100 md:text-lg">
            {content.hero_subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/book" className="btn btn-primary bg-white text-brand-800 hover:bg-brand-50">
              Book an appointment <ArrowRight size={16} />
            </Link>
            <WhatsAppLink
              href={waLink(content.whatsapp_number, `Hi ${content.studio_name}! I'd like to enquire about bridal makeup.`)}
              label="hero"
              className="btn border border-white/30 text-white hover:bg-white/10"
            >
              Enquire on WhatsApp
            </WhatsAppLink>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-6 text-white">
            <div>
              <p className="font-display text-2xl font-semibold">{content.years_experience}+</p>
              <p className="text-xs text-brand-100">years of artistry</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">{Number(content.happy_clients).toLocaleString("en-IN")}+</p>
              <p className="text-xs text-brand-100">happy clients</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">{services.length}</p>
              <p className="text-xs text-brand-100">services on the menu</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">{closedLabels.length ? closedLabels.join(", ") : "Open daily"}</p>
              <p className="text-xs text-brand-100">
                {content.open_time} – {content.close_time}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* USPs */}
      <section className="container-page -mt-10 relative z-10">
        <div className="grid gap-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {USPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-800">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Services</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-ink-900">
              Transparent pricing, no surprises
            </h2>
          </div>
          <Link href="/services" className="hidden shrink-0 text-sm font-semibold text-brand-700 hover:underline sm:block">
            View all services →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            The service menu is being updated. Please check back shortly or WhatsApp us.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
          </div>
        )}
      </section>

      {/* Bridal spotlight */}
      <section className="bg-gradient-to-r from-brand-800 to-brand-600 py-14">
        <div className="container-page flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-400">The Seema bride</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-white">
              Your wedding look deserves a specialist
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-brand-100">
              From engagement to reception, we plan your looks function by function — trial, timeline and
              draping included. Slots for wedding season go quickly.
            </p>
          </div>
          <Link href="/book?category=Bridal" className="btn shrink-0 bg-white text-brand-800 hover:bg-brand-50">
            Reserve your date
          </Link>
        </div>
      </section>

      {/* Portfolio preview */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Portfolio</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-ink-900">Real work, real brides</h2>
          </div>
          <Link href="/portfolio" className="hidden shrink-0 text-sm font-semibold text-brand-700 hover:underline sm:block">
            See full portfolio →
          </Link>
        </div>
        {portfolio.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            New portfolio looks are being added. Follow us on Instagram for the latest.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            {portfolio.slice(0, 6).map((item) => (
              <div key={item.id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-ink-50">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover transition duration-300 hover:scale-[1.03]"
                />
                <span className="absolute bottom-2 left-2 badge bg-black/50 text-white backdrop-blur">
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="container-page pb-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Testimonials</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-ink-900">What clients say</h2>
          </div>
          <Link href="/reviews" className="hidden shrink-0 text-sm font-semibold text-brand-700 hover:underline sm:block">
            Read all reviews →
          </Link>
        </div>
        {reviews.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
            Reviews are being collected. Be the first to share your experience.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="card p-6">
                <Stars rating={r.rating} />
                <blockquote className="mt-3 text-sm leading-relaxed text-ink-600">
                  “{r.comment}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-2 text-sm">
                  <span className="font-semibold text-ink-800">{r.author_name}</span>
                  {r.is_verified && (
                    <span className="badge bg-emerald-50 text-emerald-700">
                      <BadgeCheck size={12} /> Verified booking
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* About + founder */}
      <section className="container-page pb-16">
        <div className="grid items-center gap-10 rounded-2xl border border-ink-100 bg-white p-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:p-12">
          <div className="flex flex-col items-start gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">About</p>
            <h2 className="font-display text-3xl font-semibold text-ink-900">{content.about_title}</h2>
            {founder?.image_url ? (
              <div className="relative mt-2 h-56 w-44 overflow-hidden rounded-xl">
                <Image src={founder.image_url} alt={founder.full_name} fill sizes="176px" className="object-cover" />
              </div>
            ) : (
              <div className="mt-2 h-56 w-44 overflow-hidden rounded-xl">
                <MediaPlaceholder label={founder?.role_title ?? "Lead Artist"} />
              </div>
            )}
            {founder && (
              <div className="mt-1">
                <p className="font-semibold text-ink-800">{founder.full_name}</p>
                <p className="text-xs text-ink-500">{founder.role_title}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm leading-relaxed text-ink-600 md:text-base">{content.about_body}</p>
            {founder?.specialties?.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {founder.specialties.map((s) => (
                  <span key={s} className="badge bg-brand-50 text-brand-700">{s}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-page pb-20">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-10 text-center">
          <h2 className="font-display text-3xl font-semibold text-ink-900">
            Ready for your glow-up?
          </h2>
          <p className="max-w-md text-sm text-ink-600">
            Pick a real slot in under a minute — you&apos;ll get an instant booking code and a WhatsApp
            confirmation.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/book" className="btn btn-primary">Book an appointment</Link>
            <Link href="/services" className="btn btn-outline">Browse services</Link>
          </div>
        </div>
      </section>
    </>
  );
}
