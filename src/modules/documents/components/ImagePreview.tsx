"use client";

import { useState, type ReactNode } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useI18n } from "@/i18n/context";
import { HeicImage, isHeicSource } from "./HeicImage";

/**
 * Belge önizleme alanı için zoom + pan + rotation desteği olan görsel kapsayıcı.
 *
 *  - Pinch (mobil), wheel (desktop), buton ile zoom (0.5x – 6x).
 *  - 90°'lik adımlarla rotate (telefon EXIF düzeltmesi için).
 *  - HEIC dosyaları otomatik convert edilir (HeicImage delege eder).
 *  - Kontroller sağ üstte compact, mobil dokunulabilir.
 */
export type ImagePreviewProps = {
  url: string;
  alt: string;
  mimeType?: string | null;
  className?: string;
};

export function ImagePreview({ url, alt, mimeType, className }: ImagePreviewProps) {
  const { t } = useI18n();
  const [rotation, setRotation] = useState(0);
  const heic = isHeicSource({ url, mimeType });

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 ${className ?? ""}`}>
      <TransformWrapper
        minScale={0.5}
        maxScale={6}
        doubleClick={{ mode: "toggle", step: 1.6 }}
        wheel={{ step: 0.15 }}
        pinch={{ step: 5 }}
        limitToBounds
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <ControlsBar
              onZoomIn={() => zoomIn()}
              onZoomOut={() => zoomOut()}
              onReset={() => {
                resetTransform();
                setRotation(0);
              }}
              onRotate={() => setRotation((r) => (r + 90) % 360)}
              labelZoomIn={t("documents.previewZoomIn")}
              labelZoomOut={t("documents.previewZoomOut")}
              labelReset={t("documents.previewReset")}
              labelRotate={t("documents.previewRotate")}
            />
            <TransformComponent
              wrapperClass="!h-full !w-full"
              contentClass="!h-full !w-full"
            >
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.18s ease-out" }}
              >
                {heic ? (
                  <HeicImage url={url} alt={alt} className="h-full w-full" />
                ) : (
                  // Authenticated API preview URL; next/image not applicable
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={alt}
                    draggable={false}
                    className="h-full w-full select-none object-contain [image-orientation:from-image]"
                  />
                )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

function ControlsBar({
  onZoomIn,
  onZoomOut,
  onReset,
  onRotate,
  labelZoomIn,
  labelZoomOut,
  labelReset,
  labelRotate,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onRotate: () => void;
  labelZoomIn: string;
  labelZoomOut: string;
  labelReset: string;
  labelRotate: string;
}) {
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-10 flex flex-col gap-1 sm:right-3 sm:top-3">
      <CtrlBtn onClick={onZoomIn} label={labelZoomIn}>
        <IconPlus />
      </CtrlBtn>
      <CtrlBtn onClick={onZoomOut} label={labelZoomOut}>
        <IconMinus />
      </CtrlBtn>
      <CtrlBtn onClick={onRotate} label={labelRotate}>
        <IconRotate />
      </CtrlBtn>
      <CtrlBtn onClick={onReset} label={labelReset}>
        <IconReset />
      </CtrlBtn>
    </div>
  );
}

function CtrlBtn({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-violet-500"
    >
      {children}
    </button>
  );
}

const SVG_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconPlus() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
function IconMinus() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M5 12h14" />
    </svg>
  );
}
function IconRotate() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
function IconReset() {
  return (
    <svg {...SVG_PROPS}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
