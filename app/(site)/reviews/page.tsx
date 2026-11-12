import { BadgeCheck } from "lucide-react";
import { getApprovedReviews } from "@/lib/data";
import ReviewForm from "@/components/site/ReviewForm";
import Stars from "@/components/site/Stars";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer Reviews",
  description: "Genuine, moderated reviews from Seema Makeover Studio customers.",
};

export default async function ReviewsPage() {
  const reviews = await getApprovedReviews(24);
  const avg =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  return (
    <div className="container-page py-12">
      <header className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Testimonials</p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-ink-900">Customer reviews</h1>
        {avg !== null && (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-600">
            <Stars rating={Math.round(avg)} /> <strong>{avg}</strong> / 5 average from{" "}
            {reviews.length} review{reviews.length > 1 ? "s" : ""}
          </p>
        )}
        <p className="mt-3 text-sm text-ink-500">
          Reviews are moderated — we publish genuine feedback only. A{" "}
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <BadgeCheck size={14} /> Verified
          </span>{" "}
          badge means the review is linked to a real booking.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-5">
          {reviews.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 bg-white p-10 text-center text-sm text-ink-500">
              No published reviews yet — be the first to share your experience.
            </p>
          ) : (
            reviews.map((r) => (
              <figure key={r.id} className="card p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars rating={r.rating} />
                  {r.is_verified && (
                    <span className="badge bg-emerald-50 text-emerald-700">
                      <BadgeCheck size={12} /> Verified booking
                    </span>
                  )}
                </div>
                <blockquote className="mt-3 leading-relaxed text-ink-600">“{r.comment}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-ink-800">
                  {r.author_name}
                  <span className="ml-2 text-xs font-normal text-ink-400">
                    {new Date(r.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </figcaption>
              </figure>
            ))
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ReviewForm />
        </aside>
      </div>
    </div>
  );
}
