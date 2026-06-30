"use client";

import { useCallback, useMemo, type RefObject } from "react";
import { parseLocaleAmount } from "@/shared/lib/locale-amount";
import { computeLineAmountMismatch } from "@/modules/order-account-statement/components/oas-helpers";
import type { LineDraft } from "@/modules/order-account-statement/components/oas-types";
import type { SelectedShipmentSource } from "@/modules/order-account-statement/hooks/useOasShipmentSelection";

/**
 * Form akışından türeyen tüm "durum" değerleri tek noktada:
 *  - `focusLineEditor` / `focusLineField`: DOM odak yardımcıları (line editor + alan içi),
 *  - `lineAddBlocked`: shipmentBased + strict modda satır eklemeyi engelle,
 *  - `mobileLineIssueCount`: mobil banner'a sayı,
 *  - flow göstergesi için `hasShipmentSelected` / `hasDocumentBasics` / `hasReadyLine`
 *    ve birleşik `flowCurrentStep` (1..4).
 *
 * SRP: yalnızca türetme. Pure (DOM helper'ları hariç — onlar da side-effect yok, yalnız
 * okur/odaklar).
 */
type Params = {
  locale: "tr" | "en";
  lines: LineDraft[];
  showQuantityColumn: boolean;
  creationMode: "manual" | "shipmentBased";
  shipmentLinkMode: "strict" | "partial";
  selectedShipmentSource: SelectedShipmentSource | null;
  companyName: string;
  branchName: string;
  documentTitle: string;
  linesSectionRef: RefObject<HTMLDivElement | null>;
};

export function useOasFlowDerived(p: Params) {
  const focusLineEditor = useCallback((lineId: string) => {
    p.linesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-line-desc-id="${lineId}"]`);
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(el.value.length, el.value.length);
      } catch {
        // no-op
      }
    }, 220);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusLineField = useCallback(
    (lineId: string, field: "description" | "amount") => {
      window.setTimeout(() => {
        // Mobil kart ve masaüstü tablo aynı attr'ları taşır; o an GÖRÜNÜR olanı seç
        // (gizli olanın offsetParent'ı null). Böylece akış her iki düzende çalışır.
        const candidates = document.querySelectorAll<HTMLInputElement>(
          `[data-line-id="${lineId}"][data-line-field="${field}"]`
        );
        const el =
          Array.from(candidates).find((x) => x.offsetParent !== null) ?? candidates[0];
        if (!el) return;
        el.focus();
        try {
          el.setSelectionRange(el.value.length, el.value.length);
        } catch {
          // no-op
        }
      }, 120);
    },
    []
  );

  const lineAddBlocked = p.creationMode === "shipmentBased" && p.shipmentLinkMode === "strict";

  const mobileLineIssueCount = useMemo(() => {
    return p.lines.filter((line) => {
      const amount = parseLocaleAmount((line.amountText ?? "").trim(), p.locale) || 0;
      const amountMismatch = p.showQuantityColumn ? computeLineAmountMismatch(line, p.locale) : null;
      return !line.description.trim() || amount <= 0 || amountMismatch != null;
    }).length;
  }, [p.lines, p.locale, p.showQuantityColumn]);

  const hasShipmentSelected =
    p.creationMode !== "shipmentBased" || p.selectedShipmentSource != null;
  const hasDocumentBasics = Boolean(
    p.companyName.trim() && p.branchName.trim() && p.documentTitle.trim()
  );
  const hasReadyLine = p.lines.some((line) => {
    const amount = parseLocaleAmount((line.amountText ?? "").trim(), p.locale) || 0;
    return line.description.trim().length > 0 && amount > 0;
  });

  const flowCurrentStep = useMemo(() => {
    if (!hasShipmentSelected) return 2;
    if (!hasDocumentBasics) return p.creationMode === "shipmentBased" ? 3 : 2;
    if (!hasReadyLine) return 3;
    return 4;
  }, [p.creationMode, hasDocumentBasics, hasReadyLine, hasShipmentSelected]);

  return {
    focusLineEditor,
    focusLineField,
    lineAddBlocked,
    mobileLineIssueCount,
    hasShipmentSelected,
    hasDocumentBasics,
    hasReadyLine,
    flowCurrentStep,
  };
}
