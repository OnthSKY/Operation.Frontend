"use client";

import { useState } from "react";
import type {
  LineDraft,
  PaidDraft,
  PromoDraft,
} from "@/modules/order-account-statement/components/oas-types";
import {
  emptyLine,
} from "@/modules/order-account-statement/components/oas-helpers";

/**
 * Sipariş kalemleri (lines), tahsilatlar (paidLines), promosyonlar (promoLines),
 * önceki bakiye + alınan avans alanları ve sürükle-bırak için seçili satır
 * kimliklerinin state container'ı.
 *
 * SRP: state. Add/duplicate/remove/reorder logic'i — orchestrator'da kullanılan
 * handler'lar lines/paid/promo'yu manipüle ediyor — şimdilik orchestrator'da
 * bırakıldı; faz 3'te `actions` olarak hook'a alınacak.
 */
export function useOasLines() {
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLine()]);
  const [paidLines, setPaidLines] = useState<PaidDraft[]>(() => []);
  const [promoLines, setPromoLines] = useState<PromoDraft[]>(() => []);

  const [advanceText, setAdvanceText] = useState("");
  const [receivedAdvancePostToLedger, setReceivedAdvancePostToLedger] = useState(true);
  const [previousBalanceText, setPreviousBalanceText] = useState("");

  const [draggingLineId, setDraggingLineId] = useState<string | null>(null);
  const [dragOverLineId, setDragOverLineId] = useState<string | null>(null);

  return {
    lines,
    setLines,
    paidLines,
    setPaidLines,
    promoLines,
    setPromoLines,

    advanceText,
    setAdvanceText,
    receivedAdvancePostToLedger,
    setReceivedAdvancePostToLedger,
    previousBalanceText,
    setPreviousBalanceText,

    draggingLineId,
    setDraggingLineId,
    dragOverLineId,
    setDragOverLineId,
  };
}
