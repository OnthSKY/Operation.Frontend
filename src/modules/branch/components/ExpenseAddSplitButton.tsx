"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";

type Props = {
  branchId: number;
  /** "İşletme Gideri" tıklandığında parent açar (mevcut modal state'i parent'ta). */
  onSelectOpsExpense: () => void;
  /** Kayıt sonrası dönülecek URL. Default: window.location.pathname. */
  returnTo?: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Şube giderine 3-yollu hızlı giriş: İşletme / Tedarikçi / Genel Gider.
 * Mobil: bottom sheet (Portal). Desktop: anchored dropdown (Portal — overflow parent'lardan etkilenmez).
 * Tedarikçi ve Genel Gider yönlendirmesinde şube preset + REGISTER + bugün otomatik.
 */
export function ExpenseAddSplitButton({
  branchId,
  onSelectOpsExpense,
  returnTo,
  size = "md",
  className,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRowRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dropdown'ı butonun altında konumlandır; sağ kenara hizala ama viewport sınırlarına clamp et.
  useLayoutEffect(() => {
    if (!open) return;
    const compute = () => {
      const r = buttonRowRef.current?.getBoundingClientRect();
      if (!r) return;
      const margin = 8;
      const menuW = Math.min(320, window.innerWidth - margin * 2);
      // Önce sağ kenarı butonun sağına hizala
      const desiredLeft = r.right - menuW;
      // Viewport'a clamp: ne soldan dışarı çıksın ne sağdan
      const left = Math.max(
        margin,
        Math.min(desiredLeft, window.innerWidth - menuW - margin)
      );
      setMenuPos({ top: r.bottom + 6, left });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (buttonRowRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const ret = typeof window !== "undefined"
    ? returnTo ?? `${window.location.pathname}${window.location.hash}`
    : returnTo ?? "";

  const buildQuery = (extra?: Record<string, string>) => {
    const q = new URLSearchParams({
      branchPreset: String(branchId),
      paymentSource: "REGISTER",
      ...(ret ? { returnTo: ret } : {}),
      ...(extra ?? {}),
    });
    return q.toString();
  };

  const goSupplier = () => {
    setOpen(false);
    router.push(`/suppliers/invoices?${buildQuery({ newInvoice: "1" })}`);
  };
  const goOverhead = () => {
    setOpen(false);
    router.push(`/general-overhead?${buildQuery({ newPool: "1" })}`);
  };
  const goOps = () => {
    setOpen(false);
    onSelectOpsExpense();
  };

  const sizeClasses = size === "sm" ? "h-9 px-3 text-xs" : "h-11 px-4 text-sm";
  const chevronBtnSize = size === "sm" ? "h-9 min-w-9" : "h-11 min-w-11";
  const chevronSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;

  const menuItems = (
    <>
      <MenuItem
        icon="💼"
        title={t("branch.expenseAddOps")}
        description={t("branch.expenseAddOpsHint")}
        onClick={goOps}
      />
      <div className="border-t border-zinc-100" />
      <MenuItem
        icon="📄"
        title={t("branch.expenseAddSupplier")}
        description={t("branch.expenseAddSupplierHint")}
        onClick={goSupplier}
        chevron
      />
      <div className="border-t border-zinc-100" />
      <MenuItem
        icon="🏢"
        title={t("branch.expenseAddOverhead")}
        description={t("branch.expenseAddOverheadHint")}
        onClick={goOverhead}
        chevron
      />
    </>
  );

  return (
    <div className={cn("inline-flex", className)}>
      <div ref={buttonRowRef} className="inline-flex rounded-lg shadow-sm">
        <button
          type="button"
          onClick={goOps}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-l-lg bg-zinc-900 font-medium text-white",
            "hover:bg-zinc-800 active:bg-zinc-950 transition-colors",
            sizeClasses
          )}
        >
          <span className="text-base leading-none">+</span>
          <span>{t("branch.expenseAddOps")}</span>
        </button>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("branch.expenseAddMoreOptions")}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex items-center justify-center rounded-r-lg border-l border-zinc-700 bg-zinc-900 px-3 text-white",
            "hover:bg-zinc-800 active:bg-zinc-950 transition-colors",
            chevronBtnSize
          )}
        >
          <svg className={chevronSize} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {open && mounted
        ? createPortal(
            <>
              {/* Backdrop her zaman var — mobilde görünür, desktop'ta transparent (dış tık kapatır) */}
              <div
                className={cn(
                  "fixed inset-0 z-[100]",
                  isMobile ? "bg-zinc-900/40 backdrop-blur-sm" : "bg-transparent"
                )}
                onClick={() => setOpen(false)}
                aria-hidden
              />
              {isMobile ? (
                <div
                  ref={menuRef}
                  role="menu"
                  className="fixed inset-x-0 bottom-0 z-[101] max-h-[85vh] overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
                >
                  <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-4 py-3">
                    <span className="text-sm font-semibold text-zinc-900">
                      {t("branch.expenseAddPickTitle")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
                      aria-label={t("common.close")}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M4.7 4.7a1 1 0 011.4 0L10 8.58 13.9 4.7a1 1 0 111.4 1.4L11.42 10l3.88 3.9a1 1 0 11-1.4 1.4L10 11.42 6.1 15.3a1 1 0 11-1.4-1.4L8.58 10 4.7 6.1a1 1 0 010-1.4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="px-2 py-2">{menuItems}</div>
                </div>
              ) : (
                <div
                  ref={menuRef}
                  role="menu"
                  className="fixed z-[101] w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
                  style={{
                    top: menuPos?.top ?? 0,
                    left: menuPos?.left ?? 0,
                    visibility: menuPos ? "visible" : "hidden",
                  }}
                >
                  {menuItems}
                </div>
              )}
            </>,
            document.body
          )
        : null}
    </div>
  );
}

function MenuItem({
  icon,
  title,
  description,
  onClick,
  chevron,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg px-3 py-3.5 text-left hover:bg-zinc-50 active:bg-zinc-100 min-h-[3.5rem]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-base">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-zinc-900">{title}</span>
        <span className="mt-0.5 block text-xs text-zinc-500 leading-relaxed">{description}</span>
      </span>
      {chevron ? (
        <svg
          className="mt-1.5 h-4 w-4 shrink-0 text-zinc-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01-.02-1.06L10.94 10 7.19 6.29a.75.75 0 111.06-1.06l4.24 4.24a.75.75 0 010 1.06l-4.24 4.24a.75.75 0 01-1.04.02z"
            clipRule="evenodd"
          />
        </svg>
      ) : null}
    </button>
  );
}
