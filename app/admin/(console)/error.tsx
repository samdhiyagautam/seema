"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const forbidden = error.message === "FORBIDDEN";

  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h1 className="font-display text-xl font-semibold text-ink-900">
        {forbidden ? "No permission" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        {forbidden
          ? "Your role doesn't allow this action. Ask the studio owner if you need more access."
          : "The console hit an unexpected error. Your data is safe — try again."}
      </p>
      <button onClick={reset} className="btn btn-primary btn-sm mt-5">
        Try again
      </button>
    </div>
  );
}
