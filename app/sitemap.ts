import type { MetadataRoute } from "next";
import { getActiveCourses, getServices } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes = ["", "/services", "/courses", "/portfolio", "/reviews", "/book", "/contact"].map(
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

  let courseRoutes: MetadataRoute.Sitemap = [];
  try {
    const courses = await getActiveCourses();
    courseRoutes = courses.map((c) => ({
      url: `${base}/courses/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // ignore — same fail-soft as services
  }

  return [...staticRoutes, ...serviceRoutes, ...courseRoutes];
}
