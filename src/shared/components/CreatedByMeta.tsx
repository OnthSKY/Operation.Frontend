"use client";

import type { Locale } from "@/i18n/messages";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Audit «yazan kişi» göstergesi: baş harf avatarı + isim (üst) ve tarih/saat (alt).
 * `compact` (kart alanı / mobil) avatarı gizler ve metni sağa istifler.
 * Avans ve gider kart/tablolarının tamamı paylaşır.
 */
export function CreatedByMeta({
  row,
  locale,
  dash,
  compact = false,
}: {
  row: { createdByName?: string | null; createdAt?: string | null };
  locale: Locale;
  dash: string;
  compact?: boolean;
}) {
  const name = row.createdByName?.trim() || "";
  const at = row.createdAt?.trim() || "";

  if (!name && !at) {
    return <span className="text-sm text-zinc-400">{dash}</span>;
  }

  const timeEl = at ? (
    <span className="text-[11px] tabular-nums text-zinc-400">
      {formatLocaleDateTime(at, locale)}
    </span>
  ) : null;

  if (compact) {
    return (
      <span className="flex min-w-0 flex-col items-end leading-tight">
        <span className="truncate text-sm font-medium capitalize text-zinc-800">
          {name || dash}
        </span>
        {timeEl}
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 text-[10px] font-semibold uppercase tracking-tight text-zinc-600 ring-1 ring-inset ring-zinc-200"
      >
        {name ? initialsOf(name) : "?"}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium capitalize text-zinc-800">
          {name || dash}
        </span>
        {timeEl}
      </span>
    </span>
  );
}
