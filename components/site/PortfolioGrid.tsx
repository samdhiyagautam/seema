"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import MediaPlaceholder from "@/components/site/MediaPlaceholder";
import { cx } from "@/lib/utils";
import type { PortfolioItem } from "@/lib/types";

export default function PortfolioGrid({ items }: { items: PortfolioItem[] }) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category)))],
    [items]
  );
  const [active, setActive] = useState("All");

  const filtered = active === "All" ? items : items.filter((i) => i.category === active);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={cx(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              active === c
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
          Nothing in this category yet.
        </p>
      ) : (
        <div className="mt-8 columns-2 gap-4 md:columns-3">
          {filtered.map((item) => (
            <figure key={item.id} className="mb-4 break-inside-avoid">
              <div className="relative w-full overflow-hidden rounded-xl bg-ink-50">
                <div className="aspect-[3/4] relative">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover transition duration-300 hover:scale-[1.02]"
                    />
                  ) : (
                    <MediaPlaceholder label={item.category} />
                  )}
                </div>
              </div>
              <figcaption className="mt-2 flex items-baseline justify-between gap-2 px-0.5">
                <span className="text-sm font-medium text-ink-800">{item.title}</span>
                <span className="text-xs text-ink-400">{item.category}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
