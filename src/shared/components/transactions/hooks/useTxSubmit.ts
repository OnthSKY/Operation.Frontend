"use client";

import type { RefObject } from "react";
import type { UseFormHandleSubmit } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import {
  branchTxFormIsSupplierInvoiceLine,
  isRegisterDayCloseIncomeRow,
  outPersonnelCategoryEffective,
} from "@/modules/branch/lib/branch-transaction-options";
import { DEFAULT_CURRENCY } from "@/shared/lib/iso4217-currencies";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import type { BranchRegisterSummary } from "@/types/branch";
import { computeAutoCategoryInjection } from "../lib/tx-auto-category";
import type { DayCloseBundledConfirmedLine, TxFormValues } from "../lib/tx-form-types";
import { resolveSubmitAmounts } from "../lib/tx-submit-amounts";
import { resolveSubmitBranch } from "../lib/tx-submit-branch";
import { resolveSubmitBundledPayloads } from "../lib/tx-submit-bundled-payloads";
import { resolveSubmitCashSettlement } from "../lib/tx-submit-cash-settlement";
import { resolveEffectiveYear } from "../lib/tx-submit-effective-year";
import { resolveSubmitExpenseLink } from "../lib/tx-submit-expense-link";
import { resolveSubmitFinancialLink } from "../lib/tx-submit-financial-link";
import { resolveSubmitLinkedPersonnel } from "../lib/tx-submit-linked-personnel";
import { resolveSubmitPaymentSource } from "../lib/tx-submit-payment-source";
import { buildBundledPayload, buildTxCreatePayload } from "../lib/tx-submit-payload";
import { resolveSubmitPocketPid } from "../lib/tx-submit-pocket-pid";
import { resolveSubmitPocketRepay } from "../lib/tx-submit-pocket-repay";
import { resolveSubmitReceipt } from "../lib/tx-submit-receipt";
import type { PocketRepaySettlementState } from "./usePocketRepaySettlement";

/**
 * AddTransactionModal'ın tüm submit akışını içeren orchestrator hook.
 *
 * Sırasıyla:
 *   1) tutarlar
 *   2) kasa devri
 *   3) auto-kategori injection
 *   4) ödeme kaynağı + invoice + handover
 *   5) cep personel id
 *   6) makbuz dosyası
 *   7) şube
 *   8) pocket repay settlement
 *   9) expense link (advance/salary)
 *   10) yeni avans yaratma (alt akış) — varsa burada return
 *   11) financial link (existing adv/sal)
 *   12) linked personnel
 *   13) bundled payloads
 *   14) gün sonu öncesi bundled gider yazımı (loop)
 *   15) ana tx yazımı + success
 *
 * Her validator hata döndürürse notify.error + return; sonraki adıma geçilmez.
 */
export type UseTxSubmitInput = {
  // RHF:
  handleSubmit: UseFormHandleSubmit<TxFormValues>;
  // Modal context:
  propBranchId: number | null;
  personnelExpenseFlow: boolean;
  defaultLinkedPersonnelId: number | undefined;
  onClose: () => void;
  // Locale:
  locale: Locale;
  // Sub-state:
  dayCloseBundledConfirmedLines: DayCloseBundledConfirmedLine[];
  dayCloseBundledExpenseOpen: boolean;
  pocketRepaySettlement: PocketRepaySettlementState;
  // Refs:
  receiptPhotoRef: RefObject<HTMLInputElement | null>;
  // Queries:
  registerSummary: BranchRegisterSummary | undefined;
  // Mutations (loose typing — sadece mutateAsync ihtiyacı):
  createTx: {
    mutateAsync: (input: ReturnType<typeof buildTxCreatePayload>) => Promise<unknown>;
  };
  /**
   * Gün sonu + bundled gider'leri atomik tek istekte yazar (sadece bundled varsa kullanılır).
   * Bundled boş ise mevcut `createTx` akışı yeterli.
   */
  createDayCloseBundleMut: {
    mutateAsync: (input: {
      dayClose: ReturnType<typeof buildTxCreatePayload>;
      bundledExpenses: ReturnType<typeof buildBundledPayload>[];
    }) => Promise<unknown>;
  };
  createAdvanceMut: {
    mutateAsync: (input: {
      personnelId: number;
      branchId: number;
      sourceType: string;
      amount: number;
      currencyCode: string;
      advanceDate: string;
      effectiveYear: number;
      description: string | null;
    }) => Promise<{ id: number }>;
  };
  /** Sezon kapalı ApiError'larını şube ayarına yönlendirir; true dönerse hata zaten gösterilmiş. */
  tryTourismSeasonClosedRedirect: (e: unknown, branchId: number | null | undefined) => boolean;
};

