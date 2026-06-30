"use client";

import { useState } from "react";
import type { StatementLayoutVariant } from "@/modules/order-account-statement/components/OrderAccountStatementPaper";
import type { OrderAccountContentPreset } from "@/modules/order-account-statement/components/oas-types";

/**
 * Önizleme + sunum tercihlerinin state container'ı:
 * layout/preset/kolon toggle, modal aç-kapa, mobil/masaüstü görünüm tercihleri,
 * portal mount bayrağı, belge tarihi (sabit, oturum başına).
 *
 * SRP: state. Portal mount effect'i orchestrator'da kalır (component ağacında
 * mount/unmount sırası kritik).
 */
export function useOasPreview() {
  // Belge tarihi oturum başına sabittir; lazy init ile rerender'da değişmez.
  const [statementDate] = useState(() => new Date());

  const [layoutVariant, setLayoutVariant] = useState<StatementLayoutVariant>("corporate");
  const [contentPreset, setContentPreset] = useState<OrderAccountContentPreset>("custom");
  const [showQuantityColumn, setShowQuantityColumn] = useState(true);

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewToolsCollapsed, setPreviewToolsCollapsed] = useState(false);

  const [portalMounted, setPortalMounted] = useState(false);

  return {
    statementDate,

    layoutVariant,
    setLayoutVariant,
    contentPreset,
    setContentPreset,
    showQuantityColumn,
    setShowQuantityColumn,

    previewModalOpen,
    setPreviewModalOpen,
    previewToolsCollapsed,
    setPreviewToolsCollapsed,

    portalMounted,
    setPortalMounted,
  };
}
