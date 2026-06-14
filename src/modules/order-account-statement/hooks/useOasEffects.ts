"use client";

import { useEffect } from "react";
import {
  fetchCounterpartySuggestions,
  type CounterpartySuggestionRow,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import type { LineDraft } from "@/modules/order-account-statement/components/oas-types";

/**
 * Orchestrator'da çoğalmış küçük (yardımcı) effect'leri tek noktaya toplar:
 * - şube id'sine göre cari/şube alanı doldur,
 * - portal mount sinyali,
 * - line.quantity/unit/unitPrice doluysa qty kolonunu otomatik aç,
 * - preview modal açıkken body scroll kilidi + Escape ile kapama,
 * - URL'den gelen orderKey'i state'e kopyala,
 * - counterparty suggestion'larını ilk render'da yükle.
 *
 * SRP: yalnızca yan etkiler. Tüm bağımlılıklar dışarıdan setter/callback olarak gelir.
 */
type BranchOption = { id: number; name: string };

type Params = {
  branches: BranchOption[];
  linkedBranchId: string;
  setBranchName: (name: string) => void;
  setCustomerAccountIdText: (text: string) => void;

  setPortalMounted: (v: boolean) => void;

  lines: LineDraft[];
  setShowQuantityColumn: (v: boolean) => void;

  previewModalOpen: boolean;
  setPreviewModalOpen: (v: boolean) => void;
  setPreviewToolsCollapsed: (v: boolean) => void;

  orderKeyFromQuery: string;
  setOrderDocumentKey: (key: string) => void;

  setSuggestions: (rows: CounterpartySuggestionRow[]) => void;
  setSuggestionsBusy: (v: boolean) => void;
};

export function useOasEffects(p: Params) {
  // Şube seçildiğinde cari id'yi şube id ile başlayan bir taslak değere getir,
  // belge başlığındaki şube adını da otomatik eşle.
  useEffect(() => {
    const branchIdText = p.linkedBranchId.trim();
    const branchIdNum = Number.parseInt(branchIdText, 10);
    if (!Number.isFinite(branchIdNum) || branchIdNum <= 0) return;
    p.setCustomerAccountIdText(`${branchIdNum}001`);
    const selectedBranch = p.branches.find((b) => b.id === branchIdNum);
    if (selectedBranch?.name?.trim()) p.setBranchName(selectedBranch.name.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.branches, p.linkedBranchId]);

  // Portal hazırlığı — SSR/CSR sınırını işaretler.
  useEffect(() => {
    p.setPortalMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Adet/birim/birim fiyat doluysa qty kolonunu zorla aç (PDF ile form aynı kalsın).
  useEffect(() => {
    const has = p.lines.some(
      (l) =>
        String(l.quantityText ?? "").trim() !== "" ||
        String(l.unitText ?? "").trim() !== "" ||
        String(l.unitPriceText ?? "").trim() !== ""
    );
    if (has) p.setShowQuantityColumn(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.lines]);

  // Önizleme modal: body scroll kilidi + Escape ile kapama.
  useEffect(() => {
    if (!p.previewModalOpen) {
      p.setPreviewToolsCollapsed(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.previewModalOpen]);

  useEffect(() => {
    if (!p.previewModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") p.setPreviewModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.previewModalOpen]);

  // URL'den gelen orderKey → state.
  useEffect(() => {
    if (!p.orderKeyFromQuery) return;
    p.setOrderDocumentKey(p.orderKeyFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.orderKeyFromQuery]);

  // İlk render'da counterparty önerileri.
  useEffect(() => {
    let alive = true;
    p.setSuggestionsBusy(true);
    void fetchCounterpartySuggestions()
      .then((rows) => {
        if (!alive) return;
        p.setSuggestions(rows);
      })
      .catch(() => {
        if (!alive) return;
        p.setSuggestions([]);
      })
      .finally(() => {
        if (!alive) return;
        p.setSuggestionsBusy(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
