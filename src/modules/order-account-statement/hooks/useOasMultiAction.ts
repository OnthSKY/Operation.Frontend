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
  /** Akış tamamlandıktan sonra geri sayım (sn). 0 = inaktif. */
  const [redirectInSec, setRedirectInSec] = useState(0);

  const setStepState = useCallback((id: MultiActionStepId, state: MultiActionStepState) => {
    setSteps((prev) => prev.map((x) => (x.id === id ? { ...x, state } : x)));
  }, []);

  const begin = useCallback((initialSteps: readonly MultiActionStep[]) => {
    setError("");
    setRunning(true);
    setRedirectInSec(0);
    setSteps(initialSteps.slice());
  }, []);

  const openConfirm = useCallback(() => {
    setOpen(true);
    setError("");
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setRedirectInSec(0);
  }, []);

  return {
    open,
    steps,
    running,
    error,
    redirectInSec,
    setOpen,
    setRunning,
    setError,
    setStepState,
    setRedirectInSec,
    begin,
    openConfirm,
    close,
  };
}
