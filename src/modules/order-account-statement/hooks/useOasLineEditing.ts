"use client";

import { useCallback } from "react";
import {
  emptyLine,
  newId,
} from "@/modules/order-account-statement/components/oas-helpers";
import type { LineDraft } from "@/modules/order-account-statement/components/oas-types";

/**
 * Sipariş kalemleri için editing + sürükle-bırak handler'ları.
 *
 * SRP: yalnızca davranış (callback'ler). State (`lines`, drag id'leri) ve focus
 * yardımcıları dışarıdan parametre olarak gelir; hook stateless'tir.
 *
 * Bu sayede orchestrator state container hook'larıyla (useOasLines + useOasPreview ref'leri)
 * gevşek bağlı kalır.
 */
type Params = {
  lines: LineDraft[];
  setLines: React.Dispatch<React.SetStateAction<LineDraft[]>>;
  lineAddBlocked: boolean;
  focusLineEditor: (id: string) => void;
  focusLineField: (id: string, field: "description" | "amount") => void;
  draggingLineId: string | null;
  setDraggingLineId: React.Dispatch<React.SetStateAction<string | null>>;
  setDragOverLineId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useOasLineEditing(params: Params) {
  const {
    lines,
    setLines,
    lineAddBlocked,
    focusLineEditor,
    focusLineField,
    draggingLineId,
    setDraggingLineId,
    setDragOverLineId,
  } = params;

  const handleAddLine = useCallback(() => {
    if (lineAddBlocked) return;
    const id = newId();
    setLines((prev) => [
      ...prev,
      {
        ...emptyLine(),
        id,
        lineSource: lineAddBlocked ? "shipment" : "manual",
        manualReasonCode: lineAddBlocked ? null : "OPS_OTHER",
      },
    ]);
    focusLineEditor(id);
  }, [focusLineEditor, lineAddBlocked, setLines]);

  const moveLine = useCallback(
    (fromId: string, toId: string) => {
      if (!fromId || !toId || fromId === toId) return;
      setLines((prev) => {
        const fromIndex = prev.findIndex((x) => x.id === fromId);
        const toIndex = prev.findIndex((x) => x.id === toId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) return prev;
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [setLines]
  );

  const beginLineDrag = useCallback(
    (lineId: string) => {
      setDraggingLineId(lineId);
      setDragOverLineId(lineId);
    },
    [setDragOverLineId, setDraggingLineId]
  );

  const finishLineDrag = useCallback(() => {
    setDraggingLineId(null);
    setDragOverLineId(null);
  }, [setDragOverLineId, setDraggingLineId]);

  const hoverLineDropTarget = useCallback(
    (lineId: string) => {
      if (!draggingLineId || draggingLineId === lineId) return;
      setDragOverLineId(lineId);
    },
    [draggingLineId, setDragOverLineId]
  );

  const dropLineOnTarget = useCallback(
    (lineId: string) => {
      if (!draggingLineId || draggingLineId === lineId) {
        finishLineDrag();
        return;
      }
      moveLine(draggingLineId, lineId);
      finishLineDrag();
    },
    [draggingLineId, finishLineDrag, moveLine]
  );

  const handleDuplicateLastLine = useCallback(() => {
    if (lineAddBlocked) return;
    let createdId = "";
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      createdId = newId();
      return [
        ...prev,
        {
          ...last,
          id: createdId,
          amount: 0,
          amountText: "",
          isGift: false,
          lineSource: lineAddBlocked ? "shipment" : "manual",
          manualReasonCode: lineAddBlocked ? null : (last.manualReasonCode ?? "OPS_OTHER"),
          sourceShipmentLineId: null,
          sourceWarehouseMovementId: null,
        },
      ];
    });
    if (createdId) focusLineEditor(createdId);
  }, [focusLineEditor, lineAddBlocked, setLines]);

  const handleMobileLineEnter = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      lineId: string,
      field: "description" | "amount"
    ) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (field === "description") {
        focusLineField(lineId, "amount");
        return;
      }
      const idx = lines.findIndex((x) => x.id === lineId);
      if (idx >= 0 && idx < lines.length - 1) {
        const next = lines[idx + 1];
        if (next) focusLineField(next.id, "description");
        return;
      }
      handleAddLine();
    },
    [focusLineField, handleAddLine, lines]
  );

  return {
    handleAddLine,
    handleDuplicateLastLine,
    handleMobileLineEnter,
    moveLine,
    beginLineDrag,
    finishLineDrag,
    hoverLineDropTarget,
    dropLineOnTarget,
  };
}
