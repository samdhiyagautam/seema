"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import type { AnalyticsEventName } from "@/lib/types";

/** Fires a business event once when mounted (e.g. service_viewed on a detail page). */
export default function TrackView({
  event,
  meta,
}: {
  event: AnalyticsEventName;
  meta?: Record<string, unknown>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(event, meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
