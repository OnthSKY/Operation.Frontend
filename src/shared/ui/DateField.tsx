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
  type FocusEvent,
  type ForwardedRef,
  type InputHTMLAttributes,
  type MutableRefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  DayPicker,
  type Matcher,
  type MonthCaptionProps,
  useDayPicker,
} from "react-day-picker";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { enUS as rdpEn } from "react-day-picker/locale/en-US";
import { tr as rdpTr } from "react-day-picker/locale/tr";
import "react-day-picker/style.css";

export type DateFieldMode = "date" | "datetime-local";

export type DateFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
  labelRequired?: boolean;
  error?: string;
  mode?: DateFieldMode;
};

function parseYmdLocal(s: string | undefined | null): Date | undefined {
  if (s == null || s === "") return undefined;
  const d = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return undefined;
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
}

function parseConstraintToYmdDate(s: string | undefined): Date | undefined {
  if (s == null || s === "") return undefined;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return parseYmdLocal(t);
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) return parseYmdLocal(t.slice(0, 10));
  return undefined;
}

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Görüntü: dd.MM.yyyy (veya datetime için aynı + saat). */
const DMY_DISPLAY = "dd.MM.yyyy";

function parseDmyDatePart(s: string): { y: number; m: number; d: number } | null {
  const t = s.trim();
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year))
    return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day)
    return null;
  return { y: year, m: month, d: day };
}

function dmyToYmd(s: string): string | null {
  const p = parseDmyDatePart(s);
  if (!p) return null;
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** ISO `yyyy-MM-dd` / `yyyy-MM-ddTHH:mm` → kullanıcıya dd.MM.yyyy (± saat). */
function isoToDisplayDraft(iso: string, mode: DateFieldMode): string {
  if (!iso.trim()) return "";
  if (mode === "datetime-local") {
    const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (!m) return iso.trim();
    const d = parseYmdLocal(m[1]);
    if (!d) return iso.trim();
    const dateStr = format(d, DMY_DISPLAY);
    if (m[2] === "12:00") return dateStr;
    return `${dateStr} ${m[2]}`;
  }
  const ymd = /^\d{4}-\d{2}-\d{2}T/.test(iso) ? iso.slice(0, 10) : iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return iso.trim();
  const d = parseYmdLocal(ymd);
  if (!d) return iso.trim();
  return format(d, DMY_DISPLAY);
}

/**
 * Boş string, geçerli ISO çıktı, veya ayrıştırılamadı (null).
 * Tarih: yyyy-MM-dd veya dd.MM.yyyy
 * Tarih+saat: yyyy-MM-ddTHH:mm / yyyy-MM-dd HH:mm / dd.MM.yyyy HH:mm; yalnızca dd.MM.yyyy → önceki saat veya 12:00
 */
function parseManualEntry(
  raw: string,
  mode: DateFieldMode,
  previousIso: string
): "" | string | null {
  const s = raw.trim();
  if (s === "") return "";
  if (mode === "date") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return dmyToYmd(s);
  }
  const normalized = s.replace(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/,
    "$1T$2"
  );
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return normalized;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const tm = previousIso.match(/T(\d{2}:\d{2})/)?.[1] ?? "12:00";
    return `${s}T${tm}`;
  }
  const dmSp = s.match(/^(\d{1,2}\.\d{1,2}\.\d{4})\s+(\d{2}:\d{2})$/);
  if (dmSp) {
    const ymd = dmyToYmd(dmSp[1]);
    if (!ymd) return null;
    return `${ymd}T${dmSp[2]}`;
  }
  const dmT = s.match(/^(\d{1,2}\.\d{1,2}\.\d{4})T(\d{2}:\d{2})$/);
  if (dmT) {
    const ymd = dmyToYmd(dmT[1]);
    if (!ymd) return null;
    return `${ymd}T${dmT[2]}`;
  }
  const ymdOnly = dmyToYmd(s);
  if (ymdOnly) {
    const tm = previousIso.match(/T(\d{2}:\d{2})/)?.[1] ?? "12:00";
    return `${ymdOnly}T${tm}`;
  }
  return null;
}

