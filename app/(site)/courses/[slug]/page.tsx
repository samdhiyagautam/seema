import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, Check, GraduationCap, Users } from "lucide-react";
import { getCourseBySlug, getOpenBatches } from "@/lib/data";
import { getSiteContent } from "@/lib/data";
import CourseEnquiryForm from "@/components/site/CourseEnquiryForm";
import { formatDate, formatINR, waLink } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return { title: "Course not found" };
  return {
    title: course.name,
    description: course.summary ?? `${course.name} at Seema Makeover Studio, Indore.`,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const [batches, content] = await Promise.all([getOpenBatches(course.id), getSiteContent()]);
  const syllabus = (course.syllabus ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const phone = content.whatsapp_number
    ? `+${content.whatsapp_number.replace(/\D/g, "")}`
    : content.phone;

  return (
    <div className="container-page py-12">
      <nav className="mb-6 text-xs text-ink-400">
        <Link href="/courses" className="hover:text-brand-700">Courses</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-600">{course.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            {course.category}
          </span>
          <h1 className="mt-3 font-display text-4xl font-semibold text-ink-900">{course.name}</h1>
          {course.summary && <p className="mt-3 text-lg text-ink-500">{course.summary}</p>}

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="badge bg-brand-100 text-brand-700">
              <GraduationCap size={13} className="mr-1" /> {course.duration_days}-day course
            </span>
            <span className="badge bg-ink-100 text-ink-700">{formatINR(course.fee_inr)} fee</span>
            {course.kit_included && (
              <span className="badge bg-emerald-100 text-emerald-800">Professional kit included</span>
            )}
          </div>

          {course.description && (
            <div className="prose-sm mt-8 max-w-none text-ink-600">
              <h2 className="font-display text-xl font-semibold text-ink-900">About this course</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed">{course.description}</p>
            </div>
          )}

          {syllabus.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-semibold text-ink-900">What you&apos;ll learn</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {syllabus.map((topic, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-xl bg-white p-3 text-sm text-ink-700 shadow-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand-600" />
                    {topic}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold text-ink-900">Upcoming batches</h2>
            {batches.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-ink-200 bg-white p-6 text-sm text-ink-500">
                Next batch dates are being finalised. Send an enquiry below and you&apos;ll be the
                first to know.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {batches.map((b) => (
                  <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium text-ink-900">{b.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                        <span className="flex items-center gap-1">
                          <CalendarRange size={13} /> Starts {formatDate(b.start_date)}
                        </span>
                        {b.schedule && (
                          <span className="flex items-center gap-1">
                            <Users size={13} /> {b.schedule}
                          </span>
                        )}
                      </p>
                    </div>
                    <a
                      href={waLink(
                        phone,
                        `Hi! I'm interested in the ${course.name} — batch "${b.name}". Please share seat availability and the fee details.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                    >
                      Ask about seats
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CourseEnquiryForm
            courses={[{ id: course.id, name: course.name }]}
            defaultCourseId={course.id}
            defaultCourseName={course.name}
          />
          <p className="mt-4 text-center text-xs text-ink-400">
            Prefer talking first?{" "}
            <a
              href={waLink(
                phone,
                `Hi! I want to know more about the ${course.name}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 hover:underline"
            >
              Message us on WhatsApp
            </a>
          </p>
        </aside>
      </div>
    </div>
  );
}
