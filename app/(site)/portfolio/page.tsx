import { getPortfolio } from "@/lib/data";
import PortfolioGrid from "@/components/site/PortfolioGrid";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Real bridal and occasion looks by Seema Makeover Studio.",
};

export default async function PortfolioPage() {
  const items = await getPortfolio();

  return (
    <div className="container-page py-12">
      <header className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Portfolio</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink-900">Our work speaks</h1>
        <p className="mt-3 text-sm text-ink-500">
          Every look here was created at the studio. Filter by occasion to find inspiration for yours.
        </p>
      </header>

      <div className="mt-10">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
            New looks are being added right now — check back soon or follow us on Instagram.
          </p>
        ) : (
          <PortfolioGrid items={items} />
        )}
      </div>
    </div>
  );
}
