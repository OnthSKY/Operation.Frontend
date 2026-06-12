"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/context";

/**
 * HEIC/HEIF resmi tarayıcıda render eder.
 *
 * iPhone fotoğrafları çoğunlukla .heic ile gelir; Chrome/Firefox native render edemez.
 * Bu component heic2any kütüphanesini lazy-load eder (~1.2MB WASM dahil), blob'u JPEG'e
 * çevirip object URL üretir. Conversion async olduğu için loading + error state'leri vardır.
 *
 * NOT: Conversion client-side ve CPU yoğun (büyük dosyalarda 1-3 sn). Çok sayıda HEIC
 * görüntülenen hub için backend tarafında libheif convert daha verimli olur — bu
 * component geçici/pragmatik çözüm.
 */
export type HeicImageProps = {
  url: string;
  alt: string;
  className?: string;
};

export function HeicImage({ url, alt, className }: HeicImageProps) {
  const { t } = useI18n();
  const [state, setState] = useState<
    { status: "loading" } | { status: "ok"; objectUrl: string } | { status: "error"; message: string }
  >({ status: "loading" });
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    const run = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HEIC fetch failed: ${response.status}`);
        const blob = await response.blob();
        // Lazy load heic2any — bundle'ı sadece HEIC görüntüleyince yüklensin.
        const heic2anyModule = await import("heic2any");
        const heic2any = heic2anyModule.default;
        const converted = await heic2any({ blob, toType: "image/jpeg", quality: 0.92 });
        const out = Array.isArray(converted) ? converted[0]! : converted;
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(out);
        objectUrlRef.current = objectUrl;
        setState({ status: "ok", objectUrl });
      } catch (e) {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [url]);

  if (state.status === "loading") {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-zinc-50 ${className ?? ""}`}
        role="status"
        aria-live="polite"
      >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200/60" />
        <div className="relative z-10 flex flex-col items-center gap-2 text-xs text-zinc-600">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="animate-spin opacity-70">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="font-medium">{t("documents.heicConverting")}</span>
        </div>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className={`flex items-center justify-center bg-zinc-50 p-3 text-center text-xs text-zinc-600 ${className ?? ""}`}>
        {t("documents.heicConvertFailed")}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={state.objectUrl}
      alt={alt}
      draggable={false}
      className={`pointer-events-none h-full w-full select-none object-contain ${className ?? ""}`}
    />
  );
}

/** URL veya MIME tipinden HEIC/HEIF olup olmadığını tespit eder. */
export function isHeicSource(input: { url?: string; mimeType?: string | null }): boolean {
  const mime = (input.mimeType ?? "").toLowerCase();
  if (mime === "image/heic" || mime === "image/heif" || mime === "image/heic-sequence" || mime === "image/heif-sequence") {
    return true;
  }
  const u = (input.url ?? "").toLowerCase();
  if (/\.heic(\?|#|$)/.test(u) || /\.heif(\?|#|$)/.test(u)) return true;
  return false;
}
