"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyDigestButton({ text, label = "Copy digest" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (older browser / permissions)
    }
  }

  return (
    <button type="button" onClick={copy} className="btn btn-outline btn-sm">
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {copied ? "Copied!" : label}
    </button>
  );
}
