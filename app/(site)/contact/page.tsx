import { Clock, MapPin, Phone } from "lucide-react";
import { getServices, getSiteContent } from "@/lib/data";
import EnquiryForm from "@/components/site/EnquiryForm";
import WhatsAppLink from "@/components/site/WhatsAppLink";
import { waLink } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact & Enquiries",
  description:
    "Contact Seema Makeover Studio — WhatsApp, phone, studio address and enquiry form.",
};

export default async function ContactPage() {
  const [content, services] = await Promise.all([getSiteContent(), getServices()]);

  return (
    <div className="container-page py-12">
      <header className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Contact</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink-900">
          Say hello — we reply fast
        </h1>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <div className="card p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
              <Phone size={15} className="text-brand-600" /> Call or WhatsApp
            </p>
            <p className="mt-2 text-sm text-ink-600">{content.phone}</p>
            <WhatsAppLink
              href={waLink(content.whatsapp_number, `Hi ${content.studio_name}! I have an enquiry.`)}
              label="contact-page"
              className="btn btn-primary btn-sm mt-3"
            >
              Chat on WhatsApp
            </WhatsAppLink>
          </div>

          <div className="card p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
              <MapPin size={15} className="text-brand-600" /> Studio
            </p>
            <p className="mt-2 text-sm text-ink-600">
              {content.address_line}, {content.city}
            </p>
            <a
              href={content.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline"
            >
              Get directions →
            </a>
          </div>

          <div className="card p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-800">
              <Clock size={15} className="text-brand-600" /> Studio hours
            </p>
            <p className="mt-2 text-sm text-ink-600">
              {content.open_time} – {content.close_time}
            </p>
          </div>
        </div>

        <EnquiryForm services={services.map((s) => s.name)} />
      </div>
    </div>
  );
}
