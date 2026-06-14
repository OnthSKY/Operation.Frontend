"use client";

import { useCallback, useState } from "react";
import type {
  MultiActionStep,
  MultiActionStepId,
  MultiActionStepState,
} from "@/modules/order-account-statement/components/OasMultiActionProgressModal";

/**
 * Order-account-statement çoklu eylem (download / invoice / system) progress modal'ı için
 * state container.
 *
 * SRP: yalnızca state + tek adımı state geçirme helper'ı sağlar. Hangi adımların hangi koşulda
 * "skipped" olacağına çağıran orchestrator karar verir (`begin(steps)` ile başlatır).
 */
export function useOasMultiAction() {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<MultiActionStep[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const setStepState = useCallback((id: MultiActionStepId, state: MultiActionStepState) => {
    setSteps((prev) => prev.map((x) => (x.id === id ? { ...x, state } : x)));
  }, []);

  /** Yeni bir oturum başlat — hata temizle, adımları yerleştir, running'i aç. */
  const begin = useCallback((initialSteps: readonly MultiActionStep[]) => {
    setError("");
    setRunning(true);
    setSteps(initialSteps.slice());
  }, []);

  /** Onay modal'ını sadece aç (henüz running başlatmadan). */
  const openConfirm = useCallback(() => {
    setOpen(true);
    setError("");
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return {
    open,
    steps,
    running,
    error,
    setOpen,
    setRunning,
    setError,
    setStepState,
    begin,
    openConfirm,
    close,
  };
}
