import { getServices } from "@/lib/data";
import ServiceCard from "@/components/site/ServiceCard";
import type { Service } from "@/lib/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description:
    "Full service menu of Seema Makeover Studio with transparent pricing and durations — bridal, occasion and add-on services.",
};

export default async function ServicesPage() {
  const services = await getServices();

  const categories: Array<[string, Service[]]> = [];
  for (const s of services) {
    const last = categories[categories.length - 1];
    if (last && last[0] === s.category) last[1].push(s);
    else categories.push([s.category, [s]]);
  }

  return (
    <div className="container-page py-12">
      <header className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Service menu</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink-900">Services &amp; pricing</h1>
        <p className="mt-3 text-sm text-ink-500">
          Every service lists its price and duration up front — what you see is what you pay.
          Prices include skin prep and finishing.
        </p>
      </header>

      {services.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
          The service menu is being updated. Please check back shortly.
        </p>
      ) : (
        <div className="mt-10 space-y-12">
          {categories.map(([category, items]) => (
            <section key={category}>
              <h2 className="font-display text-xl font-semibold text-brand-700">{category}</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
