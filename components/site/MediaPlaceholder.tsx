import { Sparkles } from "lucide-react";

/** Branded placeholder when a service/portfolio item has no image yet. */
export default function MediaPlaceholder({ label }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-100 via-brand-50 to-gold-400/20 text-brand-400">
      <Sparkles size={28} />
      {label ? (
        <span className="px-3 text-center text-xs font-medium text-brand-600">{label}</span>
      ) : null}
    </div>
  );
}
