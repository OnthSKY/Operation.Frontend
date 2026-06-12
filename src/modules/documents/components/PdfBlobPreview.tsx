"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/shared/api/client";
import { useI18n } from "@/i18n/context";

/**
 * Authenticated bir endpoint'ten PDF blob'unu çekip object URL ile iframe'de gösterir.
 *
 * - `iframe src=apiUrl` direkt kullanılırsa: cookie/credentials her zaman geçmez,
 *   iOS Safari ve bazı Android tarayıcılar PDF'i render edemez, dosyayı indirir.
 * - Blob URL pattern: apiFetch ile credentialed çek + URL.createObjectURL ile yerel
 *   object URL üret → iframe her tarayıcıda native PDF viewer ile aç.
 *
 * Skeleton loading + error state dahil.
 */
export type PdfBlobPreviewProps = {
  url: string;
  title: string;
  className?: string;
  loadingLabel?: string;
  errorLabel?: string;
};

export function PdfBlobPreview({
  url,
  title,
  className,
  loadingLabel,
  errorLabel,
}: PdfBlobPreviewProps) {
  const { t } = useI18n();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlobUrl(null);
    setFailed(false);
    (async () => {
      try {
        const res = await apiFetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  const loadingText = loadingLabel ?? t("common.loading");
  const errorText = errorLabel ?? t("documents.previewNotSupported");

  if (failed) {
    return (
      <div className={`flex h-full w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 ${className ?? ""}`}>
        {errorText}
      </div>
    );
  }
  if (!blobUrl) {
    return (
      <div
        className={`relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-4 ${className ?? ""}`}
        role="status"
        aria-live="polite"
        aria-label={loadingText}
      >
        <div className="h-6 w-1/3 animate-pulse rounded bg-zinc-200/80" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200/60" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200/60" />
        <div className="mt-2 h-full w-full animate-pulse rounded bg-gradient-to-b from-zinc-100 to-zinc-200/40" />
        <span className="sr-only">{loadingText}</span>
      </div>
    );
  }
  return <iframe src={blobUrl} title={title} className={className} />;
}
