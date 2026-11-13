"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Phone, Sparkles } from "lucide-react";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/courses", label: "Courses" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

export default function Header({ studioName, phone }: { studioName: string; phone: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-cream/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
            <Sparkles size={16} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink-900">
            {studioName}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink-600 transition hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-700"
          >
            <Phone size={15} /> {phone}
          </a>
          <Link href="/book" className="btn btn-primary btn-sm">
            Book Now
          </Link>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-700 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-ink-100 bg-cream px-5 pb-5 pt-3 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-brand-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/book"
              className="btn btn-primary mt-2 justify-center"
              onClick={() => setOpen(false)}
            >
              Book Appointment
            </Link>
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-ink-600"
            >
              <Phone size={15} /> {phone}
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
