"use client";

import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Tooltip } from "@/shared/ui/Tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { CreatedByMeta } from "@/shared/components/CreatedByMeta";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  expensePaymentSourceLabelShort,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import { UI_POCKET_CLAIM_TRANSFER_ENABLED } from "@/modules/branch/lib/product-ui-flags";
import {
  formatAdvanceDay,
  sourceAbbrev,
} from "@/modules/personnel/lib/advance-formatters";
import {
  AdvanceHeldRegisterSourceMeta,
  ExpenseHeldRegisterSourceMeta,
} from "@/modules/personnel/components/PersonnelHeldRegisterSourceMeta";
import { PersonnelAdvanceCard } from "@/modules/personnel/components/PersonnelAdvanceCard";
import { PersonnelExpenseCard } from "@/modules/personnel/components/PersonnelExpenseCard";
import { PersonnelCostsToolbar } from "@/modules/personnel/components/PersonnelCostsToolbar";
import { PersonnelCostsSummaryCards } from "@/modules/personnel/components/PersonnelCostsSummaryCards";
import { PersonnelCostsPagination } from "@/modules/personnel/components/PersonnelCostsPagination";
import type { PersonnelDetailCostsState, PersonnelCostsCombinedRow } from "@/modules/personnel/hooks/usePersonnelDetailCostsState";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import type { Personnel } from "@/types/personnel";

function expenseSourceLabel(
  t: (k: string) => string,
  source: string | null | undefined,
  dash: string,
): string {
  const label = expensePaymentSourceLabelShort(source, t);
  return label || dash;
}

export type PersonnelDetailCostsTabPocketRepay = {
  branchId: number;
  currency: string;
  paymentSource: "REGISTER" | "PATRON";
};

export type PersonnelDetailCostsTabClaimTransfer = {
  kind: "patron" | "staff";
  branchId: number;
  currency: string;
};

export type PersonnelDetailCostsTabProps = {
  personnel: Personnel;
  branchNameById: Map<number, string>;
  personnelById: Map<number, Personnel>;
  isSystemAdmin: boolean;
  state: PersonnelDetailCostsState;
  /** Pocket-money özet section'ı için query pending state'i. */
  pocketMoneyQueriesPending: boolean;
  /** Gösterilecek pocket-money satırları. */
  pocketMoneyActionsByBranch: {
    branchId: number;
    row: BranchPersonnelMoneySummaryItem;
  }[];
  onPocketRepay: (args: PersonnelDetailCostsTabPocketRepay) => void;
  onPocketClaimTransfer: (args: PersonnelDetailCostsTabClaimTransfer) => void;
  /** Karta/satıra tıklanınca detay görünümü. */
  onOpenRowDetail: (row: PersonnelCostsCombinedRow) => void;
  /** Avans soft-delete onay zinciri. */
  onConfirmDeleteAdvance: (advanceId: number) => void;
  /** Soft-delete edilmiş avansı geri al (admin). */
  onConfirmRestoreAdvance: (advanceId: number) => void;
  /** Soft-delete edilmiş avansı kalıcı sil (admin). */
  onConfirmHardDeleteAdvance: (advanceId: number) => void;
  /** Gider transaction silme onayı. */
  onConfirmDeleteExpenseTx: (txId: number) => void;
  busyDeleteAdvance: boolean;
  busyRestoreAdvance: boolean;
  busyHardDeleteAdvance: boolean;
  busyDeleteExpenseTx: boolean;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
};

/**
 * Personel detayı costs sekmesi tek dosyada:
 *  - üstte pocket-money özet (yalnız pozitif net borç + mixed currency değilse)
 *  - toolbar (filtre / işlemler) + sezon filtre satırı + 3-up özet
 *  - mobil kart listesi / masaüstü tablo + sayfalama
 *
 * Tüm durum makinesi `usePersonnelDetailCostsState` hook'undadır; bu bileşen sunum.
 */
