import { fetchBranchNotes } from "@/modules/branch/api/branch-notes-api";
import {
  fetchAllBranchStockReceipts,
  fetchAllBranchTransactionsPaged,
} from "@/modules/branch/api/branches-api";
import { fetchAllNonAdvancePersonnelAttributedExpenses } from "@/modules/branch/api/branch-transactions-api";
import {
  expensePaymentSourceLabel,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import {
  escapeHtml,
  safeDownloadFilename,
} from "@/modules/personnel/lib/settlement-print/format";
import {
  sumByCurrency,
  sumRegisterByType,
  sumStockValuationByCurrency,
} from "@/modules/personnel/lib/settlement-print/aggregate";
import { DOC_STYLES } from "@/modules/personnel/lib/settlement-print/styles";
import {
  defaultBranchSettlementPdfOptions,
  emptyNote,
} from "@/modules/personnel/lib/settlement-print/options";
import { buildBranchStockSectionHtml } from "@/modules/personnel/lib/settlement-print/sections/stock";
import {
  renderBranchSalaryCostSection,
  renderPersonnelSalaryCostSection,
  renderSalaryCostLoadFailedSection,
} from "@/modules/personnel/lib/settlement-print/sections/salary";
import { buildBranchRegisterSectionHtml } from "@/modules/personnel/lib/settlement-print/sections/register";
import {
  buildBranchSourceBreakdownHtml,
  buildBranchTotalsCardsHtml,
} from "@/modules/personnel/lib/settlement-print/sections/summary";
import {
  buildAdvancesSummarySectionHtml,
  buildPersonnelExpensesSummarySectionHtml,
  buildRegisterSummarySectionHtml,
} from "@/modules/personnel/lib/settlement-print/sections/summaries";
import { renderPersonnelSeasonTenureBlock } from "@/modules/personnel/lib/settlement-print/sections/season-tenure";
import {
  loadPersonnelSettlementPersonRow,
  sortExpensesDesc,
} from "@/modules/personnel/lib/settlement-print/data";
import { resolvedSeasonYearFilter } from "@/modules/personnel/lib/settlement-print/types";
import type { SettlementPrintOpts } from "@/modules/personnel/lib/settlement-print/types";

import {
  sortAdvancesDesc,
  sourceAbbrev,
} from "@/modules/personnel/lib/advance-formatters";
import {
  fetchBranchPersonnelSalaryCostEstimates,
  fetchPersonnelSalaryCostEstimate,
} from "@/modules/personnel/api/personnel-api";
import {
  fetchAdvancesByPersonnel,
  fetchAllAdvances,
} from "@/modules/personnel/api/advances-api";
import { fetchPersonnelNotes } from "@/modules/personnel/api/personnel-notes-api";
import {
  filterNonAdvanceExpenseRows,
  linkTypeLabel,
  resolveNonAdvanceRow,
} from "@/modules/personnel/components/personnel-non-advance-expense-blocks";
import { DEFAULT_NON_ADVANCE_EXPENSE_SORT } from "@/modules/personnel/lib/non-advance-expense-sort";
import { isoCalendarYear } from "@/modules/personnel/lib/settlement-print-season";
import type { Advance, AdvanceListItem } from "@/types/advance";
import type { BranchStockReceiptRow } from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";

const BRANCH_ADVANCES_PRINT_LIMIT = 1000;

/**
 * Mutabakat HTML belgesini (tam <code>&lt;!DOCTYPE html&gt;</code> dökümanı) ve
 * indirme dosya adını üretir. Hem yeni sekmede açma hem de PDF'e çevirme bunu kullanır.
 */
export async function buildPersonnelSettlementDocument(
  opts: SettlementPrintOpts,
): Promise<{ html: string; downloadFileName: string }> {
  const { target, locale, branchNameById, t, branchPdfOptions } = opts;
  const yf = resolvedSeasonYearFilter(target);
  const dash = t("personnel.dash");
  const orgBranch = t("personnel.nonAdvanceExpenseBranchOrg");
  const byBranch = target.scope === "branch";
  const bp = byBranch ? (branchPdfOptions ?? defaultBranchSettlementPdfOptions()) : null;
  const lang = locale === "tr" ? "tr" : "en";

  let advances: Advance[] | AdvanceListItem[] = [];
  let expenses: BranchTransaction[] = [];
  let generalNotes: { body: string; createdAt: string }[] = [];
  let stockRows: BranchStockReceiptRow[] = [];
  let registerTx: BranchTransaction[] = [];

  {
    if (target.scope === "personnel") {
      const expensePool = await fetchAllNonAdvancePersonnelAttributedExpenses(
        DEFAULT_NON_ADVANCE_EXPENSE_SORT
      );
      const adv = await fetchAdvancesByPersonnel(
        target.personnelId,
        yf ?? undefined
      );
      advances = sortAdvancesDesc(adv);
      expenses = sortExpensesDesc(
        filterNonAdvanceExpenseRows(expensePool, {
          personnelId: target.personnelId,
        })
      );
      try {
        generalNotes = await fetchPersonnelNotes(target.personnelId);
      } catch {
        generalNotes = [];
      }
    } else {
      const bid = target.branchId;
      const bpdf = bp!;

      const expensePoolPromise = bpdf.includePersonnelNonAdvanceExpenses
        ? fetchAllNonAdvancePersonnelAttributedExpenses(DEFAULT_NON_ADVANCE_EXPENSE_SORT)
        : Promise.resolve([] as BranchTransaction[]);

      const advPromise = bpdf.includeAdvances
        ? fetchAllAdvances({
            branchId: bid,
            limit: BRANCH_ADVANCES_PRINT_LIMIT,
            effectiveYear: yf ?? undefined,
          })
        : Promise.resolve([] as AdvanceListItem[]);

      const stockPromise = bpdf.includeStockInbound
        ? fetchAllBranchStockReceipts(bid)
        : Promise.resolve([] as BranchStockReceiptRow[]);

      const regPromise = bpdf.includeRegisterLedger
        ? fetchAllBranchTransactionsPaged(bid)
        : Promise.resolve([] as BranchTransaction[]);

      const notesPromise = bpdf.includeNotes
        ? fetchBranchNotes(bid).catch(() => [] as { body: string; createdAt: string }[])
        : Promise.resolve([] as { body: string; createdAt: string }[]);

      const [expensePool, advRaw, stockRowsRaw, registerTxRaw, notesRaw] =
        await Promise.all([
          expensePoolPromise,
          advPromise,
          stockPromise,
          regPromise,
          notesPromise,
        ]);

      advances = bpdf.includeAdvances ? sortAdvancesDesc(advRaw) : [];
      expenses = bpdf.includePersonnelNonAdvanceExpenses
        ? sortExpensesDesc(
            filterNonAdvanceExpenseRows(expensePool, { branchId: bid })
          )
        : [];
      stockRows = stockRowsRaw;
      registerTx = sortExpensesDesc(registerTxRaw);
      generalNotes = notesRaw;
    }

    if (yf != null) {
      expenses = expenses.filter(
        (e) => isoCalendarYear(e.transactionDate) === yf
      );
      registerTx = registerTx.filter(
        (e) => isoCalendarYear(e.transactionDate) === yf
      );
      stockRows = stockRows.filter(
        (r) => isoCalendarYear(r.movementDate) === yf
      );
      generalNotes = generalNotes.filter(
        (n) => isoCalendarYear(n.createdAt) === yf
      );
    }
  }

  let personnelProfilePhotoDataUrl: string | null = null;
  let personnelRowForPrint: Personnel | null = null;
  if (target.scope === "personnel") {
    const pack = await loadPersonnelSettlementPersonRow(target.personnelId);
    personnelProfilePhotoDataUrl = pack.profilePhotoDataUrl;
    personnelRowForPrint = pack.personnel;
  }

  generalNotes = [...generalNotes].sort((a, b) =>
    String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
  );

  let salaryCostSectionHtml = "";
  try {
    if (yf == null) {
      if (target.scope === "personnel") {
        const est = await fetchPersonnelSalaryCostEstimate(target.personnelId);
        salaryCostSectionHtml = renderPersonnelSalaryCostSection(
          est,
          t,
          locale,
          dash,
          escapeHtml
        );
      } else if (bp!.includePersonnelSalaryCost) {
        const pack = await fetchBranchPersonnelSalaryCostEstimates(
          target.branchId
        );
        salaryCostSectionHtml = renderBranchSalaryCostSection(
          pack.items,
          t,
          locale,
          dash,
          escapeHtml
        );
      }
    }
  } catch {
    salaryCostSectionHtml =
      yf == null &&
      (target.scope === "personnel" ||
        (byBranch && bp!.includePersonnelSalaryCost))
        ? renderSalaryCostLoadFailedSection(t, escapeHtml)
        : "";
  }

  const advTotals = sumByCurrency(advances);
  const expTotals = sumByCurrency(expenses);
  const ccyKeys = [
    ...new Set([...advTotals.keys(), ...expTotals.keys()]),
  ].sort();
  const regInTotals = sumRegisterByType(registerTx, "IN");
  const regOutTotals = sumRegisterByType(registerTx, "OUT");
  const stockValTotals = sumStockValuationByCurrency(stockRows);
  const stockQtySum = stockRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  const colPersonnel = escapeHtml(t("personnel.settlementPrintColPersonnel"));

  const advRowsHtml = advances
    .map((a) => {
      const br =
        a.branchId != null && a.branchId > 0
          ? branchNameById.get(a.branchId)?.trim() ||
            (a as AdvanceListItem).branchName?.trim() ||
            dash
          : dash;
      const note = a.description?.trim() ? escapeHtml(a.description.trim()) : dash;
      const personCell = byBranch
        ? escapeHtml(
            (a as AdvanceListItem).personnelFullName?.trim() ||
              a.heldRegisterSourcePersonnelFullName?.trim() ||
              dash
          )
        : "";
      const personCols = byBranch ? `<td>${personCell}</td>` : "";
      return `<tr>
        <td>${escapeHtml(formatLocaleDate(a.advanceDate, locale, dash))}</td>
        ${personCols}
        <td>${escapeHtml(br)}</td>
        <td class="num">${escapeHtml(formatMoneyDash(a.amount, dash, locale, a.currencyCode))}</td>
        <td>${escapeHtml(a.currencyCode)}</td>
        <td>${escapeHtml(sourceAbbrev(t, a.sourceType))}</td>
        <td class="num">${a.effectiveYear}</td>
        <td>${note}</td>
      </tr>`;
    })
    .join("");


  const expRowsHtml = expenses
    .map((row) => {
      const { linkTypeKey, employeeName } = resolveNonAdvanceRow(row, dash);
      const bid = row.branchId;
      const branchCell =
        bid != null && bid > 0
          ? branchNameById.get(bid)?.trim() || `#${bid}`
          : orgBranch;
      const cat =
        txCategoryLine(row.mainCategory, row.category, t)?.trim() || dash;
      const pay =
        expensePaymentSourceLabel(row.expensePaymentSource, t)?.trim() || dash;
      const note = row.description?.trim()
        ? escapeHtml(row.description.trim())
        : dash;
      const personCell = byBranch ? escapeHtml(employeeName) : "";
      const personCols = byBranch ? `<td>${personCell}</td>` : "";
      return `<tr>
        <td>${escapeHtml(formatLocaleDate(row.transactionDate, locale, dash))}</td>
        ${personCols}
        <td>${escapeHtml(linkTypeLabel(linkTypeKey, t))}</td>
        <td>${escapeHtml(branchCell)}</td>
        <td>${escapeHtml(cat)}</td>
        <td>${escapeHtml(pay)}</td>
        <td class="num">${escapeHtml(formatMoneyDash(row.amount, dash, locale, row.currencyCode))}</td>
        <td>${escapeHtml(row.currencyCode)}</td>
        <td>${note}</td>
      </tr>`;
    })
    .join("");


  const advHeadPerson = byBranch ? `<th>${colPersonnel}</th>` : "";
  const expHeadPerson = byBranch ? `<th>${colPersonnel}</th>` : "";

  const isClosure = target.scope === "personnel" && target.isYearClosure === true;
  const titleSafe = escapeHtml(target.title);
  const docTitle = escapeHtml(
    isClosure
      ? t("personnel.settlementPrintDocTitleClosure").replace(
          "{year}",
          yf != null ? String(yf) : "",
        )
      : byBranch
        ? t("personnel.settlementPrintDocTitleBranch")
        : t("personnel.settlementPrintDocTitle")
  );
  const seasonArrivalIso =
    !byBranch && target.scope === "personnel"
      ? String(
          personnelRowForPrint?.seasonArrivalDate ??
            target.seasonArrivalDate ??
            ""
        ).trim().slice(0, 10)
      : "";
  const seasonArrivalFormatted =
    seasonArrivalIso && /^\d{4}-\d{2}-\d{2}$/.test(seasonArrivalIso)
      ? formatLocaleDate(seasonArrivalIso, locale, dash)
      : "";
  const seasonArrivalMetaLi =
    !byBranch && seasonArrivalFormatted
      ? `<li><span class="mk">${escapeHtml(t("personnel.seasonArrivalDate"))}</span> ${escapeHtml(seasonArrivalFormatted)}</li>`
      : "";

  const todayIso = localIsoDate();
  const seasonTenureSectionHtml =
    !byBranch &&
    target.scope === "personnel" &&
    seasonArrivalIso &&
    /^\d{4}-\d{2}-\d{2}$/.test(seasonArrivalIso)
      ? renderPersonnelSeasonTenureBlock({
          seasonArrivalIso,
          todayIso,
          monthlySalary: personnelRowForPrint?.salary ?? null,
          currencyCode: personnelRowForPrint?.currencyCode ?? "TRY",
          t,
          locale,
          dash,
        })
      : "";
  const genLabel = escapeHtml(t("personnel.settlementPrintGenerated"));
  const genValue = escapeHtml(
    new Date().toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    })
  );

  const secAdv = escapeHtml(t("personnel.settlementPrintSectionAdvances"));
  const secExp = escapeHtml(t("personnel.settlementPrintSectionExpenses"));
  const secTot = escapeHtml(t("personnel.settlementPrintSectionTotals"));
  const secNotes = escapeHtml(t("personnel.settlementPrintSectionNotes"));
  const colComb = escapeHtml(t("personnel.settlementPrintColCombined"));

  const seasonScopeNoteHtml =
    yf != null
      ? `<p class="meta meta-compact">${escapeHtml(t("personnel.settlementPrintSeasonSalaryOmitted"))}</p>`
      : "";

  const overlapHintHtml =
    byBranch && bp && bp.includePersonnelNonAdvanceExpenses && bp.includeRegisterLedger
      ? `<p class="meta meta-compact">${escapeHtml(t("branch.branchPdfOverlapHint"))}</p>`
      : "";

  const seasonScopeMetaLi = `<li><span class="mk">${escapeHtml(t("personnel.settlementPrintMetaSeasonScope"))}</span> ${
    yf != null
      ? escapeHtml(String(yf))
      : escapeHtml(t("personnel.settlementPrintMetaAllPeriods"))
  }</li>`;

  const stockSectionHtml =
    byBranch && bp ? buildBranchStockSectionHtml(stockRows, bp, t, locale, dash) : "";

  const registerSectionHtml =
    byBranch && bp && bp.includeRegisterLedger
      ? bp.registerLedgerDetailMode === "summary"
        ? buildRegisterSummarySectionHtml(
            registerTx,
            regInTotals,
            regOutTotals,
            t,
            locale,
            dash
          )
        : buildBranchRegisterSectionHtml(registerTx, bp, t, locale, dash)
      : "";

  const showAdvSection = !byBranch || bp!.includeAdvances;
  const showExpSection = !byBranch || bp!.includePersonnelNonAdvanceExpenses;

  const advTableHtml = showAdvSection
    ? byBranch && bp!.advancesDetailMode === "summary"
      ? buildAdvancesSummarySectionHtml(advances, advTotals, t, locale, dash)
      : advRowsHtml
        ? `<h2 class="sec-adv">${secAdv} (${advances.length})</h2>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColDate"))}</th>
        ${advHeadPerson}
        <th>${escapeHtml(t("personnel.tableBranch"))}</th>
        <th class="num">${escapeHtml(t("personnel.nonAdvanceExpensesColAmount"))}</th>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColCurrency"))}</th>
        <th>${escapeHtml(t("personnel.sourceType"))}</th>
        <th class="num">${escapeHtml(t("personnel.effectiveYear"))}</th>
        <th>${escapeHtml(t("personnel.note"))}</th>
      </tr>
    </thead>
    <tbody>${advRowsHtml}</tbody>
  </table>`
        : `<h2 class="sec-adv">${secAdv} (${advances.length})</h2>${emptyNote(t)}`
    : "";

  const expTableHtml = showExpSection
    ? byBranch && bp!.personnelExpensesDetailMode === "summary"
      ? buildPersonnelExpensesSummarySectionHtml(expenses, expTotals, t, locale, dash)
      : expRowsHtml
        ? `<h2 class="sec-exp">${secExp} (${expenses.length})</h2>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColDate"))}</th>
        ${expHeadPerson}
        <th>${escapeHtml(t("personnel.nonAdvanceExpenseLinkType"))}</th>
        <th>${escapeHtml(t("personnel.tableBranch"))}</th>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColCategory"))}</th>
        <th>${escapeHtml(t("branch.txColExpensePayment"))}</th>
        <th class="num">${escapeHtml(t("personnel.nonAdvanceExpensesColAmount"))}</th>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColCurrency"))}</th>
        <th>${escapeHtml(t("personnel.note"))}</th>
      </tr>
    </thead>
    <tbody>${expRowsHtml}</tbody>
  </table>`
        : `<h2 class="sec-exp">${secExp} (${expenses.length})</h2>${emptyNote(t)}`
    : "";

  const totalsCardsHtml =
    byBranch && bp
      ? buildBranchTotalsCardsHtml(t, locale, dash, bp, {
          advTotals,
          expTotals,
          regInTotals,
          regOutTotals,
          stockValTotals,
          stockQtySum,
          registerRaw: registerTx,
        })
      : ccyKeys.length === 0
        ? `<p class="meta settlement-totals-empty">${escapeHtml(dash)}</p>`
        : ccyKeys
            .map((ccy) => {
              const a = advTotals.get(ccy) ?? 0;
              const e = expTotals.get(ccy) ?? 0;
              const sum = a + e;
              return `<div class="settlement-totals-currency">
        <div class="settlement-totals-ccy">${escapeHtml(ccy)}</div>
        <div class="settlement-totals-lines">
          <div class="settlement-totals-line">
            <span class="settlement-totals-k">${secAdv}</span>
            <span class="settlement-totals-v num">${escapeHtml(formatMoneyDash(a, dash, locale, ccy))}</span>
          </div>
          <div class="settlement-totals-line">
            <span class="settlement-totals-k">${secExp}</span>
            <span class="settlement-totals-v num">${escapeHtml(formatMoneyDash(e, dash, locale, ccy))}</span>
          </div>
        </div>
        <div class="settlement-totals-grand" role="group" aria-label="${colComb}">
          <span class="settlement-totals-grand-k">${colComb}</span>
          <span class="settlement-totals-grand-v num">${escapeHtml(formatMoneyDash(sum, dash, locale, ccy))}</span>
        </div>
      </div>`;
            })
            .join("");

  const sourceBreakdownHtml =
    byBranch && bp
      ? buildBranchSourceBreakdownHtml(advances, expenses, registerTx, bp, t, locale, dash)
      : "";

  // Şube özeti (P&L + kaynak dağılımı + nakit nerede). Şubede: yönetici özeti olarak ÜSTTE.
  const summaryTitle = byBranch
    ? escapeHtml(t("branch.branchPdfSummaryTitle"))
    : secTot;
  const summaryBlockHtml = `<h2 class="sec-tot">${summaryTitle}</h2>
  <div class="settlement-totals-wrap">${totalsCardsHtml}</div>
  ${byBranch ? `<p class="meta meta-compact">${escapeHtml(t("branch.branchPdfPnlScopeNote"))}</p>` : ""}
  ${sourceBreakdownHtml}`;

  const notesBlocksHtml =
    generalNotes.length === 0 || (byBranch && bp && !bp.includeNotes)
      ? ""
      : `<h2 class="sec-notes">${secNotes} (${generalNotes.length})</h2>
  <div class="settlement-notes-wrap">
    ${generalNotes
      .map(
        (n) => `<div class="settlement-note-card">
      <div class="settlement-note-meta">${escapeHtml(formatLocaleDateTime(n.createdAt, locale))}</div>
      <div class="settlement-note-body">${escapeHtml(n.body)}</div>
    </div>`
      )
      .join("")}
  </div>`;

  const capNote =
    byBranch && bp && bp.includeAdvances
      ? `<p class="meta meta-compact">${escapeHtml(
          t("personnel.settlementPrintBranchAdvancesCapNote").replace(
            "{n}",
            String(BRANCH_ADVANCES_PRINT_LIMIT)
          )
        )}</p>`
      : "";

  const downloadFileName = safeDownloadFilename(
    yf != null ? `${target.title}-${yf}` : target.title
  );
  const heroBadge = escapeHtml(
    isClosure
      ? t("personnel.settlementPrintModeClosure")
      : byBranch
        ? t("personnel.settlementPrintModeBranch")
        : t("personnel.settlementPrintModePersonnel")
  );
  const closureBannerHtml = isClosure
    ? `<div style="margin:14px 0 4px;padding:12px 16px;border:2px solid #047857;border-radius:10px;background:#ecfdf5;">
        <p style="margin:0;font-size:15px;font-weight:800;letter-spacing:.02em;color:#064e3b;">${escapeHtml(
          t("personnel.settlementPrintClosureBannerTitle").replace(
            "{year}",
            yf != null ? String(yf) : "",
          ),
        )}</p>
        <p style="margin:4px 0 0;font-size:11px;line-height:1.5;color:#065f46;">${escapeHtml(
          t("personnel.settlementPrintClosureBannerHint"),
        )}</p>
      </div>`
    : "";

  const closureSummary =
    isClosure && target.scope === "personnel" ? target.closureSummary : undefined;
  const closureCardsHtml = isClosure
    ? (() => {
        const cc =
          (closureSummary?.expectedSalaryCurrency?.trim().toUpperCase() ||
            ccyKeys[0] ||
            "TRY") || "TRY";
        const advTaken = advTotals.get(cc) ?? 0;
        const expTaken = expTotals.get(cc) ?? 0;
        const taken = advTaken + expTaken;
        const salary = closureSummary?.expectedSalaryAmount ?? null;
        const settled = closureSummary?.salaryBalanceSettled === true;
        const paid = closureSummary?.paidAtClosureAmount ?? null;
        const money = (n: number) => escapeHtml(formatMoneyDash(n, dash, locale, cc));

        const arrival =
          closureSummary?.arrivalDate &&
          /^\d{4}-\d{2}-\d{2}$/.test(closureSummary.arrivalDate)
            ? formatLocaleDate(closureSummary.arrivalDate, locale, dash)
            : seasonArrivalFormatted ?? dash;
        const departure =
          closureSummary?.departureDate &&
          /^\d{4}-\d{2}-\d{2}$/.test(closureSummary.departureDate)
            ? formatLocaleDate(closureSummary.departureDate, locale, dash)
            : dash;
        const workedDays =
          closureSummary?.workedDays != null && closureSummary.workedDays > 0
            ? String(closureSummary.workedDays)
            : dash;

        const card = (
          label: string,
          big: string,
          sub: string,
          accent: string,
        ) => `<div style="flex:1 1 200px;min-width:180px;border:1px solid #d4d4d8;border-top:3px solid ${accent};border-radius:10px;padding:12px 14px;background:#ffffff;">
            <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#71717a;">${escapeHtml(label)}</p>
            <p style="margin:6px 0 0;font-size:18px;font-weight:800;color:#18181b;">${big}</p>
            ${sub ? `<p style="margin:4px 0 0;font-size:11px;line-height:1.5;color:#52525b;">${sub}</p>` : ""}
          </div>`;

        const workCard = card(
          t("personnel.settlementPrintClosureCardWorkPeriod"),
          escapeHtml(arrival),
          `${escapeHtml(t("personnel.settlementPrintClosureCardDeparture"))}: ${escapeHtml(departure)}<br/>${escapeHtml(t("personnel.settlementPrintClosureCardWorkedDays"))}: ${escapeHtml(workedDays)}`,
          "#0ea5e9",
        );
        const takenCard = card(
          t("personnel.settlementPrintClosureCardTaken"),
          money(taken),
          `${escapeHtml(t("personnel.settlementPrintClosureCardTakenAdv"))}: ${money(advTaken)} · ${escapeHtml(t("personnel.settlementPrintClosureCardTakenExp"))}: ${money(expTaken)}`,
          "#d97706",
        );
        const salaryCard = card(
          t("personnel.settlementPrintClosureCardSalary"),
          salary != null ? money(salary) : dash,
          "",
          "#7c3aed",
        );
        const paidCard = card(
          t("personnel.settlementPrintClosureCardPaid"),
          settled && paid != null && paid > 0
            ? money(paid)
            : escapeHtml(t("personnel.settlementPrintClosureCardPaidNone")),
          settled && closureSummary?.salaryPaymentSource
            ? escapeHtml(sourceAbbrev(t, closureSummary.salaryPaymentSource))
            : "",
          "#047857",
        );

        return `<div style="display:flex;flex-wrap:wrap;gap:10px;margin:14px 0;">${workCard}${takenCard}${salaryCard}${paidCard}</div>`;
      })()
    : "";
  const escToolbarAria = escapeHtml(t("personnel.settlementPrintToolbarAria"));
  const escPrintBtn = escapeHtml(t("personnel.settlementPrintActionPrint"));
  const escDownloadBtn = escapeHtml(t("personnel.settlementPrintActionDownload"));
  const escShareBtn = escapeHtml(t("personnel.settlementPrintActionShare"));
  const escToolbarHint = escapeHtml(t("personnel.settlementPrintToolbarHint"));
  const escProfilePhotoAlt = escapeHtml(t("personnel.profilePhotoAvatarAria"));
  const personnelPhotoBlock =
    target.scope === "personnel" && personnelProfilePhotoDataUrl
      ? `<div class="report-header-photo-wrap"><img class="report-header-photo" src="${personnelProfilePhotoDataUrl.replace(/"/g, "&quot;")}" width="96" height="96" alt="${escProfilePhotoAlt}"/></div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${titleSafe} — ${docTitle}</title>
  <style>${DOC_STYLES}</style>
</head>
<body>
  <nav class="no-print settlement-toolbar" role="toolbar" aria-label="${escToolbarAria}">
    <div class="settlement-toolbar-inner">
      <button type="button" id="sbtn-print" class="settlement-btn settlement-btn-secondary" onclick="settlementDoPrint()">${escPrintBtn}</button>
      <button type="button" id="sbtn-download" class="settlement-btn settlement-btn-primary" onclick="settlementDoDownload()">${escDownloadBtn}</button>
      <button type="button" id="sbtn-share" class="settlement-btn settlement-btn-secondary" style="display:none" onclick="settlementDoShare()">${escShareBtn}</button>
    </div>
    <p class="settlement-toolbar-hint">${escToolbarHint}</p>
  </nav>
  <main class="settlement-doc">
  ${
    isClosure
      ? `<div style="text-align:right;font-size:10px;color:#71717a;margin:0 0 6px;"><span style="font-weight:700;color:#3f3f46;">${genLabel}</span> ${genValue}</div>`
      : ""
  }
  <header class="report-header">
    <div class="report-header-inner">
      <div class="report-header-main">
        <div class="report-hero-badge">${heroBadge}</div>
        <h1 class="report-title">${titleSafe}</h1>
        <p class="report-tagline">${docTitle}</p>
        ${
          isClosure || (!seasonScopeMetaLi && !seasonArrivalMetaLi)
            ? ""
            : `<ul class="report-meta">
          ${seasonScopeMetaLi}
          ${seasonArrivalMetaLi}
        </ul>`
        }
      </div>
      <div class="report-header-aside">
        ${isClosure ? "" : `<div class="report-gen"><span class="report-gen-k">${genLabel}</span> ${genValue}</div>`}
        ${personnelPhotoBlock}
      </div>
    </div>
  </header>
  ${closureBannerHtml}
  ${closureCardsHtml}
  ${byBranch ? summaryBlockHtml : ""}
  ${isClosure ? "" : seasonTenureSectionHtml}
  ${salaryCostSectionHtml}
  ${stockSectionHtml}
  ${advTableHtml}
  ${expTableHtml}
  ${registerSectionHtml}

  ${byBranch ? "" : summaryBlockHtml}
  ${notesBlocksHtml}
  ${isClosure ? "" : `${overlapHintHtml}${capNote}${seasonScopeNoteHtml}`}
  <p class="footer-note">${escapeHtml(t("personnel.settlementPrintFooterHint"))}</p>
  </main>
<script>
window.__sfn=${JSON.stringify(downloadFileName)};
(function(){
  var preparing=${JSON.stringify(t("personnel.settlementPrintPreparing"))};
  function pdfName(){return window.__settlementPdfName||((window.__sfn||'rapor').replace(/\\.html?$/i,'')+'.pdf');}
  function setBusy(b){
    ['sbtn-print','sbtn-download','sbtn-share'].forEach(function(id){var el=document.getElementById(id);if(el)el.disabled=b;});
    var d=document.getElementById('sbtn-download');
    if(d){ if(b){if(!d.dataset.label)d.dataset.label=d.textContent;d.textContent=preparing;} else if(d.dataset.label){d.textContent=d.dataset.label;} }
  }
  function ensureUrl(){
    var mk=window.__settlementMakePdf;
    if(typeof mk!=='function') return Promise.reject(new Error('no-pdf'));
    return Promise.resolve(mk());
  }
  function dl(url){var a=document.createElement('a');a.href=url;a.download=pdfName();document.body.appendChild(a);a.click();a.remove();}
  function fallbackHtml(){
    var h='<!DOCTYPE html>\\n'+document.documentElement.outerHTML;
    var b=new Blob([h],{type:'text/html;charset=utf-8'});
    var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=window.__sfn;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(u);},1500);
  }
  window.settlementDoPrint=function(){window.print();};
  window.settlementDoDownload=function(){
    setBusy(true);
    ensureUrl().then(function(url){dl(url);}).catch(function(){fallbackHtml();}).then(function(){setBusy(false);});
  };
  window.settlementDoShare=function(){
    setBusy(true);
    ensureUrl().then(function(url){
      return fetch(url).then(function(r){return r.blob();}).then(function(blob){
        var file=new File([blob],pdfName(),{type:'application/pdf'});
        if(navigator.canShare&&navigator.canShare({files:[file]})){return navigator.share({files:[file],title:pdfName()});}
        dl(url);
      });
    }).catch(function(){}).then(function(){setBusy(false);});
  };
  try{
    var probe=new File([new Blob()],'x.pdf',{type:'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[probe]})){var s=document.getElementById('sbtn-share');if(s)s.style.display='';}
  }catch(e){}
})();
</script>
</body>
</html>`;

  return { html, downloadFileName };
}

/**
 * Mutabakat belgesini yeni bir sekmede açar (yazdır / indir butonlarıyla).
 * Popup aynı tıklama zincirinde açılmalı; veri çekme sonra gelir.
 */
