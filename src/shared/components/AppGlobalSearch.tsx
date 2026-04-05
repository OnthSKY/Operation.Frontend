"use client";

import { useI18n } from "@/i18n/context";
import { GLOBAL_SEARCH_ITEMS } from "@/shared/lib/global-search-items";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

function isTypingInField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function norm(s: string, locale: string) {
  return s.toLocaleLowerCase(locale);
}

export function AppGlobalSearch() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const loc = locale === "tr" ? "tr-TR" : "en-US";

  const filtered = useMemo(() => {
    const q = norm(query.trim(), loc);
    if (!q) return [...GLOBAL_SEARCH_ITEMS];
    return GLOBAL_SEARCH_ITEMS.filter((item) => {
      const title = norm(t(item.titleKey), loc);
      const sub = norm(t(item.subtitleKey), loc);
      const extra = norm(item.match, loc);
      const hay = `${title} ${sub} ${extra}`;
      return hay.includes(q);
    });
  }, [query, t, loc]);

  useEffect(() => {
    setHighlight((h) =>
      filtered.length === 0 ? 0 : Math.min(h, filtered.length - 1)
    );
  }, [filtered.length]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (isTypingInField(e.target) && !open) return;
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const modLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent)
      ? "⌘"
      : "Ctrl";

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (filtered.length ? (h + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) =>
        filtered.length ? (h - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      go(filtered[highlight].href);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100"
        aria-label={t("search.open")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="shrink-0 text-zinc-400"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="min-w-0 flex-1 truncate">{t("search.placeholder")}</span>
        <kbd className="hidden shrink-0 rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500 sm:inline">
          {modLabel}K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-zinc-900/50 p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-16"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              setQuery("");
            }
          }}
        >
          <div
            role="dialog"
            aria-label={t("search.open")}
            className="flex max-h-[min(70vh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0 text-zinc-400"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t("search.placeholder")}
                className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-controls="command-search-list"
                aria-activedescendant={
                  filtered[highlight]
                    ? `command-search-${filtered[highlight].id}`
                    : undefined
                }
              />
              <span className="hidden shrink-0 text-[10px] text-zinc-400 sm:block">
                {t("search.shortcutHint")} Esc
              </span>
            </div>
            <div
              id="command-search-list"
              role="listbox"
              className="min-h-0 flex-1 overflow-y-auto p-1"
              aria-label={t("search.open")}
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-zinc-500">
                  {t("search.noResults")}
                </p>
              ) : (
                filtered.map((item, i) => {
                  const active = i === highlight;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`command-search-${item.id}`}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => go(item.href)}
                      className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm ${
                        active
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-800 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="font-medium">{t(item.titleKey)}</span>
                      <span
                        className={
                          active ? "text-zinc-300" : "text-zinc-500"
                        }
                      >
                        {t(item.subtitleKey)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
