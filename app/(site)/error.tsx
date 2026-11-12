"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="font-display text-5xl font-semibold text-brand-300">Oops</p>
      <h1 className="font-display text-2xl font-semibold text-ink-900">
        This page took a pause
      </h1>
      <p className="max-w-sm text-sm text-ink-500">
        An unexpected error occurred. You can retry, or reach us on WhatsApp — we&apos;ll be happy
        to help you book directly.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/" className="btn btn-outline">Back to home</Link>
      </div>
    </div>
  );
}
