"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Switch } from "@/shared/ui/Switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { UndoIcon } from "@/shared/ui/EyeIcon";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";

/**
 * Genel gider havuzunu (pool) geri alma onay modal'ı.
 * Backend tarafından dönen "reverse preview" satırlarını gösterir; risk varsa
 * onay anahtarı (Switch) zorunlu olur.
 *
 * SRP: sunum + onay. Veri ve handler'lar dışarıdan gelir.
 */
type ReversePreviewLine = {
  branchId: number;
  branchName: string;
  branchTransactionId: number | null;
  branchTransactionAlreadyRemoved: boolean;
  amount: number;
  currencyCode: string;
  hasOpenTourismSeasonOnExpenseDate: boolean;
  expensePaymentSource: string;
};
type ReversePreviewData = {
  expenseDate: string;
  title: string;
  risksRequireAcknowledgement: boolean;
  lines: ReversePreviewLine[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  poolId: number | null;
  preview: {
    isPending: boolean;
    isError: boolean;
    error?: unknown;
    data?: ReversePreviewData;
  };
  reverseAck: boolean;
  setReverseAck: (v: boolean) => void;
  saving: boolean;
  onConfirm: () => void;
  /** Lokal "tr" | "en" tabanlı tarih biçimi. */
  loc: "tr" | "en";
  /** Tutar formatlama locale'i (tr-TR/en-GB). */
  locale: "tr" | "en";
  expensePaySourceLabel: (src: string, t: (k: string) => string) => string;
  apiErrMsg: (e: unknown) => string;
};

export function GohReverseConfirmModal(p: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={p.open}
      onClose={() => {
        if (!p.saving) p.onClose();
      }}
      titleId="goh-reverse"
      title={t("generalOverhead.reverseModalTitle")}
      wide
      closeButtonLabel={t("common.close")}
    >
      {p.poolId != null ? (
        <div className="flex flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-6">
          {p.preview.isPending ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : p.preview.isError ? (
            <p className="text-sm text-red-600">{p.apiErrMsg(p.preview.error)}</p>
          ) : p.preview.data ? (
            <>
              <p className="text-sm text-zinc-700">{t("generalOverhead.reverseModalIntro")}</p>
              <p className="text-xs text-zinc-500">
                {t("generalOverhead.colDate")}: {formatLocaleDate(p.preview.data.expenseDate, p.loc)}
                {" · "}
                <span className="font-medium text-zinc-800">{p.preview.data.title}</span>
              </p>
              {p.preview.data.risksRequireAcknowledgement ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950">
                  {t("generalOverhead.reverseRiskNotice")}
                </div>
              ) : null}
              <div className="overflow-x-auto rounded-xl border border-zinc-200/90">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("generalOverhead.reverseColBranch")}</TableHeader>
                      <TableHeader className="text-end">{t("generalOverhead.reverseColAmount")}</TableHeader>
                      <TableHeader>{t("generalOverhead.reverseColSeason")}</TableHeader>
                      <TableHeader>{t("generalOverhead.reverseColPayment")}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {p.preview.data.lines.map((row) => (
                      <TableRow key={`${row.branchId}-${row.currencyCode}-${row.branchTransactionId}`}>
                        <TableCell className="text-sm" dataLabel={t("generalOverhead.reverseColBranch")}>
                          {row.branchName}
                        </TableCell>
                        <TableCell
                          className="text-end text-sm tabular-nums"
                          dataLabel={t("generalOverhead.reverseColAmount")}
                        >
                          {formatLocaleAmount(row.amount, p.locale, row.currencyCode)}
                        </TableCell>
                        <TableCell className="text-sm" dataLabel={t("generalOverhead.reverseColSeason")}>
                          {row.branchTransactionAlreadyRemoved ? (
                            <span className="text-zinc-500">{t("generalOverhead.reverseRowRemoved")}</span>
                          ) : row.hasOpenTourismSeasonOnExpenseDate ? (
                            <span className="text-emerald-800">{t("generalOverhead.reverseSeasonOpen")}</span>
                          ) : (
                            <span className="text-amber-900">{t("generalOverhead.reverseSeasonClosed")}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm" dataLabel={t("generalOverhead.reverseColPayment")}>
                          {row.branchTransactionAlreadyRemoved
                            ? "—"
                            : p.expensePaySourceLabel(row.expensePaymentSource, t)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {p.preview.data.risksRequireAcknowledgement ? (
                <label className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 sm:p-4">
                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-800">
                    {t("generalOverhead.reverseAckSwitch")}
                  </span>
                  <Switch
                    checked={p.reverseAck}
                    onCheckedChange={p.setReverseAck}
                    disabled={p.saving}
                    className="shrink-0"
                    aria-label={t("generalOverhead.reverseAckSwitch")}
                  />
                </label>
              ) : null}
              <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto"
                  disabled={p.saving}
                  onClick={p.onClose}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 sm:min-h-10 sm:w-auto"
                  disabled={p.saving || p.preview.isPending}
                  onClick={p.onConfirm}
                >
                  <UndoIcon className="h-5 w-5 shrink-0 opacity-90" />
                  <span>{t("generalOverhead.reverseConfirm")}</span>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500">{t("common.retry")}</p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
