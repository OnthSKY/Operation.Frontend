"use client";

import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { shouldMountShipmentActionableBell } from "@/lib/auth/permissions";
import { cn } from "@/lib/cn";
import { useMyActionableShipmentsQuery } from "@/modules/shipments/hooks/useShipmentQueries";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { ShipmentActionable } from "@/types/shipment";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const ACTOR_LABEL_TR: Record<ShipmentActionable["actorRole"], string> = {
  STARTER: "Başlatıcı",
  APPROVER: "Onay bekliyor",
  WAREHOUSE: "Depo hazırlığı",
  DRIVER_ASSIGNER: "Şoför ataması",
  DISPATCHER: "Sevk",
  COMPLETER: "Teslim onayı",
};

const ACTOR_LABEL_EN: Record<ShipmentActionable["actorRole"], string> = {
  STARTER: "To start",
  APPROVER: "Awaiting approval",
  WAREHOUSE: "Warehouse prep",
  DRIVER_ASSIGNER: "Driver assignment",
  DISPATCHER: "Dispatch",
  COMPLETER: "Delivery confirmation",
};

function formatDateShort(iso: string | null | undefined, loc: string): string | null {
  if (!iso || iso.length < 10) return null;
  const p = iso.slice(0, 10).split("-").map(Number);
  if (p.length !== 3 || p.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = p;
  return new Date(y, m - 1, d).toLocaleDateString(loc === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

export function ShipmentActionableBell() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const mounted = shouldMountShipmentActionableBell(user);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const { data, isPending, isError } = useMyActionableShipmentsQuery(mounted);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted) return null;

  const items = data ?? [];
  const total = items.length;
  const isTr = locale === "tr";
  const title = isTr ? "Sevkiyat aksiyonları" : "Shipment actions";
  const emptyText = isTr ? "Beklemede sevkiyat yok." : "No pending shipments.";
  const loadingText = isTr ? "Yükleniyor…" : "Loading…";
  const errorText = isTr ? "Liste alınamadı." : "Failed to load.";
  const actorLabels = isTr ? ACTOR_LABEL_TR : ACTOR_LABEL_EN;

  // Bell'i ancak kullanıcı bir actor olarak atandıysa görünür yap — boş ise gizle ki UI gürültüsü olmasın.
  if (!isPending && !isError && total === 0) return null;

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <Tooltip content={title} delayMs={200}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-zinc-600 outline-none transition-colors",
            "hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-indigo-400",
            open && "bg-zinc-100 text-zinc-900"
          )}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={title}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 7.5l8.25-4.5 8.25 4.5M3.75 7.5v9l8.25 4.5M3.75 7.5L12 12m8.25-4.5v9L12 21m8.25-13.5L12 12m0 9V12"
            />
          </svg>
          {total > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-0.5 text-[0.6rem] font-bold text-white">
              {total > 9 ? "9+" : total}
            </span>
          ) : null}
        </button>
      </Tooltip>

      {open ? (
        <>
          <div
            className={cn(
              "fixed inset-0 bg-zinc-900/40 md:hidden",
              OVERLAY_Z_TW.remindersMobileBackdrop
            )}
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-900/5",
              "max-md:fixed max-md:left-[max(0.75rem,env(safe-area-inset-left,0px))] max-md:right-[max(0.75rem,env(safe-area-inset-right,0px))] max-md:top-[calc(0.5rem+3.5rem+env(safe-area-inset-top,0px))] max-md:max-h-[min(85dvh,calc(100dvh-4.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))] max-md:w-auto",
              OVERLAY_Z_TW.remindersPanel,
              "md:absolute md:right-0 md:top-full md:mt-1 md:max-h-[min(70dvh,22rem)] md:w-[min(100vw-1.5rem,22rem)]"
            )}
            role="dialog"
            aria-label={title}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
                aria-label={isTr ? "Kapat" : "Close"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
              {isPending ? (
                <p className="px-1 py-3 text-sm text-zinc-500">{loadingText}</p>
              ) : isError ? (
                <p className="px-1 py-3 text-sm text-rose-600">{errorText}</p>
              ) : total === 0 ? (
                <p className="px-1 py-3 text-sm text-zinc-500">{emptyText}</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((row) => {
                    const delivery = formatDateShort(row.requestedDeliveryDate, locale);
                    return (
                      <li
                        key={row.shipmentId}
                        className="rounded-lg bg-indigo-50/80 px-2.5 py-2 text-sm text-indigo-950 ring-1 ring-indigo-200/80"
                      >
                        <Link
                          href={`/shipments/${row.shipmentId}`}
                          onClick={() => setOpen(false)}
                          className="block break-words font-semibold text-indigo-950 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-600"
                        >
                          {row.shipmentNo}
                        </Link>
                        <span className="mt-0.5 block text-xs text-indigo-900/80">
                          {row.branchName} · {actorLabels[row.actorRole]}
                        </span>
                        {delivery ? (
                          <span className="mt-0.5 block text-[11px] text-indigo-800/75">
                            {isTr ? "Teslim:" : "Delivery:"} {delivery}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
