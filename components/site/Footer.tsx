import Link from "next/link";
import { Clock, MapPin, Phone, Instagram, Youtube, Facebook } from "lucide-react";
import WhatsAppLink from "@/components/site/WhatsAppLink";
import { waLink } from "@/lib/utils";
import type { SiteContent } from "@/lib/site";

export default function Footer({ content }: { content: SiteContent }) {
  const socials = [
    { href: content.instagram_url, icon: Instagram, label: "Instagram" },
    { href: content.facebook_url, icon: Facebook, label: "Facebook" },
    { href: content.youtube_url, icon: Youtube, label: "YouTube" },
  ].filter((s) => s.href);

  return (
    <footer className="mt-20 border-t border-ink-100 bg-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold text-ink-900">{content.studio_name}</p>
          <p className="mt-2 text-sm text-ink-500">{content.tagline}</p>
          <div className="mt-4 flex gap-3">
            {socials.map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-100 text-ink-500 transition hover:border-brand-300 hover:text-brand-600"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink-800">Visit us</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li className="flex gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0" />
              <span>
                {content.address_line}, {content.city}
                <br />
                <a href={content.maps_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                  Get directions
                </a>
              </span>
            </li>
            <li className="flex gap-2">
              <Phone size={15} className="mt-0.5 shrink-0" />
              <a href={`tel:${content.phone.replace(/\s/g, "")}`} className="hover:text-brand-700">
                {content.phone}
              </a>
            </li>
            <li className="flex gap-2">
              <Clock size={15} className="mt-0.5 shrink-0" />
              <span>
                {content.open_time} – {content.close_time} (studio time)
              </span>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink-800">Quick links</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li><Link href="/services" className="hover:text-brand-700">Services &amp; pricing</Link></li>
            <li><Link href="/portfolio" className="hover:text-brand-700">Portfolio</Link></li>
            <li><Link href="/reviews" className="hover:text-brand-700">Customer reviews</Link></li>
            <li><Link href="/book" className="hover:text-brand-700">Book an appointment</Link></li>
          </ul>
          <WhatsAppLink
            href={waLink(content.whatsapp_number, `Hi ${content.studio_name}! I have a question.`)}
            label="footer"
            className="btn btn-outline btn-sm mt-4"
          >
            Chat on WhatsApp
          </WhatsAppLink>
        </div>
      </div>

      <div className="border-t border-ink-100 py-5">
        <p className="container-page text-center text-xs text-ink-400">
          © {new Date().getFullYear()} {content.studio_name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
