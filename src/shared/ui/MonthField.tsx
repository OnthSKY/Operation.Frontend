"use client";

import { cn } from "@/lib/cn";
import { OVERLAY_Z_INDEX, OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { useI18n } from "@/i18n/context";
import { format } from "date-fns";
import { enUS as dfEn, tr as dfTr } from "date-fns/locale";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ForwardedRef,
  type MutableRefObject,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getVisualViewportBottomPx,
  getVisualViewportTopPx,
  getVisualViewportHeightPx,
  getVisualViewportWidthPx,
} from "@/shared/lib/visual-viewport-bottom";
import { rafThrottle } from "@/shared/lib/viewport-raf-throttle";
import { scrollOverlayAnchorIntoView } from "@/shared/lib/scroll-overlay-anchor-into-view";

export type MonthFieldProps = {
  /** ISO ay: `yyyy-MM`. */
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  id?: string;
  label?: string;
  labelRequired?: boolean;
  error?: string;
  /** `yyyy-MM` alt/üst sınır (dahil). */
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
};

type YM = { y: number; m: number };

/** `yyyy-MM` → {y, m(1-12)} veya null. */
function parseYm(s: string | undefined | null): YM | null {
  if (s == null) return null;
  const t = s.trim();
  const match = t.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || m < 1 || m > 12) return null;
  return { y, m };
}

function toYm(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** a < b (-1), a === b (0), a > b (1). */
function cmpYm(a: YM, b: YM): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  return 0;
}

function ymWithinMinMax(ym: YM, min: YM | null, max: YM | null): boolean {
  if (min && cmpYm(ym, min) < 0) return false;
  if (max && cmpYm(ym, max) > 0) return false;
  return true;
}

function mergeRefs<T>(node: T | null, ref: ForwardedRef<T>): void {
  if (typeof ref === "function") ref(node);
  else if (ref && "current" in ref) {
    (ref as MutableRefObject<T | null>).current = node;
  }
}

const triggerShellClass =
  "flex h-10 min-h-[44px] w-full min-w-0 max-w-full items-stretch gap-0 rounded-xl border border-zinc-300 bg-white text-sm outline-none transition-[box-shadow,border-color] focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900 sm:h-11 sm:text-base md:h-12 disabled:bg-zinc-50 disabled:text-zinc-400";

const calendarTriggerBtnClass =
  "inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center border-l border-zinc-200 px-3 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-800 focus-visible:relative focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40";

