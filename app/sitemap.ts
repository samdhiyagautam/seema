import type { MetadataRoute } from "next";
import { getServices } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes = ["", "/services", "/portfolio", "/reviews", "/book", "/contact"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })
  );

  let serviceRoutes: MetadataRoute.Sitemap = [];
  try {
    const services = await getServices();
    serviceRoutes = services.map((s) => ({
      url: `${base}/services/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // storefront still gets static routes when the DB is unreachable at build time
  }

  return [...staticRoutes, ...serviceRoutes];
}
