"use client";

import { useImpersonation } from "@/lib/auth/useImpersonation";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Admin yerine geç oturumunda en üstte gösterilen şerit.
 * Responsive: mobilde "Yöneticiye Dön" buton metni gizlenir, ikon kalır.
 * Görsel kaynağı (avatar baş harfleri) için yalnızca user/admin DTO'ları kullanır;
 * görüntü için ek API çağrısı yok (DRY).
 */
export function ImpersonationBanner() {
  const { user, impersonatedBy, isImpersonating } = useAuth();
  const { stop, pending } = useImpersonation();

  if (!isImpersonating || !user || !impersonatedBy) return null;

  const targetLabel = user.fullName?.trim() || user.username;
  const adminLabel = impersonatedBy.fullName?.trim() || impersonatedBy.username;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-16 z-40 w-full border-y border-amber-200/80 bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
    >
      <div className="mx-auto flex max-w-full items-center justify-between gap-3 px-3 py-2 sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-700 ring-1 ring-amber-300/60"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3 5 6v6c0 4.6 2.9 7.8 7 9 4.1-1.2 7-4.4 7-9V6z" />
              <path d="M12 8v5" />
              <circle cx="12" cy="16" r="0.8" fill="currentColor" />
            </svg>
          </span>
          <div className="flex shrink-0 -space-x-2" aria-hidden>
            <Avatar label={adminLabel} tone="indigo" />
            <Avatar label={targetLabel} tone="amber" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-amber-900 sm:text-[15px]">
              Şu an <span className="font-semibold">{targetLabel}</span>{" "}
              <span className="hidden sm:inline">adına işlem yapıyorsun</span>
              <span className="sm:hidden">adına işlemdesin</span>
            </p>
            <p className="truncate text-[11px] leading-4 text-amber-700/90 sm:text-xs">
              Audit: <span className="font-medium">{adminLabel}</span>{" "}
              <span aria-hidden>→</span> <span className="font-medium">{targetLabel}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void stop()}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50 disabled:opacity-60 sm:px-4 sm:py-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">{pending ? "Dönülüyor…" : "Yöneticiye Dön"}</span>
          <span className="sm:hidden sr-only">Yöneticiye Dön</span>
        </button>
      </div>
    </div>
  );
}

function Avatar({ label, tone }: { label: string; tone: "indigo" | "amber" }) {
  const initials = label
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  const toneClass =
    tone === "indigo"
      ? "bg-indigo-500 text-white ring-white"
      : "bg-amber-500 text-white ring-white";
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ${toneClass}`}
    >
      {initials}
    </span>
  );
}
