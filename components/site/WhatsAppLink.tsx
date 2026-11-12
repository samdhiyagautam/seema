"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics";

/**
 * Every WhatsApp CTA in the app goes through this link so we can measure
 * whatsapp_cta_clicked (Module K). The click itself is never blocked.
 */
export default function WhatsAppLink({
  href,
  children,
  className,
  label,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => track("whatsapp_cta_clicked", { label: label ?? "general", path: window.location.pathname })}
    >
      {children}
    </a>
  );
}
