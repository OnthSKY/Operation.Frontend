"use client";

import { useState } from "react";
import type { ContractorPaymentSourceCode } from "@/modules/contractors/api/contractors-api";
import {
  useContractor,
  useDeleteContractorPayment,
  useDeleteContractorWorkEntry,
} from "@/modules/contractors/hooks/useContractorQueries";
import {
  ContractorEntryDialog,
  type ContractorEntryMode,
  type ContractorWorkEntryInitial,
} from "@/modules/contractors/components/ContractorEntryDialog";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass, PencilIcon } from "@/shared/ui/EyeIcon";
import { Modal } from "@/shared/ui/Modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";

type Props = {
  open: boolean;
  contractorId: number | null;
  onClose: () => void;
};

type TabId = "info" | "activity";
type ActivitySub = "work" | "payments";

export function ContractorDetailModal({ open, contractorId, onClose }: Props) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<TabId>("info");
  const [sub, setSub] = useState<ActivitySub>("work");
  const { data, isPending, isError, error } = useContractor(contractorId, open);
  const deleteWork = useDeleteContractorWorkEntry();
  const deletePayment = useDeleteContractorPayment();

  // Paylaşılan giriş dialog'u: iş ekle/düzenle ve ödeme ekle.
  const [entryMode, setEntryMode] = useState<ContractorEntryMode | null>(null);
  const [editWork, setEditWork] = useState<ContractorWorkEntryInitial | null>(null);

  const openAddWork = () => {
    setEditWork(null);
    setEntryMode("work");
  };

  const openEditWork = (w: ContractorWorkEntryInitial) => {
    setEditWork(w);
    setEntryMode("work");
  };

  const openAddPayment = () => {
    setEditWork(null);
    setEntryMode("payment");
  };

  const closeEntry = () => setEntryMode(null);

  // Modal açıldığında / başka kişiye geçildiğinde sekme+dialog'u sıfırla
  // (effect yerine render-aşaması reset — React'in önerdiği desen).
  const instanceKey = open ? String(contractorId ?? 0) : null;
  const [prevKey, setPrevKey] = useState<string | null>(null);
  if (instanceKey !== prevKey) {
    setPrevKey(instanceKey);
    if (open) {
      setTab("info");
      setSub("work");
      setEntryMode(null);
      setEditWork(null);
    }
  }

  const money = (n: number, cur = "TRY") => formatLocaleAmount(n, locale, cur);

  const confirmDeleteWork = (id: number, label: string) =>
    notifyConfirmToast({
      toastId: `contractor-work-delete-${id}`,
      title: t("contractors.confirmDeleteWork"),
      message: <p className="break-words font-medium text-zinc-900">{label}</p>,
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await deleteWork.mutateAsync(id);
          notify.success(t("contractors.toastDeleted"));
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });

  const confirmDeletePayment = (id: number, label: string) =>
    notifyConfirmToast({
      toastId: `contractor-payment-delete-${id}`,
      title: t("contractors.confirmDeletePayment"),
      message: <p className="break-words font-medium text-zinc-900">{label}</p>,
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await deletePayment.mutateAsync(id);
          notify.success(t("contractors.toastDeleted"));
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });

  const sourceLabel = (code: ContractorPaymentSourceCode) => t(`contractors.source.${code}`);
  const c = data?.contractor;

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      titleId="contractor-detail-title"
      title={c ? c.displayName : t("contractors.detailTitle")}
      description={t("contractors.detailDescription")}
      wide
      wideFixedHeight
      wideExpanded
      wideFullScreenMobile
      closeButtonLabel={t("common.close")}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Ana sekmeler */}
        <div
          role="tablist"
          aria-label={t("contractors.detailTitle")}
          className="flex shrink-0 gap-1 border-b border-zinc-200 px-4 sm:px-6"
        >
          <TabButton active={tab === "info"} onClick={() => setTab("info")}>
            {t("contractors.tabInfo")}
          </TabButton>
          <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
            {t("contractors.tabActivity")}
          </TabButton>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6 sm:py-5">
          {isError ? (
            <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
          ) : isPending || !data ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : (
            <>
              {/* Bakiye özeti — her iki sekmede de üstte */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <SummaryBox label={t("contractors.totalWork")} value={money(data.contractor.totalWork)} />
                <SummaryBox label={t("contractors.totalPaid")} value={money(data.contractor.totalPaid)} />
                <SummaryBox
                  label={t("contractors.balance")}
                  value={money(data.contractor.balance)}
                  tone={data.contractor.balance > 0 ? "debt" : "ok"}
                  hint={
                    data.contractor.balance > 0
                      ? t("contractors.weOwe")
                      : data.contractor.balance < 0
                        ? t("contractors.overpaid")
                        : t("contractors.noDebt")
                  }
                />
              </div>

              {tab === "info" ? (
                <section className="mt-5">
                  <h3 className="mb-3 text-sm font-semibold text-zinc-900">{t("contractors.infoSection")}</h3>
                  <dl className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
                    <InfoRow label={t("contractors.name")} value={data.contractor.displayName} />
                    <InfoRow label={t("contractors.phone")} value={data.contractor.phone} empty={t("contractors.fieldEmpty")} />
                    <InfoRow label={t("contractors.nationalId")} value={data.contractor.nationalId} empty={t("contractors.fieldEmpty")} />
                    <InfoRow label={t("contractors.notes")} value={data.contractor.notes} empty={t("contractors.fieldEmpty")} />
                    <InfoRow
                      label={`${t("contractors.workSection")} / ${t("contractors.paymentsSection")}`}
                      value={`${data.contractor.workCount} / ${data.contractor.paymentCount}`}
                    />
                  </dl>
                </section>
              ) : (
                <div className="mt-5">
                  {/* Alt-sekme (segmented) — aynı anda tek liste, mobil uyumlu */}
                  <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 sm:inline-grid sm:w-auto sm:grid-cols-[auto_auto]">
                    <SegButton active={sub === "work"} onClick={() => setSub("work")}>
                      {t("contractors.workSection")}
                      <SegCount>{data.contractor.workCount}</SegCount>
                    </SegButton>
                    <SegButton active={sub === "payments"} onClick={() => setSub("payments")}>
                      {t("contractors.paymentsSection")}
                      <SegCount>{data.contractor.paymentCount}</SegCount>
                    </SegButton>
                  </div>

                  {sub === "work" ? (
                    <section>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900">{t("contractors.workSection")}</h3>
                        <Button type="button" variant="secondary" onClick={openAddWork}>
                          {t("contractors.addWork")}
                        </Button>
                      </div>

                      {data.workEntries.length === 0 ? (
                        <p className="text-sm text-zinc-500">{t("contractors.noWork")}</p>
                      ) : (
                        <>
                        <ul className="flex flex-col gap-2 md:hidden">
                          {data.workEntries.map((w) => (
                            <li
                              key={w.id}
                              className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-500">
                                    <span className="whitespace-nowrap font-medium text-zinc-700">{w.workDate}</span>
                                    <span aria-hidden>·</span>
                                    <span className="truncate">{w.branchName ? w.branchName : t("contractors.general")}</span>
                                  </div>
                                  <p className="mt-0.5 break-words text-sm leading-snug text-zinc-900">
                                    {w.description}
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  {w.amount != null ? (
                                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-900">
                                      {money(w.amount, w.currencyCode)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                      {t("contractors.amountWaiting")}
                                    </span>
                                  )}
                                  <div className="inline-flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      className={`${detailOpenIconButtonClass} h-8 min-h-8 w-8 min-w-8`}
                                      aria-label={t("common.edit")}
                                      title={t("common.edit")}
                                      onClick={() => openEditWork(w)}
                                    >
                                      <PencilIcon />
                                    </Button>
                                    <button
                                      type="button"
                                      className={`${trashIconActionButtonClass} h-8 min-h-8 w-8 min-w-8`}
                                      disabled={deleteWork.isPending}
                                      aria-label={t("common.delete")}
                                      title={t("common.delete")}
                                      onClick={() => confirmDeleteWork(w.id, w.description)}
                                    >
                                      <TrashIcon />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="hidden md:block">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableHeader>{t("contractors.workDate")}</TableHeader>
                              <TableHeader>{t("contractors.workDescription")}</TableHeader>
                              <TableHeader className="text-right">{t("contractors.amount")}</TableHeader>
                              <TableHeader className="text-right">{t("common.actions")}</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {data.workEntries.map((w) => (
                              <TableRow key={w.id}>
                                <TableCell dataLabel={t("contractors.workDate")} className="whitespace-nowrap text-zinc-600 max-md:py-1.5">{w.workDate}</TableCell>
                                <TableCell
                                  dataLabel={t("contractors.workDescription")}
                                  className="max-w-xs break-words text-zinc-900 max-md:py-1.5 max-md:text-right"
                                >
                                  {w.description}
                                  <span className="ml-1 text-xs text-zinc-500">
                                    ({w.branchName ? w.branchName : t("contractors.general")})
                                  </span>
                                </TableCell>
                                <TableCell dataLabel={t("contractors.amount")} className="text-right tabular-nums max-md:py-1.5">
                                  {w.amount != null ? (
                                    money(w.amount, w.currencyCode)
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                      {t("contractors.amountWaiting")}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell dataLabel="" className="text-right max-md:py-1.5">
                                  <div className="inline-flex items-center justify-end gap-1">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      className={detailOpenIconButtonClass}
                                      aria-label={t("common.edit")}
                                      title={t("common.edit")}
                                      onClick={() => openEditWork(w)}
                                    >
                                      <PencilIcon />
                                    </Button>
                                    <button
                                      type="button"
                                      className={trashIconActionButtonClass}
                                      disabled={deleteWork.isPending}
                                      aria-label={t("common.delete")}
                                      title={t("common.delete")}
                                      onClick={() => confirmDeleteWork(w.id, w.description)}
                                    >
                                      <TrashIcon />
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                        </>
                      )}
                    </section>
                  ) : (
                    <section>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900">{t("contractors.paymentsSection")}</h3>
                        <Button type="button" variant="secondary" onClick={openAddPayment}>
                          {t("contractors.addPayment")}
                        </Button>
                      </div>

                      {data.payments.length === 0 ? (
                        <p className="text-sm text-zinc-500">{t("contractors.noPayments")}</p>
                      ) : (
                        <>
                        <ul className="flex flex-col gap-2 md:hidden">
                          {data.payments.map((p) => (
                            <li
                              key={p.id}
                              className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-zinc-500">
                                    <span className="whitespace-nowrap font-medium text-zinc-700">{p.paymentDate}</span>
                                    <span aria-hidden>·</span>
                                    <span className="truncate text-zinc-700">{sourceLabel(p.paymentSource)}</span>
                                    {p.branchName ? (
                                      <>
                                        <span aria-hidden>·</span>
                                        <span className="truncate">{p.branchName}</span>
                                      </>
                                    ) : null}
                                    {p.paidByPersonnelName ? (
                                      <>
                                        <span aria-hidden>·</span>
                                        <span className="truncate">{p.paidByPersonnelName}</span>
                                      </>
                                    ) : null}
                                  </div>
                                  {p.description && p.description.trim() ? (
                                    <p className="mt-0.5 break-words text-sm leading-snug text-zinc-800">
                                      {p.description}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-900">
                                    {money(p.amount, p.currencyCode)}
                                  </span>
                                  <button
                                    type="button"
                                    className={`${trashIconActionButtonClass} h-8 min-h-8 w-8 min-w-8`}
                                    disabled={deletePayment.isPending}
                                    aria-label={t("common.delete")}
                                    title={t("common.delete")}
                                    onClick={() => confirmDeletePayment(p.id, `${sourceLabel(p.paymentSource)} · ${money(p.amount, p.currencyCode)}`)}
                                  >
                                    <TrashIcon />
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <div className="hidden md:block">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableHeader>{t("contractors.paymentDate")}</TableHeader>
                              <TableHeader>{t("contractors.paymentSource")}</TableHeader>
                              <TableHeader>{t("contractors.description")}</TableHeader>
                              <TableHeader className="text-right">{t("contractors.amount")}</TableHeader>
                              <TableHeader className="text-right">{t("common.actions")}</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {data.payments.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell dataLabel={t("contractors.paymentDate")} className="whitespace-nowrap text-zinc-600 max-md:py-1.5">{p.paymentDate}</TableCell>
                                <TableCell dataLabel={t("contractors.paymentSource")} className="text-zinc-700 max-md:py-1.5">
                                  {sourceLabel(p.paymentSource)}
                                  {p.branchName ? <span className="ml-1 text-xs text-zinc-500">({p.branchName})</span> : null}
                                  {p.paidByPersonnelName ? <span className="ml-1 text-xs text-zinc-500">({p.paidByPersonnelName})</span> : null}
                                </TableCell>
                                <TableCell
                                  dataLabel={t("contractors.description")}
                                  className="max-w-xs break-words text-zinc-700 max-md:py-1.5 max-md:text-right"
                                >
                                  {p.description && p.description.trim() ? (
                                    p.description
                                  ) : (
                                    <span className="text-zinc-400">{t("contractors.fieldEmpty")}</span>
                                  )}
                                </TableCell>
                                <TableCell dataLabel={t("contractors.amount")} className="text-right tabular-nums max-md:py-1.5 max-md:font-semibold">{money(p.amount, p.currencyCode)}</TableCell>
                                <TableCell dataLabel="" className="text-right max-md:py-1.5">
                                  <button
                                    type="button"
                                    className={trashIconActionButtonClass}
                                    disabled={deletePayment.isPending}
                                    aria-label={t("common.delete")}
                                    title={t("common.delete")}
                                    onClick={() => confirmDeletePayment(p.id, `${sourceLabel(p.paymentSource)} · ${money(p.amount, p.currencyCode)}`)}
                                  >
                                    <TrashIcon />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                        </>
                      )}
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
    {contractorId != null ? (
      <ContractorEntryDialog
        open={entryMode != null}
        mode={entryMode ?? "work"}
        contractorId={contractorId}
        workEntry={editWork}
        nested
        onClose={closeEntry}
      />
    ) : null}
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "-mb-px min-h-12 border-b-2 border-zinc-900 px-4 text-sm font-semibold text-zinc-900"
          : "min-h-12 border-b-2 border-transparent px-4 text-sm font-medium text-zinc-500 hover:text-zinc-800"
      }
    >
      {children}
    </button>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm"
          : "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-zinc-500 hover:text-zinc-800"
      }
    >
      {children}
    </button>
  );
}

function SegCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-zinc-200/80 px-1.5 text-[11px] font-semibold tabular-nums text-zinc-600">
      {children}
    </span>
  );
}

function InfoRow({ label, value, empty }: { label: string; value?: string | null; empty?: string }) {
  const shown = value && value.trim() ? value : empty ?? "";
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-xs font-medium text-zinc-500 sm:text-sm">{label}</dt>
      <dd className="break-words text-sm text-zinc-900 sm:text-right">{shown}</dd>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "debt" | "ok";
  hint?: string;
}) {
  const valueClass =
    tone === "debt"
      ? "text-red-600"
      : tone === "ok"
        ? "text-emerald-600"
        : "text-zinc-900";
  const hintClass = tone === "debt" ? "text-red-500" : tone === "ok" ? "text-emerald-600" : "text-zinc-500";
  const cardClass =
    tone === "debt"
      ? "border-red-200 bg-red-50/60"
      : tone === "ok"
        ? "border-emerald-200 bg-emerald-50/50"
        : "border-zinc-200 bg-white";
  return (
    <div className={`min-w-0 rounded-xl border p-2 sm:rounded-2xl sm:p-3 ${cardClass}`}>
      <div className="truncate text-[10.5px] leading-tight text-zinc-500 sm:text-xs">{label}</div>
      <div className={`mt-0.5 break-words text-sm font-semibold tabular-nums leading-tight sm:mt-1 sm:text-base ${valueClass}`}>{value}</div>
      {hint ? <div className={`mt-0.5 truncate text-[10px] sm:text-[11px] ${hintClass}`}>{hint}</div> : null}
    </div>
  );
}