function dateWithinMinMax(
  ymd: string,
  minD: Date | undefined,
  maxD: Date | undefined
): boolean {
  const d = parseYmdLocal(ymd);
  if (!d) return false;
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (minD) {
    const lo = new Date(minD.getFullYear(), minD.getMonth(), minD.getDate());
    if (day < lo) return false;
  }
  if (maxD) {
    const hi = new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate());
    if (day > hi) return false;
  }
  return true;
}

const triggerShellClass =
  "flex min-h-12 w-full min-w-0 max-w-full items-stretch gap-0 rounded-lg border border-zinc-300 bg-white text-base outline-none transition-[box-shadow,border-color] focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900 sm:min-h-11 sm:text-sm disabled:bg-zinc-50 disabled:text-zinc-400";

const textInputClass =
  "min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-left text-base text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed sm:py-2 sm:text-sm tabular-nums";

const calendarTriggerBtnClass =
  "inline-flex shrink-0 items-center justify-center border-l border-zinc-200 px-3 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800 focus-visible:relative focus-visible:z-[1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-40";

function mergeRefs<T>(node: T | null, ref: ForwardedRef<T>): void {
  if (typeof ref === "function") ref(node);
  else if (ref && "current" in ref) {
    (ref as MutableRefObject<T | null>).current = node;
  }
}

const dayPickerClassNames = {
  root: cn(
    "rdp-root w-full min-w-0 max-w-full text-zinc-900 [--rdp-accent-color:theme(colors.violet.600)] [--rdp-accent-background-color:theme(colors.violet.100)]",
    "[--rdp-day-width:100%] [--rdp-day-height:auto] [--rdp-day_button-width:100%] [--rdp-day_button-height:auto] [--rdp-weekday-padding:0.25rem_0.0625rem]",
    "[&_.rdp-selected]:text-sm [&_.rdp-selected]:font-medium [&_.rdp-selected]:leading-none"
  ),
  months: "rdp-months flex w-full min-w-0 max-w-full flex-col gap-2",
  month: "rdp-month min-w-0 space-y-1 sm:space-y-2",
  month_caption:
    "rdp-month_caption relative flex !h-auto min-h-0 w-full min-w-0 flex-col items-stretch justify-center gap-0 px-0 py-1 sm:py-1.5",
  caption_label:
    "rdp-caption_label max-w-[min(100%,11rem)] truncate text-center text-xs font-semibold capitalize text-zinc-900 sm:max-w-none sm:text-sm",
  dropdowns:
    "rdp-dropdowns relative z-[1] flex w-full min-w-0 flex-wrap items-stretch justify-center gap-2",
  dropdown:
    "rdp-dropdown h-11 max-w-full min-w-0 flex-1 cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm font-medium text-zinc-900 shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10",
  dropdown_root:
    "rdp-dropdown_root flex min-w-0 flex-1 basis-[min(100%,10rem)] items-stretch sm:basis-auto",
  months_dropdown:
    "rdp-months_dropdown flex min-h-11 min-w-0 flex-1 basis-[min(100%,11rem)] sm:min-w-[9.5rem]",
  years_dropdown:
    "rdp-years_dropdown flex min-h-11 min-w-0 flex-1 basis-[min(100%,6.5rem)] sm:min-w-[6.75rem]",
  chevron: "rdp-chevron size-[1.125rem] shrink-0 text-zinc-500",
  button_previous:
    "rdp-button_previous inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 sm:h-9 sm:w-9",
  button_next:
    "rdp-button_next inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 sm:h-9 sm:w-9",
  month_grid:
    "rdp-month_grid w-full min-w-0 max-w-full table-fixed border-collapse [border-spacing:0]",
  weekdays: "rdp-weekdays w-full",
  weekday:
    "rdp-weekday box-border w-[14.285714%] min-w-0 px-0.5 py-1.5 text-center text-[10px] font-semibold uppercase leading-tight text-zinc-400 sm:py-2 sm:text-[11px]",
  week: "rdp-week w-full",
  day: "rdp-day box-border w-[14.285714%] min-w-0 p-0.5 align-middle sm:p-1",
  day_button:
    "rdp-day_button !mx-auto box-border flex aspect-square w-full min-h-0 min-w-0 max-w-[min(100%,2.25rem)] items-center justify-center rounded-lg text-xs font-medium text-zinc-800 transition-[color,box-shadow,transform] duration-150 hover:bg-violet-100/90 hover:text-violet-950 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 sm:max-w-[min(100%,2.5rem)] sm:text-sm",
  selected:
    [
      "rdp-selected",
      "[&_button]:rounded-xl [&_button]:!border-0",
      "[&_button]:bg-gradient-to-b [&_button]:from-violet-500 [&_button]:to-violet-600",
      "[&_button]:text-white [&_button]:font-semibold",
      "[&_button]:shadow-md [&_button]:shadow-violet-500/35",
      "[&_button]:ring-1 [&_button]:ring-inset [&_button]:ring-white/35",
      "[&_button]:hover:from-violet-500 [&_button]:hover:to-violet-600 [&_button]:hover:text-white",
      "[&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-white/80 [&_button]:focus-visible:ring-offset-2 [&_button]:focus-visible:ring-offset-violet-600",
    ].join(" "),
  today:
    "rdp-today font-semibold text-violet-600 [&:not(.rdp-selected)_button]:text-violet-600",
  disabled: "rdp-disabled opacity-35",
  outside: "rdp-outside opacity-40",
} as const;

