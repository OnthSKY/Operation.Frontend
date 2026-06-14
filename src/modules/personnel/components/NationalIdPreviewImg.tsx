"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Modal } from "@/shared/ui/Modal";

/** Mime tipinden uzantı çıkarır; bilinmeyenlerde varsayılan `jpg`. */
export function nationalIdFileExt(mime: string): string {
  const s = mime.toLowerCase();
  if (s.includes("png")) return "png";
  if (s.includes("jpeg") || s.includes("jpg")) return "jpg";
  if (s.includes("webp")) return "webp";
  if (s.includes("gif")) return "gif";
  return "jpg";
}

function IconNationalIdDownload({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function IconNationalIdExpand({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  );
}

const nationalIdIconBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:pointer-events-none disabled:opacity-40";

/**
 * Kimlik kart fotoğrafı önizlemesi: küçük resim + büyüt + indir + lightbox.
 * `href` null/empty ise sadece `emptyLabel` döner.
 */
export function NationalIdPreviewImg({
  href,
  emptyLabel,
  loadingLabel,
  fileBaseName,
  lightboxTitle,
  enlargeLabel,
  downloadLabel,
  closeLabel,
}: {
  href: string | null;
  emptyLabel: string;
  loadingLabel: string;
  fileBaseName: string;
  lightboxTitle: string;
  enlargeLabel: string;
  downloadLabel: string;
  closeLabel: string;
}) {
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxTitleId = useId();

  useEffect(() => {
    if (!href) {
      return;
    }
    setImageReady(false);
    setImageFailed(false);
  }, [href]);

  const runDownload = useCallback(() => {
    if (!href) return;
    const ext = nationalIdFileExt("");
    const a = document.createElement("a");
    a.href = href;
    a.download = `${fileBaseName}.${ext}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [fileBaseName, href]);

  if (!href) {
    return <span className="text-xs text-zinc-500">{emptyLabel}</span>;
  }
  if (imageFailed) {
    return <span className="text-xs text-zinc-500">{emptyLabel}</span>;
  }

  return (
    <>
      <div className="w-full max-w-[18rem]">
        <div className="mb-1 flex justify-end gap-1">
          <button
            type="button"
            className={nationalIdIconBtn}
            aria-label={enlargeLabel}
            onClick={() => setLightboxOpen(true)}
          >
            <IconNationalIdExpand className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={nationalIdIconBtn}
            aria-label={downloadLabel}
            onClick={runDownload}
          >
            <IconNationalIdDownload className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="block w-full cursor-zoom-in rounded-lg border border-zinc-200 p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          aria-label={enlargeLabel}
          onClick={() => setLightboxOpen(true)}
        >
          {!imageReady ? (
            <span className="block px-3 py-6 text-center text-xs text-zinc-400">
              {loadingLabel}
            </span>
          ) : null}
          <img
            src={href}
            alt=""
            decoding="async"
            onLoad={() => setImageReady(true)}
            onError={() => setImageFailed(true)}
            className={cn(
              "max-h-52 w-full rounded-lg object-contain",
              !imageReady && "hidden",
            )}
          />
        </button>
      </div>
      <Modal
        nested
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        titleId={lightboxTitleId}
        title={lightboxTitle}
        closeButtonLabel={closeLabel}
        wide
        className="!max-w-[min(100vw-1rem,56rem)]"
      >
        <div className="flex justify-center px-4 pb-6 pt-2 sm:px-6 sm:pb-8">
          <img
            src={href}
            alt=""
            decoding="async"
            className="max-h-[min(85dvh,48rem)] w-auto max-w-full object-contain"
          />
        </div>
      </Modal>
    </>
  );
}
