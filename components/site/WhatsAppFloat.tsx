"use client";

import { MessageCircle } from "lucide-react";
import { track } from "@/lib/analytics";
import { waLink } from "@/lib/utils";

export default function WhatsAppFloat({
  whatsapp,
  studioName,
}: {
  whatsapp: string;
  studioName: string;
}) {
  if (!whatsapp) return null;
  const href = waLink(whatsapp, `Hi ${studioName}! I'd like to know more about your services.`);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/15 transition hover:scale-105"
      style={{ height: 52, width: 52 }}
      onClick={() => track("whatsapp_cta_clicked", { label: "floating", path: window.location.pathname })}
    >
      <MessageCircle size={24} />
    </a>
  );
}