export const MonthField = forwardRef<HTMLButtonElement, MonthFieldProps>(
  (
    {
      value,
      onChange,
      name,
      id,
      label,
      labelRequired,
      error,
      min,
      max,
      disabled,
      required,
      className,
      placeholder,
    },
    ref
  ) => {
    const { locale, t } = useI18n();
    const autoId = useId();
    const inputId = id ?? name ?? autoId;
    const hasError = error != null && String(error).length > 0;
    const errorText = String(error ?? "").trim();
    const dfLocale = locale === "tr" ? dfTr : dfEn;

    const triggerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const selected = useMemo(() => parseYm(value), [value]);
    const minYm = useMemo(() => parseYm(min), [min]);
    const maxYm = useMemo(() => parseYm(max), [max]);

    const nowYm = useMemo(() => {
      const n = new Date();
      return { y: n.getFullYear(), m: n.getMonth() + 1 };
    }, []);

    // Izgarada gösterilen yıl: seçili → değilse bugün.
    const [viewYear, setViewYear] = useState<number>(
      () => selected?.y ?? nowYm.y
    );
    useLayoutEffect(() => {
      if (open) setViewYear(selected?.y ?? nowYm.y);
    }, [open, selected?.y, nowYm.y]);

    const displayLabel = useMemo(() => {
      if (!selected) return "";
      return format(new Date(selected.y, selected.m - 1, 1), "LLLL yyyy", {
        locale: dfLocale,
      });
    }, [selected, dfLocale]);

    const monthButtons = useMemo(
      () =>
        Array.from({ length: 12 }, (_, i) => ({
          m: i + 1,
          label: format(new Date(2000, i, 1), "LLL", { locale: dfLocale }),
        })),
      [dfLocale]
    );

    const emitChange = useCallback(
      (next: string) => {
        if (!onChange) return;
        const ev = {
          target: { value: next, name: name ?? "" },
          currentTarget: { value: next, name: name ?? "" },
        } as ChangeEvent<HTMLInputElement>;
        onChange(ev);
      },
      [name, onChange]
    );

    const selectMonth = useCallback(
      (m: number) => {
        const ym = { y: viewYear, m };
        if (!ymWithinMinMax(ym, minYm, maxYm)) return;
        emitChange(toYm(ym.y, ym.m));
        setOpen(false);
      },
      [viewYear, minYm, maxYm, emitChange]
    );

    const thisMonthSelectable = ymWithinMinMax(nowYm, minYm, maxYm) && !disabled;
    const selectThisMonth = useCallback(() => {
      if (!thisMonthSelectable) return;
      emitChange(toYm(nowYm.y, nowYm.m));
      setOpen(false);
    }, [thisMonthSelectable, emitChange, nowYm]);

    // Yıl gezinme sınırları.
    const prevYearDisabled = minYm != null && viewYear <= minYm.y;
    const nextYearDisabled = maxYm != null && viewYear >= maxYm.y;

    // Kapatma: dışarı tık / Escape.
    useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        const node = e.target as Node;
        if (triggerRef.current?.contains(node)) return;
        if (popoverRef.current?.contains(node)) return;
        setOpen(false);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);

    // Konumlama: DateField ile aynı viewport/sheet mantığı.
    const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
    const [sheetMode, setSheetMode] = useState(false);

    useLayoutEffect(() => {
      if (!open || !mounted) return;
      scrollOverlayAnchorIntoView(triggerRef.current ?? null);
      const place = () => {
        const r = triggerRef.current?.getBoundingClientRect();
        if (!r) return;
        const vvTop = getVisualViewportTopPx();
        const vvBottom = getVisualViewportBottomPx();
        const vw = getVisualViewportWidthPx();
        const vh = getVisualViewportHeightPx();
        const pad = 8;
        const maxPopoverH = Math.min(340, Math.max(240, Math.floor(vh * 0.72)));
        const estContentH = 300;
        const below = vvBottom - r.bottom - pad;
        const above = r.top - vvTop - pad;
        const narrowViewport = vw < 640;
        const crampedY = below < estContentH && above < estContentH;
        const useSheet = narrowViewport || crampedY;
        setSheetMode(useSheet);

        if (useSheet) {
          setPopoverStyle({
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: OVERLAY_Z_INDEX.dateFieldPopover,
            maxHeight: `min(${maxPopoverH}px, 88dvh)`,
            height: "auto",
            width: "100%",
            maxWidth: "100vw",
            top: "auto",
          });
          return;
        }

        const minPopoverW = 260;
        const maxPopoverW = Math.min(320, vw - 2 * pad);
        const w = Math.min(Math.max(r.width, minPopoverW), maxPopoverW);

        let left = r.left + r.width / 2 - w / 2;
        left = Math.min(Math.max(pad, left), vw - w - pad);

        let top = r.bottom + 6;
        if (top + maxPopoverH > vvBottom - pad) {
          top = r.top - maxPopoverH - 6;
        }
        if (top < vvTop + pad) {
          top = vvTop + pad;
        }
        if (top + maxPopoverH > vvBottom - pad) {
          top = Math.max(vvTop + pad, vvBottom - maxPopoverH - pad);
        }

        setPopoverStyle({
          position: "fixed",
          top,
          left,
          width: w,
          maxWidth: `calc(100vw - ${2 * pad}px)`,
          maxHeight: `min(${maxPopoverH}px, calc(100dvh - ${2 * pad}px))`,
          height: "auto",
          zIndex: OVERLAY_Z_INDEX.dateFieldPopover,
        });
      };
      const throttled = rafThrottle(place);
      throttled.flush();
      const handler = throttled.schedule;
      window.addEventListener("scroll", handler, true);
      window.addEventListener("resize", handler);
      const vv = window.visualViewport;
      vv?.addEventListener("resize", handler);
      vv?.addEventListener("scroll", handler);
      return () => {
        throttled.cancel();
        window.removeEventListener("scroll", handler, true);
        window.removeEventListener("resize", handler);
        vv?.removeEventListener("resize", handler);
        vv?.removeEventListener("scroll", handler);
      };
    }, [open, mounted]);

    const triggerButtonRef = useCallback(
      (node: HTMLButtonElement | null) => {
        mergeRefs(node, ref);
      },
      [ref]
    );

    const arrowBtn =
      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40";

    const popover = open && mounted ? (
      <>
        <div
          className={cn(
            "fixed inset-0 bg-zinc-900/20",
            OVERLAY_Z_TW.dateFieldBackdrop,
            sheetMode ? "block" : "hidden"
          )}
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <div
          ref={popoverRef}
          className={cn(
            "flex flex-col overflow-hidden border border-zinc-200/90 bg-white shadow-xl shadow-zinc-900/10 ring-1 ring-black/[0.03]",
            sheetMode
              ? "rounded-t-2xl border-b-0 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
              : "rounded-2xl"
          )}
          style={popoverStyle}
          role="dialog"
          aria-label={t("common.monthPickerChoose")}
        >
          <div
            className={cn(
              "border-b border-zinc-100 px-3 py-2",
              sheetMode ? "block" : "hidden"
            )}
          >
            <p className="text-center text-xs font-semibold text-zinc-500">
              {t("common.monthPickerChoose")}
            </p>
          </div>

          {/* Yıl gezinme */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100/90 px-2.5 py-2">
            <button
              type="button"
              className={arrowBtn}
              disabled={prevYearDisabled}
              aria-label={t("common.monthPickerPrevYear")}
              onClick={() => setViewYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span
              className="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums text-zinc-900"
              aria-live="polite"
            >
              {viewYear}
            </span>
            <button
              type="button"
              className={arrowBtn}
              disabled={nextYearDisabled}
              aria-label={t("common.monthPickerNextYear")}
              onClick={() => setViewYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Ay ızgarası (3×4) */}
          <div className="grid grid-cols-3 gap-1.5 p-2.5">
            {monthButtons.map((mb) => {
              const isSelected =
                selected != null && selected.y === viewYear && selected.m === mb.m;
              const isCurrent = nowYm.y === viewYear && nowYm.m === mb.m;
              const monthDisabled = !ymWithinMinMax(
                { y: viewYear, m: mb.m },
                minYm,
                maxYm
              );
              return (
                <button
                  key={mb.m}
                  type="button"
                  disabled={monthDisabled}
                  aria-pressed={isSelected}
                  onClick={() => selectMonth(mb.m)}
                  className={cn(
                    "min-h-11 rounded-xl px-2 py-2 text-sm font-medium capitalize transition-[color,box-shadow,background] duration-150 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1",
                    monthDisabled && "cursor-not-allowed opacity-35",
                    isSelected
                      ? "bg-gradient-to-b from-violet-500 to-violet-600 font-semibold text-white shadow-md shadow-violet-500/35 ring-1 ring-inset ring-white/35"
                      : isCurrent
                        ? "bg-violet-50 font-semibold text-violet-700 hover:bg-violet-100"
                        : "text-zinc-800 hover:bg-violet-100/90 hover:text-violet-950"
                  )}
                >
                  {mb.label}
                </button>
              );
            })}
          </div>

          {/* Bu ay + Kapat */}
          <div className="flex items-center gap-2 border-t border-zinc-100/90 p-1.5 sm:px-2.5 sm:pb-2">
            <button
              type="button"
              disabled={!thisMonthSelectable}
              title={
                thisMonthSelectable
                  ? undefined
                  : t("common.monthPickerThisMonthUnavailable")
              }
              onClick={selectThisMonth}
              className={cn(
                "flex min-h-10 flex-1 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition sm:min-h-9 sm:text-sm",
                thisMonthSelectable
                  ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                  : "cursor-not-allowed bg-zinc-100 text-zinc-400"
              )}
            >
              {t("common.monthPickerThisMonth")}
            </button>
            <button
              type="button"
              className="flex min-h-10 flex-1 items-center justify-center rounded-lg border border-zinc-200/90 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 sm:min-h-9 sm:text-sm"
              onClick={() => setOpen(false)}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      </>
    ) : null;

    return (
      <div className={cn("flex w-full min-w-0 max-w-full flex-col gap-1", className)}>
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-700">
            {label}
            {labelRequired ? (
              <span className="ml-0.5 font-semibold text-red-600" aria-hidden>
                *
              </span>
            ) : null}
          </label>
        ) : null}
        <input
          type="hidden"
          name={name}
          value={selected ? toYm(selected.y, selected.m) : ""}
          disabled={disabled}
          required={required}
          tabIndex={-1}
          aria-hidden
        />
        <div
          ref={triggerRef}
          className={cn(
            triggerShellClass,
            hasError &&
              "border-red-500 focus-within:border-red-500 focus-within:ring-red-500",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          <button
            ref={triggerButtonRef}
            type="button"
            id={inputId}
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "min-w-0 flex-1 truncate bg-transparent px-3 py-2 text-left text-sm outline-none sm:text-base",
              displayLabel ? "font-medium text-zinc-900" : "text-zinc-400"
            )}
          >
            {displayLabel || placeholder || t("common.monthPickerPlaceholder")}
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label={t("common.monthPickerOpen")}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={calendarTriggerBtnClass}
            onClick={() => setOpen((o) => !o)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>
        {errorText ? <p className="text-sm text-red-600">{error}</p> : null}
        {mounted && popover
          ? createPortal(
              <div id={`${inputId}-popover`}>{popover}</div>,
              document.body
            )
          : null}
      </div>
    );
  }
);

MonthField.displayName = "MonthField";
