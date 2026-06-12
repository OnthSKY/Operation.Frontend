"use client";

import { Modal } from "@/shared/ui/Modal";
import { useI18n } from "@/i18n/context";
import { useId, type ReactNode } from "react";

export type QuickOpItem = {
  key: string;
  label: string;
  icon: ReactNode;
  /** Tailwind renk anahtarı — örn. "blue", "emerald", "amber". */
  tone?: QuickOpTone;
  /** Mantıksal grup — birlikte gösterilir. Boşsa "Diğer" varsayar. */
  group?: QuickOpGroup;
  onClick: () => void;
};

export type QuickOpGroup = "register" | "personnel" | "supply";

const GROUP_ORDER: QuickOpGroup[] = ["register", "personnel", "supply"];
const GROUP_LABELS: Record<QuickOpGroup, string> = {
  register: "Şube & Kasa",
  personnel: "Personel",
  supply: "Stok & Tedarik",
};

export type QuickOpTone =
  | "blue"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "sky";

const TONE: Record<
  QuickOpTone,
  { wrap: string; icon: string; ring: string }
> = {
  blue: {
    wrap: "from-blue-50 to-blue-100/70",
    icon: "text-blue-600",
    ring: "ring-blue-100",
  },
  emerald: {
    wrap: "from-emerald-50 to-emerald-100/70",
    icon: "text-emerald-600",
    ring: "ring-emerald-100",
  },
  violet: {
    wrap: "from-violet-50 to-violet-100/70",
    icon: "text-violet-600",
    ring: "ring-violet-100",
  },
  amber: {
    wrap: "from-amber-50 to-amber-100/70",
    icon: "text-amber-600",
    ring: "ring-amber-100",
  },
  rose: {
    wrap: "from-rose-50 to-rose-100/70",
    icon: "text-rose-600",
    ring: "ring-rose-100",
  },
  sky: {
    wrap: "from-sky-50 to-sky-100/70",
    icon: "text-sky-600",
    ring: "ring-sky-100",
  },
};

export function QuickOpsSheet({
  open,
  onClose,
  title,
  description,
  items,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  items: QuickOpItem[];
}) {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={
        <span className="inline-flex items-center gap-2.5">
          <span
            aria-hidden
            className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-white/20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
            </svg>
          </span>
          <span className="bg-gradient-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent">
            {title}
          </span>
        </span>
      }
      description={description}
      closeButtonLabel={t("common.close")}
      narrow
    >
      {(() => {
        const grouped = new Map<QuickOpGroup, QuickOpItem[]>();
        for (const it of items) {
          const g = it.group ?? "register";
          if (!grouped.has(g)) grouped.set(g, []);
          grouped.get(g)!.push(it);
        }
        const orderedGroups = GROUP_ORDER.filter((g) => grouped.has(g));
        let globalIdx = 0;
        return (
          <div className="-mx-1 flex flex-col gap-5 pt-2">
            {orderedGroups.map((g) => {
              const groupItems = grouped.get(g)!;
              return (
                <section key={g} aria-label={GROUP_LABELS[g]} className="px-1">
                  <h3 className="mb-2.5 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    {GROUP_LABELS[g]}
                    <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-zinc-200 to-transparent" />
                  </h3>
                  <ul className="grid grid-cols-3 gap-1 sm:grid-cols-3 sm:gap-2" role="list">
                    {groupItems.map((it) => {
                      const tone = TONE[it.tone ?? "blue"];
                      const i = globalIdx++;
                      return (
                        <li
                          key={it.key}
                          style={{
                            animation: open
                              ? `quick-op-pop 320ms cubic-bezier(.22,1.2,.36,1) ${i * 35}ms both`
                              : undefined,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              it.onClick();
                            }}
                            className="group flex w-full flex-col items-center justify-start gap-2 rounded-2xl bg-transparent px-1 py-2 text-center text-zinc-900 transition active:scale-[0.95] focus-visible:outline-none"
                          >
                            <span
                              aria-hidden
                              className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br ${tone.wrap} ${tone.icon} shadow-sm ring-1 ${tone.ring} transition group-hover:-translate-y-0.5 group-hover:shadow-md group-active:shadow-sm sm:h-16 sm:w-16`}
                            >
                              {it.icon}
                            </span>
                            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-zinc-700 sm:text-xs">
                              {it.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        );
      })()}
      <style>{`
        @keyframes quick-op-pop {
          0% { opacity: 0; transform: translateY(10px) scale(.88); }
          60% { opacity: 1; transform: translateY(-1px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </Modal>
  );
}
