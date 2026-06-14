"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import { Tooltip } from "@/shared/ui/Tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { Pencil as PencilIcon } from "lucide-react";
import { SupplierInvoicePhotoField } from "@/modules/suppliers/components/SupplierInvoicePhotoField";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { InvoiceLineDraft } from "@/modules/suppliers/components/invoices/SupplierInvoiceLineEditorModal";

export type InvCreateFormErrors = Partial<{
  supplier: string;
  documentDate: string;
  lines: string;
  whChecked: string;
  whApproved: string;
}>;

/**
 * Yeni tedarikçi faturası oluşturma modal'ı. Kalem tablosu, tedarikçi seçimi,
 * fotoğraf yükleme, depo personel onay alanları ve toplam özetinden oluşur.
 *
 * SRP: sunum. State + handler'lar dışarıdan gelir.
 */
type Props = {
  open: boolean;
  onClose: () => void;

  // Header alanları
  invSupplierPick: number | "";
  setInvSupplierPick: React.Dispatch<React.SetStateAction<number | "">>;
  invoiceSupplierOptions: SelectOption[];
  whPersonnelSelectOptions: SelectOption[];

  /** Kalem satırlarını okunabilir hücrelere çeviren render helper'ları. */
  invDraftProductCell: (line: InvoiceLineDraft) => React.ReactNode;
  invDraftReceiveSummary: (line: InvoiceLineDraft) => React.ReactNode;
  invDraftAmountCell: (line: InvoiceLineDraft) => React.ReactNode;

  /** Boş satır üretir; orchestrator'dan emptyLine() iletilir. */
  emptyLine: () => InvoiceLineDraft;
  setInvLineEditDraft: React.Dispatch<React.SetStateAction<InvoiceLineDraft | null>>;
  setInvLineEditKey: React.Dispatch<React.SetStateAction<string | null>>;

  invDocNo: string;
  setInvDocNo: (v: string) => void;
  invDocDate: string;
  setInvDocDate: (v: string) => void;
  invDue: string;
  setInvDue: (v: string) => void;
  invDesc: string;
  setInvDesc: (v: string) => void;
  invCur: string;
  setInvCur: (v: string) => void;

  invPaymentMarked: boolean;
  setInvPaymentMarked: (v: boolean) => void;
  invFormalIssued: boolean;
  setInvFormalIssued: (v: boolean) => void;

  // Kalemler
  invLines: InvoiceLineDraft[];
  setInvLines: React.Dispatch<React.SetStateAction<InvoiceLineDraft[]>>;
  invCreateFieldErrors: InvCreateFormErrors;

  openInvLineEditor: (key: string) => void;
  invNeedsWhPersonnel: boolean;

  invWhCheckedBy: string;
  setInvWhCheckedBy: (v: string) => void;
  invWhApprovedBy: string;
  setInvWhApprovedBy: (v: string) => void;

  invPhotoFile: File | null;
  setInvPhotoFile: (f: File | null) => void;

  busy: boolean;
  saveInvoice: () => void;

  locale: "tr" | "en";
};

