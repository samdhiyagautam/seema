import { Star } from "lucide-react";
import { cx } from "@/lib/utils";

/** Read-only star rating (server-safe). */
export default function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={cx(
            i < rating ? "fill-gold-500 text-gold-500" : "fill-none text-ink-300"
          )}
        />
      ))}
    </span>
  );
}