export function PersonnelDetailCostsTab({
  personnel,
  branchNameById,
  personnelById,
  isSystemAdmin,
  state,
  pocketMoneyQueriesPending,
  pocketMoneyActionsByBranch,
  onPocketRepay,
  onPocketClaimTransfer,
  onOpenRowDetail,
  onConfirmDeleteAdvance,
  onConfirmRestoreAdvance,
  onConfirmHardDeleteAdvance,
  onConfirmDeleteExpenseTx,
  busyDeleteAdvance,
  busyRestoreAdvance,
  busyHardDeleteAdvance,
  busyDeleteExpenseTx,
  t,
  locale,
  dash,
}: PersonnelDetailCostsTabProps) {
  const {
    advFiltersActive,
    costsListSeasonFilterYear,
    costsCombinedTotal,
    costsAdvanceTotal,
    costsExpenseTotal,
    costsSummaryCurrency,
    advLoading,
    advError,
    advErr,
    attrExpLoading,
    attrExpError,
    attrExpErr,
    combinedCostsRows,
    costsSlice,
    advSafePage,
    advTotalPages,
    highlightCostKey,
    deletingCostRows,
    setCostsFiltersDrawerOpen,
    setCostsActionsDrawerOpen,
    setAdvPage,
  } = state;

  return (
    <div className="min-w-0 space-y-2.5 pb-2 sm:space-y-4">
      <section className="min-w-0 space-y-2.5 sm:space-y-4">
        {!personnel.isDeleted &&
        (pocketMoneyQueriesPending ||
          pocketMoneyActionsByBranch.length > 0) ? (
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-3 shadow-sm sm:p-4">
            <h3 className="text-sm font-semibold text-amber-950">
              {t("personnel.detailPocketMoneySectionTitle")}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
              {t("personnel.detailPocketMoneySectionHint")}
            </p>
            {pocketMoneyQueriesPending ? (
              <p className="mt-3 text-sm text-zinc-600">
                {t("common.loading")}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {pocketMoneyActionsByBranch.map(({ branchId, row }) => {
                  const cur =
                    row.pocketCurrencyCode?.trim().toUpperCase() || "TRY";
                  const bname = branchNameById.get(branchId) ?? `#${branchId}`;
                  return (
                    <li
                      key={branchId}
                      className="flex flex-col gap-3 rounded-lg border border-amber-200/70 bg-white/80 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900">
                          {bname}
                        </p>
                        <p className="mt-0.5 font-mono text-sm text-amber-950">
                          {formatMoneyDash(
                            row.netRegisterOwesPocket,
                            dash,
                            locale,
                            cur,
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        <Tooltip
                          content={t(
                            "personnel.detailPocketActionRegisterTooltip",
                          )}
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[44px] min-w-[44px] shrink-0 px-2.5 text-xs font-semibold"
                            aria-label={t(
                              "personnel.detailPocketActionRegisterTooltip",
                            )}
                            onClick={() =>
                              onPocketRepay({
                                branchId,
                                currency: cur,
                                paymentSource: "REGISTER",
                              })
                            }
                          >
                            {t("personnel.detailPocketActionRegisterShort")}
                          </Button>
                        </Tooltip>
                        <Tooltip
                          content={t(
                            "personnel.detailPocketActionPatronRepayTooltip",
                          )}
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[44px] min-w-[44px] shrink-0 px-2.5 text-xs font-semibold"
                            aria-label={t(
                              "personnel.detailPocketActionPatronRepayTooltip",
                            )}
                            onClick={() =>
                              onPocketRepay({
                                branchId,
                                currency: cur,
                                paymentSource: "PATRON",
                              })
                            }
                          >
                            {t("personnel.detailPocketActionPatronRepayShort")}
                          </Button>
                        </Tooltip>
                        {UI_POCKET_CLAIM_TRANSFER_ENABLED ? (
                          <>
                            <Tooltip
                              content={t(
                                "personnel.detailPocketActionClaimToPatronTooltip",
                              )}
                            >
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-[44px] min-w-[44px] shrink-0 px-2.5 text-xs font-semibold"
                                aria-label={t(
                                  "personnel.detailPocketActionClaimToPatronTooltip",
                                )}
                                onClick={() =>
                                  onPocketClaimTransfer({
                                    kind: "patron",
                                    branchId,
                                    currency: cur,
                                  })
                                }
                              >
                                {t(
                                  "personnel.detailPocketActionClaimToPatronShort",
                                )}
                              </Button>
                            </Tooltip>
                            <Tooltip
                              content={t(
                                "personnel.detailPocketActionClaimToStaffTooltip",
                              )}
                            >
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-[44px] min-w-[44px] shrink-0 px-2.5 text-xs font-semibold"
                                aria-label={t(
                                  "personnel.detailPocketActionClaimToStaffTooltip",
                                )}
                                onClick={() =>
                                  onPocketClaimTransfer({
                                    kind: "staff",
                                    branchId,
                                    currency: cur,
                                  })
                                }
                              >
                                {t(
                                  "personnel.detailPocketActionClaimToStaffShort",
                                )}
                              </Button>
                            </Tooltip>
                          </>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        <PersonnelCostsToolbar
          filtersActive={advFiltersActive}
          onOpenFilters={() => setCostsFiltersDrawerOpen(true)}
          onOpenActions={() => setCostsActionsDrawerOpen(true)}
          t={t}
        />
        {costsListSeasonFilterYear != null ? (
          <p className="text-[11px] text-zinc-600 sm:text-xs">
            {t("personnel.detailCostsListSeasonActiveLine").replace(
              "{year}",
              String(costsListSeasonFilterYear),
            )}
          </p>
        ) : null}
        <PersonnelCostsSummaryCards
          combinedTotal={costsCombinedTotal}
          advanceTotal={costsAdvanceTotal}
          expenseTotal={costsExpenseTotal}
          currencyCode={costsSummaryCurrency}
          locale={locale}
          dash={dash}
        />

        <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/5">
          {advLoading || attrExpLoading ? (
            <p className="p-4 text-sm text-zinc-500">{t("common.loading")}</p>
          ) : advError || attrExpError ? (
            <div className="space-y-1 p-4 text-sm text-red-600">
              {advError ? <p>{toErrorMessage(advErr)}</p> : null}
              {attrExpError ? <p>{toErrorMessage(attrExpErr)}</p> : null}
            </div>
          ) : combinedCostsRows.length === 0 ? (
            <p className="p-4 text-sm text-zinc-600">
              {t("personnel.detailCostsCombinedEmpty")}
            </p>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="space-y-1.5 p-2 md:hidden">
                {costsSlice.map((row) =>
                  row.kind === "advance" ? (
                    <PersonnelAdvanceCard
                      key={`a-${row.advance.id}`}
                      advance={row.advance}
                      highlighted={
                        highlightCostKey === `a-${row.advance.id}`
                      }
                      isDeleting={deletingCostRows.has(`a-${row.advance.id}`)}
                      personnelIsDeleted={personnel.isDeleted}
                      isSystemAdmin={isSystemAdmin}
                      branchNameById={branchNameById}
                      personnelById={personnelById}
                      t={t}
                      locale={locale}
                      dash={dash}
                      onOpenDetail={() => onOpenRowDetail(row)}
                      onDelete={() => onConfirmDeleteAdvance(row.advance.id)}
                      onRestore={() => onConfirmRestoreAdvance(row.advance.id)}
                      onHardDelete={() =>
                        onConfirmHardDeleteAdvance(row.advance.id)
                      }
                      busyDelete={busyDeleteAdvance}
                      busyRestore={busyRestoreAdvance}
                      busyHardDelete={busyHardDeleteAdvance}
                    />
                  ) : (
                    <PersonnelExpenseCard
                      key={`e-${row.tx.id}`}
                      tx={row.tx}
                      highlighted={highlightCostKey === `e-${row.tx.id}`}
                      isDeleting={deletingCostRows.has(`e-${row.tx.id}`)}
                      personnelIsDeleted={personnel.isDeleted}
                      branchNameById={branchNameById}
                      personnelById={personnelById}
                      t={t}
                      locale={locale}
                      dash={dash}
                      onOpenDetail={() => onOpenRowDetail(row)}
                      onDelete={() => onConfirmDeleteExpenseTx(row.tx.id)}
                      busyDelete={busyDeleteExpenseTx}
                    />
                  ),
                )}
              </div>

              {/* Desktop: table */}
              <div className="hidden min-w-0 overflow-x-auto md:block">
                <Table className="w-full min-w-0 lg:min-w-[44rem] border-0 text-sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader className="w-[1%] whitespace-nowrap">
                        {t("personnel.detailExpenseColKind")}
                      </TableHeader>
                      <TableHeader>{t("personnel.advanceDate")}</TableHeader>
                      <TableHeader>
                        {t("personnel.detailCostsColDetail")}
                      </TableHeader>
                      <TableHeader>{t("personnel.tableBranch")}</TableHeader>
                      <TableHeader className="text-right">
                        {t("personnel.amount")}
                      </TableHeader>
                      <TableHeader>
                        {t("personnel.advanceCurrency")}
                      </TableHeader>
                      <TableHeader className="min-w-[9rem]">
                        {t("personnel.detailCostsCreatedBy")}
                      </TableHeader>
                      {!personnel.isDeleted ? (
                        <TableHeader className="w-[1%] text-center text-xs font-medium text-zinc-500">
                          {t("branch.txColActions")}
                        </TableHeader>
                      ) : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {costsSlice.map((row) =>
                      row.kind === "advance" ? (
                        <TableRow
                          key={`a-${row.advance.id}`}
                          data-cost-row={`a-${row.advance.id}`}
                          className={cn(
                            highlightCostKey === `a-${row.advance.id}` &&
                              "ring-2 ring-amber-400 ring-inset bg-amber-50",
                            row.advance.isDeleted && "bg-red-50/40",
                          )}
                        >
                          <TableCell className="align-middle">
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={cn(
                                  "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight",
                                  "border-amber-200 bg-amber-50 text-amber-900",
                                )}
                              >
                                {t("personnel.detailExpenseBadgeAdvance")}
                              </span>
                              {row.advance.isDeleted ? (
                                <span
                                  className="inline-flex rounded-md border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold leading-tight text-red-900"
                                  title={[
                                    row.advance.deletedAt
                                      ? formatLocaleDateTime(
                                          row.advance.deletedAt,
                                          locale,
                                        )
                                      : null,
                                    row.advance.deletedByName,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                >
                                  {t(
                                    "personnel.detailCostsAdvanceDeletedBadge",
                                  )}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatAdvanceDay(
                              row.advance.advanceDate,
                              locale,
                              dash,
                            )}
                          </TableCell>
                          <TableCell className="max-w-[18rem] text-sm text-zinc-700">
                            <span className="text-zinc-600">
                              {sourceAbbrev(t, row.advance.sourceType)} ·{" "}
                              {row.advance.effectiveYear}
                            </span>
                            {row.advance.description?.trim() ? (
                              <span className="mt-0.5 block text-xs text-zinc-500">
                                {row.advance.description.trim()}
                              </span>
                            ) : null}
                            <AdvanceHeldRegisterSourceMeta
                              advance={row.advance}
                              personnelById={personnelById}
                              dash={dash}
                              t={t}
                            />
                            <button
                              type="button"
                              className="mt-1 inline-flex rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                              onClick={() => onOpenRowDetail(row)}
                            >
                              {t("personnel.detailCostsViewDetailAction")}
                            </button>
                          </TableCell>
                          <TableCell>
                            {row.advance.branchId != null &&
                            row.advance.branchId > 0
                              ? (branchNameById.get(row.advance.branchId) ??
                                `#${row.advance.branchId}`)
                              : dash}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatMoneyDash(
                              row.advance.amount,
                              dash,
                              locale,
                              row.advance.currencyCode,
                            )}
                          </TableCell>
                          <TableCell>{row.advance.currencyCode}</TableCell>
                          <TableCell>
                            <CreatedByMeta
                              row={row.advance}
                              locale={locale}
                              dash={dash}
                            />
                          </TableCell>
                          {!personnel.isDeleted && row.advance.isDeleted ? (
                            isSystemAdmin ? (
                              <TableCell className="p-2 text-center align-middle">
                                <div className="flex flex-wrap items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    className="inline-flex min-h-[32px] items-center rounded-md border border-emerald-300 bg-white px-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                    disabled={busyRestoreAdvance}
                                    onClick={() =>
                                      onConfirmRestoreAdvance(row.advance.id)
                                    }
                                  >
                                    {t("personnel.detailCostsRestoreButton")}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex min-h-[32px] items-center rounded-md border border-red-300 bg-white px-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                                    disabled={busyHardDeleteAdvance}
                                    onClick={() =>
                                      onConfirmHardDeleteAdvance(
                                        row.advance.id,
                                      )
                                    }
                                  >
                                    {t(
                                      "personnel.detailCostsHardDeleteButton",
                                    )}
                                  </button>
                                </div>
                              </TableCell>
                            ) : (
                              <TableCell />
                            )
                          ) : !personnel.isDeleted ? (
                            <TableCell className="p-2 text-center align-middle">
                              <button
                                type="button"
                                className={trashIconActionButtonClass}
                                aria-label={t("branch.txDeleteAria")}
                                disabled={busyDeleteAdvance}
                                onClick={() =>
                                  onConfirmDeleteAdvance(row.advance.id)
                                }
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ) : (
                        <TableRow
                          key={`e-${row.tx.id}`}
                          data-cost-row={`e-${row.tx.id}`}
                          className={cn(
                            highlightCostKey === `e-${row.tx.id}` &&
                              "ring-2 ring-amber-400 ring-inset bg-amber-50",
                          )}
                        >
                          <TableCell className="align-middle">
                            <span
                              className={cn(
                                "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight",
                                "border-violet-200 bg-violet-50 text-violet-900",
                              )}
                            >
                              {t("personnel.detailExpenseBadgeExpense")}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatLocaleDate(row.tx.transactionDate, locale)}
                          </TableCell>
                          <TableCell className="max-w-[20rem] text-sm">
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("personnel.detailExpenseColCategory")}
                              </p>
                              <p className="text-zinc-700">
                                {txCategoryLine(
                                  row.tx.mainCategory,
                                  row.tx.category,
                                  t,
                                )}
                              </p>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("personnel.detailCostsMoneySourceLabel")}
                              </p>
                              <p className="text-xs text-zinc-600">
                                {expenseSourceLabel(
                                  t,
                                  row.tx.expensePaymentSource,
                                  dash,
                                )}
                              </p>
                              <ExpenseHeldRegisterSourceMeta
                                tx={row.tx}
                                personnelById={personnelById}
                                dash={dash}
                                t={t}
                              />
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("personnel.detailCostsDescriptionLabel")}
                              </p>
                              <p className="text-xs text-zinc-600">
                                {row.tx.description?.trim() || dash}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="mt-1 inline-flex rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
                              onClick={() => onOpenRowDetail(row)}
                            >
                              {t("personnel.detailCostsViewDetailAction")}
                            </button>
                          </TableCell>
                          <TableCell className="text-zinc-600">
                            {row.tx.branchId != null && row.tx.branchId > 0
                              ? (branchNameById.get(row.tx.branchId) ??
                                `#${row.tx.branchId}`)
                              : t("personnel.detailExpenseBranchNone")}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatMoneyDash(
                              row.tx.amount,
                              dash,
                              locale,
                              row.tx.currencyCode,
                            )}
                          </TableCell>
                          <TableCell>{row.tx.currencyCode}</TableCell>
                          <TableCell>
                            <CreatedByMeta
                              row={row.tx}
                              locale={locale}
                              dash={dash}
                            />
                          </TableCell>
                          {!personnel.isDeleted ? (
                            <TableCell className="p-2 text-center align-middle">
                              <button
                                type="button"
                                className={trashIconActionButtonClass}
                                aria-label={t("branch.txDeleteAria")}
                                disabled={busyDeleteExpenseTx}
                                onClick={() =>
                                  onConfirmDeleteExpenseTx(row.tx.id)
                                }
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>

              <PersonnelCostsPagination
                currentPage={advSafePage}
                totalPages={advTotalPages}
                totalRecords={combinedCostsRows.length}
                onPrev={() => setAdvPage((p) => Math.max(1, p - 1))}
                onNext={() =>
                  setAdvPage((p) => Math.min(advTotalPages, p + 1))
                }
                t={t}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