const SELECT_LIST_IN_CALENDAR_Z = OVERLAY_Z_INDEX.dateFieldPopover + 10;

function DatePickerMonthCaption(props: MonthCaptionProps) {
  const { locale } = useI18n();
  const captionId = useId();
  const df = locale === "tr" ? dfTr : dfEn;
  const { goToMonth, dayPickerProps } = useDayPicker();
  const startMonth = dayPickerProps.startMonth;
  const endMonth = dayPickerProps.endMonth;
  const disableNav = Boolean(dayPickerProps.disableNavigation);

  const {
    calendarMonth,
    displayIndex,
    className,
    style,
    children: _unusedChildren,
    ...divProps
  } = props;

  const view = calendarMonth.date;
  const y = view.getFullYear();
  const mIdx = view.getMonth();

  const startY = startMonth?.getFullYear() ?? y - 100;
  const endY = endMonth?.getFullYear() ?? y + 15;

  const monthOptions: SelectOption[] = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: String(i),
        label: format(new Date(2000, i, 1), "LLLL", { locale: df }),
      })),
    [df]
  );

  const yearOptions: SelectOption[] = useMemo(() => {
    const lo = Math.min(startY, endY);
    const hi = Math.max(startY, endY);
    const opts: SelectOption[] = [];
    for (let yy = hi; yy >= lo; yy--) {
      opts.push({ value: String(yy), label: String(yy) });
    }
    return opts;
  }, [startY, endY]);

  return (
    <div
      className={cn("mb-1 w-full min-w-0 px-0.5", className)}
      style={style}
      {...divProps}
    >
      <div className="flex w-full min-w-0 flex-col items-stretch justify-center gap-2 min-[360px]:flex-row min-[360px]:flex-wrap sm:gap-2">
        <div className="min-w-0 w-full flex-[2] basis-0 min-[360px]:min-w-[min(100%,9rem)] min-[360px]:basis-[min(100%,12rem)]">
          <Select
            name={`${captionId}-mo-${displayIndex}`}
            options={monthOptions}
            value={String(mIdx)}
            disabled={disableNav}
            menuZIndex={SELECT_LIST_IN_CALENDAR_Z}
            onChange={(e) => {
              const mi = parseInt(e.target.value, 10);
              if (!Number.isFinite(mi)) return;
              goToMonth(new Date(y, mi, 1));
            }}
            onBlur={() => {}}
            className="min-h-11 sm:min-h-10 sm:[&_input]:text-sm"
          />
        </div>
        <div className="min-w-0 w-full flex-1 basis-auto min-[360px]:basis-[6.5rem]">
          <Select
            name={`${captionId}-yr-${displayIndex}`}
            options={yearOptions}
            value={String(y)}
            disabled={disableNav}
            menuZIndex={SELECT_LIST_IN_CALENDAR_Z}
            onChange={(e) => {
              const yy = parseInt(e.target.value, 10);
              if (!Number.isFinite(yy)) return;
              goToMonth(new Date(yy, mIdx, 1));
            }}
            onBlur={() => {}}
            className="min-h-11 sm:min-h-10 sm:[&_input]:text-sm"
          />
        </div>
      </div>
    </div>
  );
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  (
    {
      className,
      id,
      name,
      label,
      labelRequired,
      error,
      mode = "date",
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      min,
      max,
      disabled,
      required,
      readOnly,
      placeholder,
      ...rest
    },
    ref
  ) => {
    const { locale, t } = useI18n();
    const autoId = useId();
    const inputId = id ?? name ?? autoId;
    const hasError = error != null && String(error).length > 0;
    const errorText = String(error ?? "").trim();
    const triggerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

    const dfLocale = locale === "tr" ? dfTr : dfEn;
    const rdpLocale = locale === "tr" ? rdpTr : rdpEn;

    useEffect(() => {
      setMounted(true);
    }, []);

    const strValue =
      value !== undefined && value !== null ? String(value) : undefined;
    const strDefault =
      defaultValue !== undefined && defaultValue !== null
        ? String(defaultValue)
        : undefined;
    const isControlled = value !== undefined;
    const [uncontrolledStr, setUncontrolledStr] = useState(
      () => strDefault ?? ""
    );
    const displayStr = isControlled ? (strValue ?? "") : uncontrolledStr;

    const minD =
      typeof min === "string" ? parseConstraintToYmdDate(min) : undefined;
    const maxD =
      typeof max === "string" ? parseConstraintToYmdDate(max) : undefined;

    const navRange = useMemo(() => {
      const now = new Date();
      const defaultStart = new Date(now.getFullYear() - 100, 0, 1);
      const defaultEnd = new Date(now.getFullYear() + 15, 11, 1);
      let startMonth = defaultStart;
      let endMonth = defaultEnd;
      if (minD) startMonth = new Date(minD.getFullYear(), minD.getMonth(), 1);
      if (maxD) endMonth = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
      if (startMonth.getTime() > endMonth.getTime()) {
        return { startMonth: defaultStart, endMonth: defaultEnd };
      }
      return { startMonth, endMonth };
    }, [minD, maxD]);

    const selectedDateForPicker = useMemo(() => {
      if (!displayStr) return undefined;
      if (mode === "date") {
        if (/^\d{4}-\d{2}-\d{2}T/.test(displayStr))
          return parseYmdLocal(displayStr.slice(0, 10));
        return parseYmdLocal(displayStr);
      }
      if (/^\d{4}-\d{2}-\d{2}T/.test(displayStr))
        return parseYmdLocal(displayStr.slice(0, 10));
      return undefined;
    }, [mode, displayStr]);

    const timeInputValue = useMemo(() => {
      if (mode !== "datetime-local") return "12:00";
      const m = displayStr.match(/T(\d{2}:\d{2})/);
      return m ? m[1] : "12:00";
    }, [mode, displayStr]);

    const hasPickerValue =
      mode === "date"
        ? selectedDateForPicker != null
        : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(displayStr);

    const [textFocused, setTextFocused] = useState(false);
    const [textDraft, setTextDraft] = useState("");

    useEffect(() => {
      if (!textFocused) setTextDraft(isoToDisplayDraft(displayStr, mode));
    }, [displayStr, textFocused, mode]);

    const emitChange = useCallback(
      (next: string) => {
        if (!isControlled) {
          setUncontrolledStr(next);
        }
        if (!onChange) return;
        const ev = {
          target: { value: next, name: name ?? "" },
          currentTarget: { value: next, name: name ?? "" },
        } as ChangeEvent<HTMLInputElement>;
        onChange(ev);
      },
      [isControlled, name, onChange]
    );

    const defaultPlaceholder =
      mode === "datetime-local"
        ? t("common.datePickerPlaceholderDateTime")
        : t("common.datePickerPlaceholderDate");
    const inputPlaceholder = placeholder ?? defaultPlaceholder;

    const commitTypedValue = useCallback(
      (raw: string) => {
        const parsed = parseManualEntry(raw, mode, displayStr);
        if (parsed === null) {
          setTextDraft(isoToDisplayDraft(displayStr, mode));
          return;
        }
        if (parsed === "") {
          emitChange("");
          return;
        }
        const ymd = mode === "datetime-local" ? parsed.slice(0, 10) : parsed;
        if (!dateWithinMinMax(ymd, minD, maxD)) {
          setTextDraft(isoToDisplayDraft(displayStr, mode));
          return;
        }
        emitChange(parsed);
      },
      [displayStr, emitChange, maxD, minD, mode]
    );

    const handleVisibleBlur = useCallback(
      (e: FocusEvent<HTMLInputElement>) => {
        onBlur?.(e);
        setTextFocused(false);
        commitTypedValue(e.target.value);
      },
      [commitTypedValue, onBlur]
    );

    const handleVisibleFocus = useCallback(
      (e: FocusEvent<HTMLInputElement>) => {
        setTextFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    const disabledMatchers: Matcher[] = [];
    if (minD) disabledMatchers.push({ before: minD });
    if (maxD) disabledMatchers.push({ after: maxD });

    const todaySelectable = useMemo(() => {
      if (disabled) return false;
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      if (minD) {
        const minStart = new Date(
          minD.getFullYear(),
          minD.getMonth(),
          minD.getDate()
        );
        if (todayStart < minStart) return false;
      }
      if (maxD) {
        const maxStart = new Date(
          maxD.getFullYear(),
          maxD.getMonth(),
          maxD.getDate()
        );
        if (todayStart > maxStart) return false;
      }
      return true;
    }, [disabled, minD, maxD]);

    const selectTodayAndClose = useCallback(() => {
      if (!todaySelectable) return;
      const n = new Date();
      if (mode === "datetime-local") {
        emitChange(`${toYmd(n)}T${format(n, "HH:mm")}`);
      } else {
        emitChange(toYmd(n));
      }
      setOpen(false);
    }, [emitChange, mode, todaySelectable]);

    const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (mode !== "datetime-local") return;
      const nextTime = e.target.value;
      const base = selectedDateForPicker ?? new Date();
      emitChange(`${toYmd(base)}T${nextTime}`);
    };

    useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        const el = e.target as HTMLElement | null;
        const tEl = e.target as Node;
        if (triggerRef.current?.contains(tEl)) return;
        if (popoverRef.current?.contains(tEl)) return;
        if (el?.closest?.("[data-select-combobox-list]")) return;
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

    const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
    const [sheetMode, setSheetMode] = useState(false);

    useLayoutEffect(() => {
      if (!open) return;
      setCalendarMonth(selectedDateForPicker ?? new Date());
    }, [open, selectedDateForPicker]);

    useLayoutEffect(() => {
      if (!open || !mounted) return;
      const calH = mode === "datetime-local" ? 520 : 480;
      const place = () => {
        const r = triggerRef.current?.getBoundingClientRect();
        if (!r) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pad = 8;
        const below = vh - r.bottom - pad;
        const above = r.top - pad;
        const narrowViewport = vw < 640;
        const crampedY = below < calH && above < calH;
        const useSheet = narrowViewport || crampedY;
        setSheetMode(useSheet);

        if (useSheet) {
          setPopoverStyle({
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: OVERLAY_Z_INDEX.dateFieldPopover,
            maxHeight: `min(${calH}px, 92dvh)`,
            width: "100%",
            maxWidth: "100vw",
            top: "auto",
          });
          return;
        }

        const minPopoverW = 280;
        const maxPopoverW = Math.min(560, vw - 2 * pad);
        let w = Math.max(r.width, minPopoverW);
        w = Math.min(w, maxPopoverW);

        let left = r.left + r.width / 2 - w / 2;
        left = Math.min(Math.max(pad, left), vw - w - pad);

        let top = r.bottom + 6;
        if (top + calH > vh - pad) {
          top = r.top - calH - 6;
        }
        if (top < pad) {
          top = pad;
        }
        if (top + calH > vh - pad) {
          top = Math.max(pad, vh - calH - pad);
        }

        setPopoverStyle({
          position: "fixed",
          top,
          left,
          width: w,
          maxWidth: `calc(100vw - ${2 * pad}px)`,
          maxHeight: `min(${calH}px, calc(100dvh - ${2 * pad}px))`,
          zIndex: OVERLAY_Z_INDEX.dateFieldPopover,
        });
      };
      place();
      window.addEventListener("scroll", place, true);
      window.addEventListener("resize", place);
      return () => {
        window.removeEventListener("scroll", place, true);
        window.removeEventListener("resize", place);
      };
    }, [open, mounted, mode]);

    const visibleInputRef = useCallback(
      (node: HTMLInputElement | null) => {
        mergeRefs(node, ref);
      },
      [ref]
    );

    const dialogTitle =
      mode === "datetime-local"
        ? t("common.datePickerChooseDateTime")
        : t("common.datePickerChoose");

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
            "flex flex-col overflow-hidden border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15",
            sheetMode
              ? "rounded-t-2xl border-b-0 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
              : "rounded-xl"
          )}
          style={popoverStyle}
          role="dialog"
          aria-label={dialogTitle}
        >
          <div
            className={cn(
              "border-b border-zinc-100 px-3 py-2",
              sheetMode ? "block" : "hidden"
            )}
          >
            <p className="text-center text-xs font-semibold text-zinc-500">
              {dialogTitle}
            </p>
          </div>
          <div className="shrink-0 border-b border-zinc-100 px-2 py-2 sm:px-3">
            <button
              type="button"
              disabled={!todaySelectable}
              title={
                todaySelectable
                  ? undefined
                  : t("common.datePickerTodayUnavailable")
              }
              aria-label={t("common.datePickerToday")}
              onClick={selectTodayAndClose}
              className={cn(
                "flex w-full min-h-11 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition sm:min-h-10 sm:py-2",
                todaySelectable
                  ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                  : "cursor-not-allowed bg-zinc-100 text-zinc-400"
              )}
            >
              <span className="shrink-0">{t("common.datePickerToday")}</span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  todaySelectable ? "text-white/90" : "text-zinc-500"
                )}
                aria-hidden
              >
                {format(new Date(), "EEE d MMM", { locale: dfLocale })}
              </span>
            </button>
          </div>
          <div className="date-field-rdp min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-1.5 sm:p-3 [&_.rdp-months]:max-w-none">
            <DayPicker
              mode="single"
              required={false}
              locale={rdpLocale}
              captionLayout="label"
              components={{ MonthCaption: DatePickerMonthCaption }}
              hideNavigation
              startMonth={navRange.startMonth}
              endMonth={navRange.endMonth}
              selected={selectedDateForPicker}
              onSelect={(d) => {
                if (!d) return;
                if (mode === "datetime-local") {
                  emitChange(`${toYmd(d)}T${timeInputValue}`);
                } else {
                  emitChange(toYmd(d));
                }
                setOpen(false);
              }}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              disabled={disabledMatchers.length ? disabledMatchers : undefined}
              classNames={dayPickerClassNames}
            />
          </div>
          {mode === "datetime-local" ? (
            <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2 sm:px-3">
              <label
                htmlFor={`${inputId}-time`}
                className="shrink-0 text-xs font-semibold text-zinc-600"
              >
                {t("common.datePickerTime")}
              </label>
              <input
                id={`${inputId}-time`}
                type="time"
                value={timeInputValue}
                onChange={handleTimeChange}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 tabular-nums outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900 sm:min-h-10 sm:text-sm [color-scheme:light]"
              />
            </div>
          ) : null}
          <div className="border-t border-zinc-100 p-2 sm:px-3 sm:pb-3">
            <button
              type="button"
              className="flex w-full min-h-11 items-center justify-center rounded-lg border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 sm:min-h-10 sm:py-2"
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
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-zinc-700"
          >
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
          {...rest}
          name={name}
          value={displayStr}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
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
          <input
            ref={visibleInputRef}
            type="text"
            id={inputId}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={hasError}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls={open ? `${inputId}-popover` : undefined}
            placeholder={inputPlaceholder}
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            onFocus={handleVisibleFocus}
            onBlur={handleVisibleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTypedValue((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "Escape" && open) {
                e.preventDefault();
                setOpen(false);
              }
            }}
            className={cn(
              textInputClass,
              !hasPickerValue && !textFocused && "text-zinc-500",
              hasPickerValue && "font-medium text-zinc-900"
            )}
          />
          <button
            type="button"
            id={`${inputId}-trigger`}
            disabled={disabled || readOnly}
            className={calendarTriggerBtnClass}
            aria-label={t("common.datePickerOpenCalendar")}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls={open ? `${inputId}-popover` : undefined}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="text-zinc-400" aria-hidden>
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
            </span>
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

DateField.displayName = "DateField";
