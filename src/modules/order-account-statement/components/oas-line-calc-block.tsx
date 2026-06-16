import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import type { Locale } from "@/i18n/messages";
import { computeSuggestedLineTotal } from "@/modules/order-account-statement/lib/suggested-line-total";
import { formatLocaleAmount, formatLocaleAmountInput } from "@/shared/lib/locale-amount";
import { cn } from "@/lib/cn";
import type { LineDraft } from "@/modules/order-account-statement/components/oas-types";

/**
 * Satır için öneri etiketi + auto-apply yan etkisi.
 *
 * Dual mode (piece/kg) ve calc modal'ı kaldırıldı — birim/miktar/birim fiyat
 * zaten satırın kendisinde inline düzenleniyor. Burada kalan tek iş:
 *  - `quantityText × unitPriceText` öneri hesaplaması,
 *  - kullanıcı `amount`'a dokunmadıysa öneri sessizce yazılır,
 *  - kullanıcıya bilgi olsun diye küçük bir "Önerilen tutar: X" satırı gösterilir.
 *
 * Görsel ve etkileşim olarak minimal — kullanıcı zaten tutar alanını
 * görüyor, bu blok sadece "biz qty*price'tan X buluyoruz" şeffaflığı için.
 */
export function LineCalcBlock({
  line,
  locale,
  t,
  setLines,
  className,
  compact,
  ultraCompact,
}: {
  line: LineDraft;
  locale: Locale;
  t: (key: string) => string;
  setLines: Dispatch<SetStateAction<LineDraft[]>>;
  className?: string;
  compact?: boolean;
  ultraCompact?: boolean;
}) {
  const suggestion = useMemo(
    () =>
      computeSuggestedLineTotal(
        { quantityText: line.quantityText, unitPriceText: line.unitPriceText },
        locale
      ),
    [line.quantityText, line.unitPriceText, locale]
  );

  // Auto-apply: kullanıcı tutar alanına dokunmadıysa öneri değiştikçe sessizce yaz.
  useEffect(() => {
    if (line.amountTouched) return;
    if (suggestion == null || !Number.isFinite(suggestion)) return;
    const next = formatLocaleAmountInput(suggestion, locale);
    if (line.amountText === next && line.amount === suggestion) return;
    setLines((prev) =>
      prev.map((x) =>
        x.id === line.id && !x.amountTouched
          ? { ...x, amount: suggestion, amountText: next }
          : x
      )
    );
  }, [suggestion, line.amountTouched, line.amountText, line.amount, line.id, locale, setLines]);

  if (suggestion == null) return null;

  const u = Boolean(ultraCompact);
  const c = Boolean(compact);
  return (
    <p
      className={cn(
        "text-zinc-500",
        u ? "text-[8px]" : c ? "text-[9px]" : "text-[10px]",
        className
      )}
    >
      {t("reports.orderAccountStatementSuggestedTotal")}: {formatLocaleAmount(suggestion, locale, "TRY")}
    </p>
  );
}
