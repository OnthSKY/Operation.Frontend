"use client";

import { notifyDefaults } from "@/shared/lib/notify";
import { NotifyTimerBadge } from "@/shared/lib/notify-timed-message";
import {
  toastCardPaddingRadiusShadow,
  toastCardWidth,
  toastSafeBottomMobile,
  toastSurfaceDanger,
} from "@/shared/lib/toast-theme";
import { toast } from "react-toastify";

/**
 * "Silindi — [Geri Al] (5sn)" pattern'i — kullanıcıya geri-alma penceresi.
 *
 * Akış:
 *   1. Caller `optimisticUpdate()` ile UI'yi anlık günceller (örn. cache'ten satır çıkar)
 *   2. Toast countdown ile gösterilir; user "Geri Al" tıklarsa `rollback()` + toast kapanır
 *   3. Süre dolarsa `commit()` çağrılır (gerçek silme); fail olursa `rollback()` + hata toast
 *
 * Tipik kullanım:
 *   notifyUndoable({
 *     message: "Gider silindi",
 *     undoLabel: "Geri Al",
 *     delayMs: 5000,
 *     optimisticUpdate: () => removeFromCache(id),
 *     rollback: () => restoreInCache(snapshot),
 *     commit: () => deleteOnServer(id),
 *   });
 */

const TOAST_ID = "notify-undoable";

export type NotifyUndoableInput = {
  message: string;
  undoLabel?: string;
  /** Bu süre dolunca commit edilir (varsayılan 5sn). */
  delayMs?: number;
  /** Anlık UI değişikliği — toast açılır açılmaz çalışır. */
  optimisticUpdate: () => void;
  /** Undo'da veya commit hatasında çağrılır — UI'yi eski haline getirir. */
  rollback: () => void;
  /** Süre dolunca gerçek silme sunucuya gönderilir. */
  commit: () => Promise<void>;
  /** Commit hatası için kullanıcıya gösterilecek mesaj (varsayılan "İşlem geri alındı"). */
  failureMessage?: string;
};

export function notifyUndoable(input: NotifyUndoableInput): void {
  const {
    message,
    undoLabel = "Geri Al",
    delayMs = 5000,
    optimisticUpdate,
    rollback,
    commit,
    failureMessage = "İşlem tamamlanamadı, geri alındı.",
  } = input;

  // Önceki undoable toast'ları kapat (yığılmayı önle)
  toast.dismiss(TOAST_ID);

  // ① Anlık UI güncellemesi
  optimisticUpdate();

  let undone = false;
  let committed = false;

  // ② Toast'ı aç — closeToast referansını yakalayıp commit/undo akışında kullan
  toast(
    ({ closeToast, isPaused }) => (
      <div className="flex w-full min-w-0 flex-col gap-3 text-left sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-zinc-800 sm:text-sm">
            {message}
          </p>
          <NotifyTimerBadge
            isPaused={isPaused}
            autoCloseMs={delayMs}
            surface="light"
            className="shrink-0 pt-0.5"
          />
        </div>
        <button
          type="button"
          onPointerDown={(e) => {
            // Pointer event yakala — mobilde tap delay / synthetic click race'lerine karşı net.
            e.preventDefault();
            e.stopPropagation();
            if (committed || undone) return;
            undone = true;
            rollback();
            closeToast?.();
          }}
          onClick={(e) => {
            // Fallback (klavye Enter, eski tarayıcı). Pointer zaten yakalanmamışsa çalışır.
            e.preventDefault();
            e.stopPropagation();
            if (committed || undone) return;
            undone = true;
            rollback();
            closeToast?.();
          }}
          className={[
            "inline-flex w-full touch-manipulation items-center justify-center",
            "min-h-12 rounded-xl border border-zinc-300 bg-white px-4 text-[15px] font-semibold text-zinc-900",
            "shadow-sm transition-colors hover:bg-zinc-50 active:bg-zinc-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
            "sm:min-h-10 sm:w-auto sm:self-auto sm:px-3 sm:py-2 sm:text-sm",
          ].join(" ")}
        >
          {undoLabel}
        </button>
      </div>
    ),
    {
      toastId: TOAST_ID,
      ...notifyDefaults,
      type: "default",
      icon: false,
      autoClose: delayMs,
      closeOnClick: false,
      className: [
        toastCardWidth,
        toastCardPaddingRadiusShadow,
        toastSurfaceDanger,
        toastSafeBottomMobile,
      ].join(" "),
      // onClose: süre dolarak veya programlı kapanış. Hangisi olduğunu state'ten anlarız.
      onClose: () => {
        if (undone || committed) return;
        committed = true;
        // ③ Commit'i fire et — hata olursa rollback + hata toast
        void (async () => {
          try {
            await commit();
          } catch {
            rollback();
            toast.error(failureMessage);
          }
        })();
      },
    }
  );
}
