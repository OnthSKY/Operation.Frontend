"use client";

type AnalyticsWindow = Window & {
  posthog?: {
    capture: (event: string, payload?: Record<string, unknown>) => void;
  };
};

export function track(event: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  if (w.posthog?.capture) {
    w.posthog.capture(event, payload);
  }
}
