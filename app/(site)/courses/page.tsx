import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";
import { getActiveCourses } from "@/lib/data";
import { formatINR } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Makeup Courses",
  description:
    "Learn makeup artistry from Seema — professional bridal course, advanced techniques and self-grooming classes in Indore. Small batches, hands-on training.",
};

export default async function CoursesPage() {
  const courses = await getActiveCourses();

  return (
    <div className="container-page py-12">
      <header className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Academy</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink-900">
          Learn the craft from Seema
        </h1>
        <p className="mt-3 text-sm text-ink-500">
          The same studio that does brides every week now teaches the trade — small batches,
          hands-on practice on real models, and honest guidance about building clients.
        </p>
      </header>

      {courses.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
          Course details are being updated. Please check back shortly, or ask us directly on
          WhatsApp.
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.slug}`}
              className="card group flex flex-col overflow-hidden transition hover:border-brand-200"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image_url}
                    alt={c.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-50">
                    <GraduationCap size={40} className="text-brand-300" />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                  {c.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-lg font-semibold text-ink-900">{c.name}</h2>
                {c.summary && (
                  <p className="mt-2 flex-1 text-sm text-ink-500 line-clamp-3">{c.summary}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-ink-500">
                    <Sparkles size={14} /> {c.duration_days} days
                  </span>
                  <span className="font-semibold text-ink-900">{formatINR(c.fee_inr)}</span>
                </div>
                <span className="mt-4 text-sm font-medium text-brand-700 group-hover:underline">
                  View details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
