"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type TablePaginationProps = {
  /** 1-tabanlı geçerli sayfa. */
  page: number;
  /** Sayfa başına kayıt. */
  pageSize: number;
  /** Filtre uygulanmış toplam kayıt sayısı. */
  totalCount: number;
  /** Yeni (1-tabanlı, sınırlanmış) sayfayı döndürür. */
  onPageChange: (page: number) => void;
  /** Yükleme vb. sırasında ileri/geri butonlarını kilitler. */
  disabled?: boolean;
  className?: string;
};

/**
 * Liste/tablo ekranları için ortak sayfalama çubuğu.
 * Sol: kayıt aralığı + toplam kayıt. Orta: «Sayfa X / Y» göstergesi. İkonlu önceki/sonraki butonları.
 * `totalCount <= 0` ise hiçbir şey çizmez.
 */
export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled = false,
  className,
}: TablePaginationProps) {
  const { t } = useI18n();
  if (totalCount <= 0 || pageSize <= 0) return null;

  const pageTotal = Math.max(1, Math.ceil(totalCount / pageSize));
  const current = Math.min(Math.max(1, page), pageTotal);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, totalCount);
  const multiPage = pageTotal > 1;

  // Tek sayfada sadece toplam kayıt; çok sayfada "aralık · toplam" göster.
  const recordSummary = multiPage
    ? t("products.pagingRecordSummary")
        .replace("{{from}}", String(from))
        .replace("{{to}}", String(to))
        .replace("{{total}}", String(totalCount))
    : t("products.pagingTotalRecords").replace("{{total}}", String(totalCount));
  const pageLabel = t("products.pagingPageOf")
    .replace("{{page}}", String(current))
    .replace("{{total}}", String(pageTotal));

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-zinc-100 pt-3",
        multiPage ? "sm:flex-row sm:items-center sm:justify-between" : "",
        className
      )}
    >
      <p className="text-sm text-zinc-600">{recordSummary}</p>
      {/* Tek sayfada ileri/geri ve "Sayfa 1/1" göstergesi gereksiz; gizle. */}
      {multiPage ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-11 min-h-11 min-w-11 shrink-0 px-0"
            aria-label={t("products.pagingPrev")}
            title={t("products.pagingPrev")}
            disabled={disabled || current <= 1}
            onClick={() => onPageChange(Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Button>
          <span className="min-w-[6rem] text-center text-sm tabular-nums text-zinc-700">
            {pageLabel}
          </span>
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-11 min-h-11 min-w-11 shrink-0 px-0"
            aria-label={t("products.pagingNext")}
            title={t("products.pagingNext")}
            disabled={disabled || current >= pageTotal}
            onClick={() => onPageChange(Math.min(pageTotal, current + 1))}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