export function SupplierInvoiceCreateModal(p: Props) {
  const { t } = useI18n();
  // Aliasing — orchestrator'dan kopyalanan JSX değişken adlarıyla uyumlu olsun.
  const {
    open: invOpen,
    onClose: requestCloseCreateInvoiceModal,
    invSupplierPick,
    setInvSupplierPick,
    invoiceSupplierOptions,
    whPersonnelSelectOptions,
    invDraftProductCell,
    invDraftReceiveSummary,
    invDraftAmountCell,
    emptyLine,
    setInvLineEditDraft,
    setInvLineEditKey,
    invDocNo,
    setInvDocNo,
    invDocDate,
    setInvDocDate,
    invDue,
    setInvDue,
    invDesc,
    setInvDesc,
    invCur,
    setInvCur,
    invPaymentMarked,
    setInvPaymentMarked,
    invFormalIssued,
    setInvFormalIssued,
    invLines,
    setInvLines,
    invCreateFieldErrors,
    openInvLineEditor,
    invNeedsWhPersonnel,
    invWhCheckedBy,
    setInvWhCheckedBy,
    invWhApprovedBy,
    setInvWhApprovedBy,
    invPhotoFile,
    setInvPhotoFile,
    busy,
    saveInvoice,
    locale,
  } = p;
  // Satır numaralandırması için index referansı (orchestrator'da invLines.findIndex idi).
  const lineIdx = (key: string) => invLines.findIndex((l) => l.key === key);
  // createInv.isPending placeholder — busy prop'una eşlenir.
  const createInv = { isPending: busy } as const;

  return (
<Modal
  open={invOpen}
  onClose={requestCloseCreateInvoiceModal}
  titleId="inv-create-title"
  title={t("suppliers.newInvoice")}
  wide
  wideFixedHeight
  closeButtonLabel={t("common.close")}
>
  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-0 sm:px-5 sm:pb-4">
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
      <div className="flex min-w-0 flex-col gap-3 pr-0.5 pt-1">
        <p className="text-xs leading-snug text-zinc-500">{t("suppliers.intakeFormHint")}</p>
        {Object.values(invCreateFieldErrors).some((v) => v != null && String(v).trim() !== "") ? (
          <div
            className="rounded-xl border border-red-300 bg-white px-3 py-2.5 text-sm text-red-900 shadow-sm"
            role="alert"
          >
            <p className="font-semibold leading-snug">{t("common.formFillRequiredSummary")}</p>
          </div>
        ) : null}
        <Select
          name="invSupplierPick"
          label={t("suppliers.name")}
          labelRequired
          options={invoiceSupplierOptions}
          value={invSupplierPick === "" ? "" : String(invSupplierPick)}
          onChange={(e) => setInvSupplierPick(e.target.value === "" ? "" : Number(e.target.value))}
          onBlur={() => {}}
          error={invCreateFieldErrors.supplier}
          className="min-h-12 text-base sm:min-h-10 sm:text-sm"
        />
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label={t("suppliers.documentNumber")} value={invDocNo} onChange={(e) => setInvDocNo(e.target.value)} />
          <DateField
            label={t("suppliers.documentDate")}
            labelRequired
            value={invDocDate}
            onChange={(e) => setInvDocDate(e.target.value)}
            error={invCreateFieldErrors.documentDate}
          />
          <DateField label={t("suppliers.dueDate")} value={invDue} onChange={(e) => setInvDue(e.target.value)} />
          <Input label={t("suppliers.currency")} value={invCur} onChange={(e) => setInvCur(e.target.value)} />
        </div>
        <p className="text-xs leading-snug text-zinc-500">{t("suppliers.documentNumberHint")}</p>
        <Input label={t("suppliers.description")} value={invDesc} onChange={(e) => setInvDesc(e.target.value)} />
        <div className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-2 sm:p-4">
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800">{t("suppliers.invoicePaymentMarked")}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{t("suppliers.invoicePaymentMarkedHint")}</p>
            </div>
            <Switch checked={invPaymentMarked} onCheckedChange={setInvPaymentMarked} />
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800">{t("suppliers.invoiceFormalIssued")}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{t("suppliers.invoiceFormalIssuedHint")}</p>
            </div>
            <Switch checked={invFormalIssued} onCheckedChange={setInvFormalIssued} />
          </div>
        </div>
        <SupplierInvoicePhotoField
          invoiceId={null}
          hasInvoicePhoto={false}
          file={invPhotoFile}
          clearRequested={false}
          busy={busy}
          onFileChange={setInvPhotoFile}
          onClearRequest={() => setInvPhotoFile(null)}
          t={t}
        />
        {invNeedsWhPersonnel ? (
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/50 p-3 sm:p-4">
            <p className="text-sm font-semibold text-zinc-800">{t("suppliers.whIntakePersonnelSection")}</p>
            <p className="mt-1 text-xs text-zinc-600">{t("suppliers.whIntakePersonnelHint")}</p>
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                name="invWhCheckedBy"
                label={t("warehouse.checkedByPersonnel")}
                labelRequired
                options={whPersonnelSelectOptions}
                value={invWhCheckedBy}
                onChange={(e) => setInvWhCheckedBy(e.target.value)}
                onBlur={() => {}}
                error={invCreateFieldErrors.whChecked}
                className="min-h-12 text-base sm:min-h-10 sm:text-sm"
              />
              <Select
                name="invWhApprovedBy"
                label={t("warehouse.approvedByPersonnel")}
                labelRequired
                options={whPersonnelSelectOptions}
                value={invWhApprovedBy}
                onChange={(e) => setInvWhApprovedBy(e.target.value)}
                onBlur={() => {}}
                error={invCreateFieldErrors.whApproved}
                className="min-h-12 text-base sm:min-h-10 sm:text-sm"
              />
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
            invCreateFieldErrors.lines &&
              "rounded-xl border border-red-300 p-3 sm:items-start sm:justify-between"
          )}
        >
          <div className="min-w-0">
            {invCreateFieldErrors.lines ? (
              <p className="text-sm font-medium text-red-700">{invCreateFieldErrors.lines}</p>
            ) : null}
            <p className="text-sm font-semibold text-zinc-800">{t("suppliers.lines")}</p>
            <p className="mt-1 text-xs leading-snug text-zinc-500">{t("suppliers.invoiceLinesSectionHint")}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full shrink-0 sm:min-h-9 sm:w-auto"
            onClick={() => {
              const nl = emptyLine();
              setInvLines((r) => [...r, nl]);
              setInvLineEditDraft({ ...nl });
              setInvLineEditKey(nl.key);
            }}
          >
            {t("suppliers.addLine")}
          </Button>
        </div>
        <div className="flex flex-col gap-4 lg:hidden">
          {invLines.map((line, idx) => (
            <MobileListCard
              key={line.key}
              as="div"
              role="button"
              tabIndex={0}
              className="min-w-0 cursor-pointer text-left outline-none ring-violet-500/30 transition hover:border-violet-200 hover:bg-violet-50/20 focus-visible:ring-2"
              onClick={() => openInvLineEditor(line.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openInvLineEditor(line.key);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-zinc-400">#{idx + 1}</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-zinc-900">{invDraftProductCell(line)}</p>
                  <p className="mt-1 text-xs text-zinc-500">{invDraftReceiveSummary(line)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-sm font-semibold tabular-nums text-zinc-900">{invDraftAmountCell(line)}</p>
                  <div className="flex flex-wrap justify-end gap-1">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-zinc-200 text-violet-700 transition hover:bg-violet-50 sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
                      aria-label={t("common.edit")}
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvLineEditor(line.key);
                      }}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {invLines.length > 1 ? (
                      <button
                        type="button"
                        className={cn(trashIconActionButtonClass, "h-9 w-9 min-h-[44px] min-w-[44px] rounded-lg sm:min-h-0 sm:min-w-0")}
                        aria-label={t("suppliers.removeLine")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvLines((rows) => rows.filter((r) => r.key !== line.key));
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </MobileListCard>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-xl border border-zinc-200/90 lg:block">
          <Table>
            <TableHead>
              <TableRow className="bg-zinc-50/90">
                <TableHeader className="w-10 whitespace-nowrap">#</TableHeader>
                <TableHeader>{t("suppliers.product")}</TableHeader>
                <TableHeader className="text-right whitespace-nowrap">{t("suppliers.lineAmount")}</TableHeader>
                <TableHeader className="min-w-[8rem]">{t("suppliers.lineReceiveTarget")}</TableHeader>
                <TableHeader className="w-28 text-right whitespace-nowrap">{t("common.actions")}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {invLines.map((line, idx) => (
                <TableRow
                  key={line.key}
                  className="cursor-pointer transition-colors hover:bg-violet-50/35"
                  onClick={() => openInvLineEditor(line.key)}
                >
                  <TableCell className="align-middle text-xs font-semibold text-zinc-500">{idx + 1}</TableCell>
                  <TableCell
                    className="max-w-[14rem] truncate align-middle text-sm text-zinc-900"
                    title={String(invDraftProductCell(line) ?? "")}
                  >
                    {invDraftProductCell(line)}
                  </TableCell>
                  <TableCell className="align-middle text-right text-sm font-semibold tabular-nums text-zinc-900">
                    {invDraftAmountCell(line)}
                  </TableCell>
                  <TableCell className="align-middle text-xs leading-snug text-zinc-600">
                    {invDraftReceiveSummary(line)}
                  </TableCell>
                  <TableCell className="align-middle text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Tooltip content={t("common.edit")} delayMs={200}>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-violet-700 transition hover:bg-violet-50"
                          aria-label={t("common.edit")}
                          onClick={() => openInvLineEditor(line.key)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      {invLines.length > 1 ? (
                        <Tooltip content={t("suppliers.removeLine")} delayMs={200}>
                          <button
                            type="button"
                            className={cn(trashIconActionButtonClass, "h-9 w-9 rounded-lg")}
                            aria-label={t("suppliers.removeLine")}
                            onClick={() => setInvLines((rows) => rows.filter((r) => r.key !== line.key))}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
    <div className="mt-2 flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white pt-3 sm:flex-row sm:justify-end">
      <Button type="button" variant="secondary" className="min-h-11 w-full sm:min-h-9 sm:w-auto" onClick={requestCloseCreateInvoiceModal}>
        {t("common.cancel")}
      </Button>
      <Button
        type="button"
        className="min-h-11 w-full sm:min-h-9 sm:w-auto"
        onClick={() => void saveInvoice()}
        disabled={createInv.isPending}
      >
        {t("common.save")}
      </Button>
    </div>
  </div>
</Modal>

  );
}