export function useTxSubmit(input: UseTxSubmitInput) {
  const { t } = useI18n();
  const {
    handleSubmit,
    propBranchId,
    personnelExpenseFlow,
    defaultLinkedPersonnelId,
    onClose,
    locale,
    dayCloseBundledConfirmedLines,
    dayCloseBundledExpenseOpen,
    pocketRepaySettlement,
    receiptPhotoRef,
    registerSummary,
    createTx,
    createDayCloseBundleMut,
    createAdvanceMut,
    tryTourismSeasonClosedRedirect,
  } = input;

  const onSubmit = handleSubmit(async (values) => {
    const cur = values.currencyCode.trim().toUpperCase() || DEFAULT_CURRENCY;

    const registerDayCloseSubmit = isRegisterDayCloseIncomeRow(
      values.type,
      values.mainCategory,
      values.category
    );

    let totalDeductibleSubmit = 0;
    if (registerDayCloseSubmit) {
      totalDeductibleSubmit += registerSummary?.dayCashOutFromRegister ?? 0;
      for (const row of dayCloseBundledConfirmedLines) {
        if (row.paymentSource === "REGISTER") {
          totalDeductibleSubmit += row.amount;
        }
      }
    }

    const amounts = resolveSubmitAmounts({
      values,
      locale,
      registerDayClose: registerDayCloseSubmit,
      totalDeductible: totalDeductibleSubmit,
    });
    if (!amounts.ok) {
      notify.error(t(amounts.errorKey));
      return;
    }
    const { amount, cashAmount, cardAmount } = amounts;

    const cashSettleResult = resolveSubmitCashSettlement({
      values,
      registerDayClose: registerDayCloseSubmit,
      hasCashPortion: cashAmount != null && cashAmount > 0,
    });
    if (!cashSettleResult.ok) {
      notify.error(t(cashSettleResult.errorKey));
      return;
    }
    const { cashSettlementParty, cashSettlementPersonnelId } = cashSettleResult;

    const inj = computeAutoCategoryInjection({
      type: values.type,
      mainCategory: values.mainCategory,
      currentCategory: values.category,
    });
    const categoryOut: string | null =
      inj.nextCategory !== undefined
        ? inj.nextCategory === ""
          ? null
          : inj.nextCategory
        : values.category.trim() || null;

    const mc = values.mainCategory.trim();
    const sc = outPersonnelCategoryEffective(mc, categoryOut).toUpperCase();
    const isInvRow = branchTxFormIsSupplierInvoiceLine({
      type: values.type,
      mainCategory: mc,
      category: values.category.trim(),
    });

    const paySrcResult = resolveSubmitPaymentSource({
      values,
      mainTrim: mc,
      isInvoiceRow: isInvRow,
    });
    if (!paySrcResult.ok) {
      notify.error(t(paySrcResult.errorKey));
      return;
    }
    const {
      expensePaymentSource,
      effExpensePay,
      settlesCashHandoverTransactionId,
      invStatusUpper: invStatusRaw,
    } = paySrcResult;

    const pidResult = resolveSubmitPocketPid({ values, effExpensePay });
    if (!pidResult.ok) {
      notify.error(t(pidResult.errorKey));
      return;
    }
    const expensePocketPersonnelId = pidResult.expensePocketPersonnelId;

    const receiptResult = await resolveSubmitReceipt({
      txType: values.type,
      isInvoiceRow: isInvRow,
      invoiceStatusUpper: invStatusRaw,
      file: receiptPhotoRef.current?.files?.[0] ?? null,
    });
    if (!receiptResult.ok) {
      notify.error(t(receiptResult.errorKey));
      return;
    }
    const receiptFile = receiptResult.file;

    const branchResult = resolveSubmitBranch({
      values,
      propBranchId,
      personnelExpenseFlow,
      effExpensePay,
      mainTrim: mc,
    });
    if (!branchResult.ok) {
      notify.error(t(branchResult.errorKey));
      return;
    }
    const effBranchId = branchResult.effBranchId;

    const pocketRepayResult = resolveSubmitPocketRepay({
      mainTrim: mc,
      settlement: pocketRepaySettlement,
      amount,
    });
    if (!pocketRepayResult.ok) {
      notify.error(t(pocketRepayResult.errorKey));
      return;
    }

    const expenseLinkResult = resolveSubmitExpenseLink({
      values,
      mainTrim: mc,
      scUpper: sc,
    });
    if (!expenseLinkResult.ok) {
      notify.error(t(expenseLinkResult.errorKey));
      return;
    }
    const { reqExpenseAdvance, reqExpenseSalary, linkFinancialPid, advanceMode } =
      expenseLinkResult;

    // ─── Alt akış: yeni avans yarat → tek tx yaz → çık ──────────────────
    if (reqExpenseAdvance && advanceMode === "new_register") {
      const effY = resolveEffectiveYear(values.effectiveYear, values.transactionDate);
      if (effBranchId == null || effBranchId <= 0) {
        notify.error(t("branch.txAdvanceNeedBranch"));
        return;
      }
      let createdAdvanceId: number;
      try {
        const adv = await createAdvanceMut.mutateAsync({
          personnelId: linkFinancialPid,
          branchId: effBranchId,
          sourceType: "CASH",
          amount,
          currencyCode: cur,
          advanceDate: values.transactionDate,
          effectiveYear: effY,
          description: values.description.trim() || null,
        });
        createdAdvanceId = adv.id;
      } catch (e) {
        notify.error(toErrorMessage(e));
        return;
      }
      try {
        await createTx.mutateAsync(
          buildTxCreatePayload(
            {
              values,
              effBranchId,
              categoryOut,
              currencyCode: cur,
              amount,
              cashAmount,
              cardAmount,
              cashSettlementParty,
              cashSettlementPersonnelId,
              expensePaymentSource: effExpensePay,
              expensePocketPersonnelId,
              isInvoiceRow: isInvRow,
              invStatusUpper: invStatusRaw,
              receiptFile,
              linkedAdvanceId: createdAdvanceId,
              linkedSalaryPaymentId: undefined,
              linkFinancialPid,
              reqExpenseAdvance: true,
              reqExpenseSalary: false,
              advanceMode: "existing",
              linkedPersonnelIdOut: undefined,
              pocketRepaySettlement,
              mainTrim: mc,
              registerDayClose: registerDayCloseSubmit,
              settlesCashHandoverTransactionId: undefined,
            },
            { linkedAdvanceId: createdAdvanceId }
          )
        );
        notify.success(t("toast.branchTxCreated"));
        onClose();
      } catch (e) {
        if (!tryTourismSeasonClosedRedirect(e, effBranchId)) {
          notify.error(`${t("branch.txAdvanceCreatedRegisterFailed")} ${toErrorMessage(e)}`);
        }
      }
      // expensePaymentSource intentionally unused here (UNPAID kanalı yok)
      void expensePaymentSource;
      return;
    }

    const finLinkResult = resolveSubmitFinancialLink({
      values,
      reqExpenseAdvance,
      reqExpenseSalary,
      advanceMode,
    });
    if (!finLinkResult.ok) {
      notify.error(t(finLinkResult.errorKey));
      return;
    }
    const { linkedAdvanceId, linkedSalaryPaymentId } = finLinkResult;

    const linkedPersonnelResult = resolveSubmitLinkedPersonnel({
      values,
      mainTrim: mc,
      scUpper: sc,
      expensePocketPersonnelId,
      personnelExpenseFlow,
      defaultLinkedPersonnelId,
      linkFinancialPid,
    });
    if (!linkedPersonnelResult.ok) {
      notify.error(t(linkedPersonnelResult.errorKey));
      return;
    }
    const linkedPersonnelIdOut = linkedPersonnelResult.linkedPersonnelIdOut;

    const bundledResult = resolveSubmitBundledPayloads({
      registerDayClose: registerDayCloseSubmit,
      bundleOpen: dayCloseBundledExpenseOpen,
      draftAmountRaw: values.dayCloseBundledExpenseAmount,
      confirmedLines: dayCloseBundledConfirmedLines,
      effBranchId,
    });
    if (!bundledResult.ok) {
      notify.error(t(bundledResult.errorKey));
      return;
    }
    const dayCloseBundledExpensePayloads = bundledResult.payloads;

    const dayClosePayload = buildTxCreatePayload({
      values,
      effBranchId,
      categoryOut,
      currencyCode: cur,
      amount,
      cashAmount,
      cardAmount,
      cashSettlementParty,
      cashSettlementPersonnelId,
      expensePaymentSource: effExpensePay,
      expensePocketPersonnelId,
      isInvoiceRow: isInvRow,
      invStatusUpper: invStatusRaw,
      receiptFile,
      linkedAdvanceId,
      linkedSalaryPaymentId,
      linkFinancialPid,
      reqExpenseAdvance,
      reqExpenseSalary,
      advanceMode,
      linkedPersonnelIdOut,
      pocketRepaySettlement,
      mainTrim: mc,
      registerDayClose: registerDayCloseSubmit,
      settlesCashHandoverTransactionId,
    });

    // Bundled VAR → atomik day-close-bundle endpoint'i ile tek istek:
    // ① bundled OUT'lar INSERT ② day-close IN INSERT ③ bundled.source_transaction_id = dayCloseId
    // Hata → tümü rollback (orphan bundled gider kalmaz).
    //
    // Bundled YOK → eski tekil endpoint'le devam.
    if (registerDayCloseSubmit && dayCloseBundledExpensePayloads.length > 0) {
      try {
        await createDayCloseBundleMut.mutateAsync({
          dayClose: dayClosePayload,
          bundledExpenses: dayCloseBundledExpensePayloads.map((pl) =>
            buildBundledPayload({
              branchId: effBranchId,
              currencyCode: cur,
              transactionDate: values.transactionDate,
              line: pl,
            })
          ),
        });
        notify.success(t("toast.branchTxCreated"));
        onClose();
      } catch (e) {
        if (!tryTourismSeasonClosedRedirect(e, effBranchId)) {
          notify.error(toErrorMessage(e));
        }
      }
      void expensePaymentSource;
      return;
    }

    try {
      await createTx.mutateAsync(dayClosePayload);
      notify.success(t("toast.branchTxCreated"));
      onClose();
    } catch (e) {
      if (!tryTourismSeasonClosedRedirect(e, effBranchId)) {
        notify.error(toErrorMessage(e));
      }
    }
    // expensePaymentSource intentionally unused
    void expensePaymentSource;
  });

  return { onSubmit };
}
