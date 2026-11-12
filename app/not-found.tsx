import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-6xl font-semibold text-brand-300">404</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900">This page wandered off</h1>
      <p className="max-w-sm text-sm text-ink-500">
        The page you&apos;re looking for doesn&apos;t exist — maybe the link is old, or the service
        has been renamed.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="btn btn-primary">Back to home</Link>
        <Link href="/services" className="btn btn-outline">Browse services</Link>
      </div>
    </div>
  );
}
