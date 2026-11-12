import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowRight } from "lucide-react";
import MediaPlaceholder from "@/components/site/MediaPlaceholder";
import type { Service } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="card group flex flex-col overflow-hidden transition hover:shadow-md hover:shadow-brand-900/5">
      <div className="relative h-48 w-full overflow-hidden bg-ink-50">
        {service.image_url ? (
          <Image
            src={service.image_url}
            alt={service.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <MediaPlaceholder label={service.category} />
        )}
        <span className="absolute left-3 top-3 badge bg-white/90 text-brand-700 backdrop-blur">
          {service.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-lg font-semibold text-ink-900">{service.name}</h3>
        <p className="line-clamp-2 flex-1 text-sm text-ink-500">{service.description}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-base font-semibold text-brand-700">{formatINR(service.price_inr)}</span>
          <span className="flex items-center gap-1 text-xs text-ink-500">
            <Clock size={13} /> {service.duration_minutes} min
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Link href={`/book?service=${service.slug}`} className="btn btn-primary btn-sm flex-1 justify-center">
            Book
          </Link>
          <Link
            href={`/services/${service.slug}`}
            className="btn btn-ghost btn-sm flex-1 justify-center border border-ink-100"
          >
            Details <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
