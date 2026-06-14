"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type {
  SupplierInvoiceDetail,
  SupplierInvoiceLineBranchAllocationsState,
} from "@/modules/suppliers/api/suppliers-api";

/**
 * Fatura detayı modal'ı: hero (genel bilgi) + audit + kalemler (mobil kart + desktop tablo).
 *
 * Kalem aksiyonları (allocation aç / shares göster) callback olarak gelir.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  invoice: SupplierInvoiceDetail | null | undefined;
  loading: boolean;

  locale: "tr" | "en";

  /** Detail hero + audit alt component'leri için. */
  HeroComponent: React.ComponentType<{
    invoice: SupplierInvoiceDetail;
    locale: "tr" | "en";
    t: (k: string) => string;
    onPreviewInvoicePhoto?: () => void;
  }>;
  AuditComponent: React.ComponentType<{
    invoiceId: number;
    locale: "tr" | "en";
    t: (k: string) => string;
  }>;

  lineAllocByLineId: Map<number, SupplierInvoiceLineBranchAllocationsState>;
  hasInvoiceLineBranchShares: (s: SupplierInvoiceLineBranchAllocationsState | undefined) => boolean;

  onPreviewInvoicePhoto: (inv: SupplierInvoiceDetail) => void;
  onOpenEdit: () => void;
  onOpenAllocation: (lineId: number) => void;
  onOpenBranchSharesDrawer: (lineId: number) => void;
};

export function SupplierInvoiceDetailModal(p: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={p.open}
      onClose={p.onClose}
      titleId="inv-view-title"
      title={t("suppliers.invoiceDetail")}
      wide
      wideFixedHeight
    >
      {p.loading || !p.invoice ? (
        <p className="p-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : (
        <div className="max-h-[min(92dvh,72rem)] overflow-y-auto p-2 sm:p-3">
          <p.HeroComponent
            invoice={p.invoice}
            locale={p.locale}
            t={t}
            onPreviewInvoicePhoto={
              p.invoice.hasInvoicePhoto ? () => p.onPreviewInvoicePhoto(p.invoice!) : undefined
            }
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="min-h-10" onClick={p.onOpenEdit}>
              {t("suppliers.invoiceEdit")}
            </Button>
          </div>
          <p.AuditComponent invoiceId={p.invoice.id} locale={p.locale} t={t} />

          <div className="mt-5 flex flex-col gap-4 lg:hidden">
            {p.invoice.lines.map((l) => {
              const stockLinked =
                (l.warehouseMovementId != null && l.warehouseMovementId > 0) ||
                (l.receiveBranchId != null && l.receiveBranchId > 0);
              const allocState = p.lineAllocByLineId.get(l.id);
              const hasShares = !stockLinked && p.hasInvoiceLineBranchShares(allocState);
              return (
                <MobileListCard key={l.id} as="div" className="flex flex-col gap-3 bg-zinc-50/50">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-zinc-400">#{l.lineNo}</p>
                      <p className="mt-0.5 break-words font-medium text-zinc-900">
                        {l.description ?? l.productName ?? "—"}
                      </p>
                      {l.warehouseMovementId ? (
                        <p className="mt-1 text-xs text-zinc-500">WM #{l.warehouseMovementId}</p>
                      ) : null}
                      {l.receiveBranchName ? (
                        <p className="mt-1 break-words text-xs text-zinc-500">
                          {t("suppliers.receiveBranchLabel")}: {l.receiveBranchName}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-base font-semibold tabular-nums text-zinc-900">
                      {formatLocaleAmount(l.lineAmount, p.locale, p.invoice!.currencyCode)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    {stockLinked ? (
                      <p className="text-xs text-zinc-500">{t("suppliers.allocNarrowHint")}</p>
                    ) : hasShares ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 w-full"
                        onClick={() => p.onOpenBranchSharesDrawer(l.id)}
                      >
                        {t("suppliers.invoiceLineBranchSharesShow")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 w-full"
                        onClick={() => p.onOpenAllocation(l.id)}
                      >
                        {t("suppliers.allocOpen")}
                      </Button>
                    )}
                  </div>
                </MobileListCard>
              );
            })}
          </div>

          <div className="mt-4 hidden overflow-x-auto sm:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>#</TableHeader>
                  <TableHeader>{t("suppliers.lineDescription")}</TableHeader>
                  <TableHeader className="text-right">{t("suppliers.lineAmount")}</TableHeader>
                  <TableHeader className="text-right whitespace-nowrap">
                    {t("common.actions")}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {p.invoice.lines.map((l) => {
                  const stockLinked =
                    (l.warehouseMovementId != null && l.warehouseMovementId > 0) ||
                    (l.receiveBranchId != null && l.receiveBranchId > 0);
                  const allocState = p.lineAllocByLineId.get(l.id);
                  const hasShares = !stockLinked && p.hasInvoiceLineBranchShares(allocState);
                  return (
                    <TableRow key={l.id}>
                      <TableCell dataLabel="#">{l.lineNo}</TableCell>
                      <TableCell dataLabel={t("suppliers.lineDescription")}>
                        <div className="text-zinc-900">{l.description ?? l.productName ?? "—"}</div>
                        {l.warehouseMovementId ? (
                          <div className="text-xs text-zinc-500">WM #{l.warehouseMovementId}</div>
                        ) : null}
                        {l.receiveBranchName ? (
                          <div className="text-xs text-zinc-500">
                            {t("suppliers.receiveBranchLabel")}: {l.receiveBranchName}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell
                        dataLabel={t("suppliers.lineAmount")}
                        className="text-right tabular-nums"
                      >
                        {formatLocaleAmount(l.lineAmount, p.locale, p.invoice!.currencyCode)}
                      </TableCell>
                      <TableCell dataLabel={t("common.actions")} className="text-right">
                        {stockLinked ? (
                          <span className="text-xs text-zinc-400">{t("suppliers.allocNarrowHint")}</span>
                        ) : hasShares ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-9 whitespace-nowrap"
                            onClick={() => p.onOpenBranchSharesDrawer(l.id)}
                          >
                            {t("suppliers.invoiceLineBranchSharesShow")}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-9 whitespace-nowrap"
                            onClick={() => p.onOpenAllocation(l.id)}
                          >
                            {t("suppliers.allocOpen")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </Modal>
  );
}
