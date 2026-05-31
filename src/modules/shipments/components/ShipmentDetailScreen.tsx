"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { PERM, hasPermissionCode } from "@/lib/auth/permissions";
import {
  useAcceptShipmentRevision,
  useRequestShipmentRevision,
  useShipmentDetail,
  useTransitionShipment,
} from "@/modules/shipments/hooks/useShipmentQueries";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useProductsCatalogPaged } from "@/modules/products/hooks/useProductQueries";
import { Button } from "@/shared/ui/Button";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { cn } from "@/lib/cn";
import { apiFetch } from "@/lib/api/base-api";
import type { ShipmentNextActorRole, ShipmentRequest, ShipmentStatus } from "@/types/shipment";

const FLOW_STEPS: { status: ShipmentStatus; role: ShipmentNextActorRole | null }[] = [
  { status: "DRAFT", role: "STARTER" },
  { status: "PENDING_APPROVAL", role: "APPROVER" },
  { status: "PREPARING", role: "WAREHOUSE" },
  { status: "ON_THE_WAY", role: "COMPLETER" },
  { status: "DELIVERED", role: null },
];

const STATUS_TONE: Record<ShipmentStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 ring-amber-200",
  REVISION_REQUESTED: "bg-orange-100 text-orange-900 ring-orange-300",
  PREPARING: "bg-sky-100 text-sky-800 ring-sky-200",
  ON_THE_WAY: "bg-violet-100 text-violet-800 ring-violet-200",
  DELIVERED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 ring-rose-200",
};

function replaceVars(template: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

/** Timeline metadata_json'unu defensively parse eder. Bozuk JSON → null. */
function parseTimelineMeta(raw: string | null): { adminBypass?: boolean } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

type PermissionsSnapshot = {
  isAdmin: boolean;
  canStart: boolean;
  canApprove: boolean;
  canWarehouse: boolean;
  canDispatch: boolean;
  canComplete: boolean;
};

function readPermissions(user: ReturnType<typeof useAuth>["user"]): PermissionsSnapshot {
  const admin =
    hasPermissionCode(user, PERM.systemAdmin) || hasPermissionCode(user, PERM.operationsStaff);
  return {
    isAdmin: admin,
    canStart: admin || hasPermissionCode(user, PERM.shipmentStart),
    canApprove: admin || hasPermissionCode(user, PERM.shipmentApprove),
    canWarehouse: admin || hasPermissionCode(user, PERM.shipmentWarehousePrepare),
    canDispatch: admin || hasPermissionCode(user, PERM.shipmentDispatch),
    canComplete: admin || hasPermissionCode(user, PERM.shipmentComplete),
  };
}

type Action = {
  key: string;
  label: string;
  toStatus: ShipmentStatus;
  variant: "primary" | "secondary" | "danger";
  requiresNote?: boolean;
};

function availableActions(
  status: ShipmentStatus,
  perms: PermissionsSnapshot,
  t: (k: string) => string
): { actions: Action[]; canCancel: boolean } {
  const cancel: Action = {
    key: "cancel",
    label: t("shipments.detail.actionCancel"),
    toStatus: "CANCELLED",
    variant: "secondary",
    requiresNote: true,
  };
  switch (status) {
    case "DRAFT":
      return {
        actions: perms.canStart
          ? [
              {
                key: "submit",
                label: t("shipments.detail.actionSubmit"),
                toStatus: "PENDING_APPROVAL",
                variant: "primary",
              },
            ]
          : [],
        canCancel: perms.canStart,
      };
    case "PENDING_APPROVAL":
      return {
        actions: perms.canApprove
          ? [
              {
                key: "approve",
                label: t("shipments.detail.actionApprove"),
                toStatus: "PREPARING",
                variant: "primary",
              },
              {
                // Yeni: değişiklik iste (modal açar — toStatus null, key ile handle edilir).
                key: "requestRevision",
                label: t("shipments.detail.actionRequestRevision"),
                toStatus: "REVISION_REQUESTED",
                variant: "secondary",
              },
              {
                // Reddet artık FİNAL (CANCELLED). Talep edene düşmez.
                key: "reject",
                label: t("shipments.detail.actionReject"),
                toStatus: "CANCELLED",
                variant: "danger",
                requiresNote: true,
              },
            ]
          : [],
        canCancel: false,  // PENDING_APPROVAL'da iptal onaycı tarafından "reddet" üzerinden yapılır
      };
    case "REVISION_REQUESTED":
      // Talep eden öneriyi inceler. Kabul ederse PENDING_APPROVAL'a döner; iptal ederse CANCELLED.
      return {
        actions: perms.canStart
          ? [
              {
                key: "acceptRevision",
                label: t("shipments.detail.actionAcceptRevision"),
                toStatus: "PENDING_APPROVAL",
                variant: "primary",
              },
            ]
          : [],
        canCancel: perms.canStart,
      };
    case "PREPARING":
      return {
        actions:
          perms.canWarehouse || perms.canDispatch
            ? [
                {
                  key: "dispatch",
                  label: t("shipments.detail.actionDispatch"),
                  toStatus: "ON_THE_WAY",
                  variant: "primary",
                },
              ]
            : [],
        canCancel: perms.canStart,
      };
    case "ON_THE_WAY":
      return {
        actions: perms.canComplete
          ? [
              {
                key: "deliver",
                label: t("shipments.detail.actionDeliver"),
                toStatus: "DELIVERED",
                variant: "primary",
              },
            ]
          : [],
        canCancel: false,
      };
    default:
      return { actions: [], canCancel: false };
  }
  // unreachable; just satisfy ts noFallthroughCasesInSwitch
  void cancel;
}

function findStepIndex(status: ShipmentStatus): number {
  const idx = FLOW_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

function assigneeForRole(role: ShipmentNextActorRole | null, a: ShipmentRequest["stepAssignees"]): string | null {
  if (!role || !a) return null;
  switch (role) {
    case "STARTER": return a.starterFullName;
    case "APPROVER": return a.approverFullName;
    case "WAREHOUSE": return a.warehouseFullName;
    case "COMPLETER": return a.completerFullName;
    default: return null;
  }
}

function StepIndicator({
  status,
  assignees,
  t,
}: {
  status: ShipmentStatus;
  assignees: ShipmentRequest["stepAssignees"];
  t: (k: string) => string;
}) {
  const cancelled = status === "CANCELLED";
  const currentIdx = cancelled ? -1 : findStepIndex(status);
  const lastIdx = FLOW_STEPS.length - 1;
  const progressPct = cancelled ? 0 : Math.min(100, Math.max(0, (currentIdx / lastIdx) * 100));

  if (cancelled) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-3 sm:px-4">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-[11px] font-semibold text-white">
          ×
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-900">{t("shipments.status.CANCELLED")}</p>
          <p className="text-xs text-rose-800/80">{t("shipments.detail.actionsTerminalCancelled")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile (<sm): vertical timeline with connecting line */}
      <ol className="flex flex-col sm:hidden">
        {FLOW_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isLast = idx === lastIdx;
          return (
            <li key={step.status} className="relative flex gap-3 pb-3.5 last:pb-0">
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[11px] top-7 bottom-0 w-0.5",
                    isDone ? "bg-emerald-400" : "bg-zinc-200"
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm transition",
                  isDone
                    ? "bg-emerald-500 ring-4 ring-white"
                    : isCurrent
                      ? "bg-indigo-600 ring-4 ring-indigo-100"
                      : "bg-zinc-300 ring-4 ring-white"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? "✓" : idx + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    isCurrent ? "text-indigo-950" : isDone ? "text-emerald-900" : "text-zinc-700"
                  )}
                >
                  {t(`shipments.status.${step.status}`)}
                </p>
                {step.role ? (
                  <p
                    className={cn(
                      "mt-0.5 text-[11px] leading-tight",
                      isCurrent
                        ? "font-medium text-indigo-600"
                        : isDone
                          ? "text-emerald-700/80"
                          : "text-zinc-500"
                    )}
                  >
                    {t(`shipments.roles.${step.role}`)}
                  </p>
                ) : null}
                {(() => {
                  const assignee = assigneeForRole(step.role, assignees);
                  return assignee ? (
                    <p
                      className={cn(
                        "mt-0.5 truncate text-[11px] font-semibold leading-tight",
                        isCurrent ? "text-indigo-800" : isDone ? "text-emerald-800" : "text-zinc-600"
                      )}
                      title={assignee}
                    >
                      {assignee}
                    </p>
                  ) : step.role ? (
                    <p className="mt-0.5 text-[10px] italic leading-tight text-zinc-400">
                      {t("shipments.detail.stepUnassigned")}
                    </p>
                  ) : null;
                })()}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Desktop (sm+): horizontal stepper with progress track behind dots */}
      <div className="relative hidden sm:block">
        {/* Background track */}
        <div
          aria-hidden
          className="absolute left-3 right-3 top-3 h-0.5 rounded-full bg-zinc-200"
        >
          {/* Progress fill */}
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <ol className="relative flex items-start justify-between gap-1">
          {FLOW_STEPS.map((step, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <li
                key={step.status}
                className="flex min-w-0 max-w-[6.5rem] flex-1 flex-col items-center gap-2 md:max-w-[8rem]"
              >
                <span
                  className={cn(
                    "relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm transition",
                    isDone
                      ? "bg-emerald-500 ring-4 ring-white"
                      : isCurrent
                        ? "bg-indigo-600 ring-4 ring-indigo-100"
                        : "bg-zinc-300 ring-4 ring-white"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                  title={t(`shipments.status.${step.status}`)}
                >
                  {isDone ? "✓" : idx + 1}
                </span>
                <div className="min-w-0 text-center">
                  <p
                    className={cn(
                      "text-[11px] font-semibold leading-tight",
                      isCurrent ? "text-indigo-950" : isDone ? "text-emerald-900" : "text-zinc-600"
                    )}
                  >
                    {t(`shipments.status.${step.status}`)}
                  </p>
                  {step.role ? (
                    <p
                      className={cn(
                        "mt-0.5 text-[10px] leading-tight",
                        isCurrent
                          ? "font-medium text-indigo-600"
                          : isDone
                            ? "text-emerald-700/80"
                            : "text-zinc-500"
                      )}
                    >
                      {t(`shipments.roles.${step.role}`)}
                    </p>
                  ) : null}
                  {(() => {
                    const assignee = assigneeForRole(step.role, assignees);
                    return assignee ? (
                      <p
                        className={cn(
                          "mt-0.5 truncate text-[10px] font-semibold leading-tight",
                          isCurrent ? "text-indigo-800" : isDone ? "text-emerald-800" : "text-zinc-600"
                        )}
                        title={assignee}
                      >
                        {assignee}
                      </p>
                    ) : step.role ? (
                      <p className="mt-0.5 truncate text-[10px] italic leading-tight text-zinc-400">
                        {t("shipments.detail.stepUnassigned")}
                      </p>
                    ) : null;
                  })()}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

function CurrentActorCard({
  shipment,
  t,
}: {
  shipment: ShipmentRequest;
  t: (k: string) => string;
}) {
  // Terminal states show their badge in the header instead.
  if (shipment.status === "DELIVERED" || shipment.status === "CANCELLED") return null;
  const role = shipment.nextActorRole;
  const roleLabel = role ? t(`shipments.roles.${role}`) : "—";
  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
        {t("shipments.detail.currentlyWith")}
      </p>
      <p className="mt-2 text-base font-semibold text-indigo-950">{roleLabel}</p>
      {shipment.nextActorFullName ? (
        <p className="mt-1 text-sm text-indigo-900">
          {replaceVars(t("shipments.detail.currentlyWithName"), {
            name: shipment.nextActorFullName,
          })}
        </p>
      ) : (
        <p className="mt-1 text-sm text-indigo-900/70">
          {t("shipments.detail.currentlyWithUnassigned")}
        </p>
      )}
    </div>
  );
}

export function ShipmentDetailScreen({ id }: { id: number }) {
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const { data, isPending } = useShipmentDetail(id);
  const { data: productPage } = useProductsCatalogPaged(1, 200, "", true, true, true);
  const transition = useTransitionShipment();
  const requestRevision = useRequestShipmentRevision();
  const acceptRevision = useAcceptShipmentRevision();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  // "Teslim aldım" akışı: önce preview modal, kullanıcı onaylayınca DELIVERED transition + indir.
  const [deliveryPreviewOpen, setDeliveryPreviewOpen] = useState(false);
  const [deliveryPreviewUrl, setDeliveryPreviewUrl] = useState<string | null>(null);
  const [deliveryPreviewLoading, setDeliveryPreviewLoading] = useState(false);
  const [deliveryConfirming, setDeliveryConfirming] = useState(false);

  const products = productPage?.items ?? [];
  const productsById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const perms = useMemo(() => readPermissions(user), [user]);

  // Object URL leak guard — modal kapanmadan unmount olursa temizle.
  // Erken return'lerden ÖNCE çağrılmalı (Rules of Hooks).
  useEffect(() => {
    return () => {
      if (deliveryPreviewUrl) URL.revokeObjectURL(deliveryPreviewUrl);
    };
  }, [deliveryPreviewUrl]);

  if (isPending || !data) {
    return <div className="p-4 text-sm text-zinc-500">{t("common.loading")}</div>;
  }

  const { actions, canCancel } = availableActions(data.status, perms, t);
  const currentIdx = findStepIndex(data.status);
  const totalSteps = FLOW_STEPS.length;

  /**
   * Önemli: Promise döndürür — Button bileşeni Promise tamamlanana dek busy/disabled tutar
   * (shared/ui/Button: SYNC_BUSY_MS=450 vs Promise tracking). Bu sayede ağ bekleyişinde
   * çift tıklama ENGELLENİR + spinner-style busy animasyonu görünür.
   */
  const trigger = async (action: Action): Promise<void> => {
    // "Değişiklik iste" özel action — modal açar, transition tetiklemez.
    if (action.key === "requestRevision") {
      setNoteError(null);
      setRevisionModalOpen(true);
      return;
    }
    // "Teslim aldım" özel akış — DELIVERED transition öncesi PDF önizleme modal'ı açılır.
    // Kullanıcı önizlemeyi onaylarsa transition fire edilir + kalıcı PDF auto-download başlar.
    if (action.toStatus === "DELIVERED") {
      const trimmed = note.trim();
      if (action.requiresNote && trimmed.length === 0) {
        setNoteError(t("shipments.detail.notesPlaceholder"));
        return;
      }
      setNoteError(null);
      await openDeliveryPreview();
      return;
    }
    // "Öneriyi kabul et" — accept-revision endpoint'i çağırır (toStatus PENDING_APPROVAL).
    if (action.key === "acceptRevision") {
      const trimmed = note.trim();
      setNoteError(null);
      try {
        await acceptRevision.mutateAsync({
          id,
          body: { note: trimmed.length > 0 ? trimmed : null },
        });
        setNote("");
      } catch (e) {
        notify.error(toErrorMessage(e));
      }
      return;
    }

    const trimmed = note.trim();
    if (action.requiresNote && trimmed.length === 0) {
      setNoteError(
        action.toStatus === "CANCELLED"
          ? data.status === "PENDING_APPROVAL"
            ? t("shipments.detail.rejectReasonRequired")
            : t("shipments.detail.cancelReasonRequired")
          : t("shipments.detail.notesPlaceholder"),
      );
      return;
    }
    setNoteError(null);
    try {
      await transition.mutateAsync({
        id,
        toStatus: action.toStatus,
        note: trimmed.length > 0 ? trimmed : undefined,
      });
      setNote("");
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  // -------------------- Delivery preview & confirm flow --------------------

  const openDeliveryPreview = async (): Promise<void> => {
    setDeliveryPreviewOpen(true);
    setDeliveryPreviewLoading(true);
    try {
      const res = await apiFetch(`/shipment-requests/${id}/delivery-slip/preview`);
      if (!res.ok) throw new Error(`Preview fetch failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDeliveryPreviewUrl(url);
    } catch (e) {
      notify.error(toErrorMessage(e));
      setDeliveryPreviewOpen(false);
    } finally {
      setDeliveryPreviewLoading(false);
    }
  };

  const closeDeliveryPreview = () => {
    setDeliveryPreviewOpen(false);
    if (deliveryPreviewUrl) URL.revokeObjectURL(deliveryPreviewUrl);
    setDeliveryPreviewUrl(null);
  };

  const confirmDelivery = async (): Promise<void> => {
    if (deliveryConfirming) return;
    setDeliveryConfirming(true);
    const trimmed = note.trim();
    try {
      await transition.mutateAsync({
        id,
        toStatus: "DELIVERED",
        note: trimmed.length > 0 ? trimmed : undefined,
      });
      setNote("");
      // Kalıcı PDF'i (branch_documents'taki kayıtlı sürüm) indir.
      try {
        const res = await apiFetch(`/shipment-requests/${id}/delivery-slip`);
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `sevkiyat-teslim-irsaliye-${id}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      } catch {
        // İndirme hata alırsa transition başarılıydı — sessizce geç, kullanıcı belge listesinden ulaşır.
      }
      closeDeliveryPreview();
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setDeliveryConfirming(false);
    }
  };


  // Group items by parent product for the "parent totals" view.
  type ParentBucket = { name: string; unit: string | null; quantity: number };
  const lineEntries = data.items.map((item) => {
    const product = productsById.get(item.productId);
    return { item, product };
  });
  const parentTotals = (() => {
    const map = new Map<string, ParentBucket>();
    for (const { item, product } of lineEntries) {
      if (!product) continue;
      // Prefer parent-by-id lookup (catalog parent name), then parentProductName field, then own name.
      const parentId = product.parentProductId;
      const parentFromCatalog = parentId && parentId > 0 ? productsById.get(parentId) : undefined;
      const parent =
        parentFromCatalog?.name.trim() ||
        product.parentProductName?.trim() ||
        product.name.trim();
      const unit = product.unit;
      const key = `${parent}::${unit ?? ""}`;
      const existing = map.get(key);
      if (existing) existing.quantity += Number(item.requestedQuantity) || 0;
      else map.set(key, { name: parent, unit, quantity: Number(item.requestedQuantity) || 0 });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        {data.status === "DELIVERED" ? (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-inset ring-emerald-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("shipments.detail.terminalDeliveredBadge")}
          </div>
        ) : null}
        {data.status === "CANCELLED" ? (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-800 ring-1 ring-inset ring-rose-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
            {t("shipments.detail.terminalCancelledBadge")}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {replaceVars(t("shipments.detail.stepLabel"), {
                current: data.status === "CANCELLED" ? 0 : currentIdx + 1,
                total: totalSteps,
              })}
            </p>
            <h1 className="mt-1 break-all text-xl font-semibold tracking-tight text-zinc-950 sm:break-normal sm:text-2xl">
              {data.shipmentNo}
            </h1>
            <p className="mt-1 text-xs text-zinc-600">
              <span className="font-medium text-zinc-700">{t("shipments.detail.routeBranch")}:</span>{" "}
              {(data.branchName || "").trim() || `#${data.branchId}`}
              <span className="mx-1.5 text-zinc-400">·</span>
              <span className="font-medium text-zinc-700">{t("shipments.detail.routeWarehouse")}:</span>{" "}
              {(data.warehouseName || "").trim() || `#${data.warehouseId}`}
            </p>
          </div>
          <span
            className={`inline-flex h-7 shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 text-xs font-medium ring-1 ring-inset ${STATUS_TONE[data.status]}`}
          >
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {t(`shipments.status.${data.status}`)}
          </span>
        </div>
      </div>

      {/* REVISION_REQUESTED banner — talep edene onaylayıcının değişiklik notu, tema rengiyle (amber) vurgulu */}
      {data.status === "REVISION_REQUESTED" ? (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/70 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900"
              aria-hidden
            >
              <span className="text-lg font-bold">✎</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-950">
                {t("shipments.detail.revisionBannerTitle")}
              </p>
              <p className="mt-0.5 text-xs text-amber-900/85">
                {replaceVars(t("shipments.detail.revisionBannerSubtitle"), {
                  by: data.revisionRequestedByFullName ?? "—",
                })}
              </p>
              {data.revisionNote ? (
                <div className="mt-2 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-amber-200/80">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                    {t("shipments.detail.revisionNoteLabel")}
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-amber-950">
                    {data.revisionNote}
                  </p>
                </div>
              ) : null}
              <p className="mt-2 text-[11px] leading-relaxed text-amber-900/75">
                {t("shipments.detail.revisionBannerHint")}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Step indicator */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {t("shipments.detail.progressTitle")}
        </p>
        <StepIndicator status={data.status} assignees={data.stepAssignees} t={t} />
      </div>

      {/* Two-column layout: items on left, action + timeline on right */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 space-y-4">
          {/* Requested items: parent totals first, then bounded scrollable line list */}
          <div className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-950">
              {t("shipments.detail.requestSection")}
            </h2>
            {lineEntries.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">{t("shipments.detail.requestEmpty")}</p>
            ) : (
              <div className="mt-3 flex min-w-0 flex-col gap-3">
                {parentTotals.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("shipments.create.summaryParentTotals")}
                    </p>
                    <ul className="mt-1.5 divide-y divide-emerald-100 overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/40">
                      {parentTotals.map((b) => (
                        <li
                          key={`${b.name}-${b.unit ?? ""}`}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                        >
                          <span className="truncate font-semibold text-zinc-900">{b.name}</span>
                          <span className="shrink-0 tabular-nums font-semibold text-emerald-900">
                            {formatLocaleAmount(b.quantity, locale)}
                            {b.unit ? ` ${b.unit}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div>
                  {parentTotals.length > 0 ? (
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("shipments.detail.lineDetails")}
                    </p>
                  ) : null}
                  {/* Bounded scrollable list so the page layout stays stable when 50+ lines are present */}
                  <div className="overflow-hidden rounded-xl border border-zinc-100">
                    <ul className="max-h-[22rem] divide-y divide-zinc-100 overflow-y-auto overscroll-contain sm:max-h-[26rem]">
                      {lineEntries.map(({ item, product }) => {
                        const unit = product?.unit?.trim();
                        const requestedQty = formatLocaleAmount(Number(item.requestedQuantity) || 0, locale);
                        // Revision highlight: önerilen miktar mevcut talepten farklıysa amber vurgulu satır,
                        // requested üstü çizili + proposed bold + ✏ ikonuyla gösterilir (tema rengiyle).
                        const hasProposal =
                          item.proposedQuantity != null
                          && Number(item.proposedQuantity) !== Number(item.requestedQuantity);
                        const proposedQty = hasProposal
                          ? formatLocaleAmount(Number(item.proposedQuantity ?? 0), locale)
                          : null;
                        return (
                          <li
                            key={item.id}
                            className={cn(
                              "flex items-baseline justify-between gap-3 px-3 py-2 transition-colors",
                              hasProposal
                                ? "bg-amber-50/80 ring-1 ring-inset ring-amber-200/60"
                                : ""
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-900">
                                {product
                                  ? product.parentProductName?.trim() &&
                                    product.parentProductName.trim() !== product.name.trim()
                                    ? `${product.parentProductName} › ${product.name}`
                                    : product.name
                                  : `#${item.productId}`}
                              </p>
                              {item.note ? (
                                <p className="truncate text-[11px] text-zinc-500">{item.note}</p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-baseline gap-2">
                              {hasProposal ? (
                                <>
                                  <span
                                    className="tabular-nums text-xs font-medium text-zinc-400 line-through"
                                    title={t("shipments.detail.originalQty")}
                                  >
                                    {unit ? `${requestedQty} ${unit}` : requestedQty}
                                  </span>
                                  <span
                                    className="inline-flex items-center gap-1 rounded-md bg-amber-200/70 px-1.5 py-0.5 text-sm font-bold tabular-nums text-amber-950 ring-1 ring-amber-300/80"
                                    title={t("shipments.detail.proposedQty")}
                                  >
                                    <span aria-hidden>✎</span>
                                    {unit ? `${proposedQty} ${unit}` : proposedQty}
                                  </span>
                                </>
                              ) : (
                                <span className="tabular-nums text-sm font-semibold text-zinc-900">
                                  {unit ? `${requestedQty} ${unit}` : requestedQty}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {lineEntries.length > 8 ? (
                    <p className="mt-1 text-[10px] text-zinc-400">
                      {replaceVars(t("shipments.detail.lineCount"), { count: lineEntries.length })}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right rail: actor + actions + timeline */}
        <aside className="min-w-0 space-y-4">
          <CurrentActorCard shipment={data} t={t} />

          {actions.length > 0 || canCancel ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                {t("shipments.detail.notesLabel")}
              </label>
              <textarea
                className={cn(
                  "mt-1.5 min-h-[5rem] w-full resize-y rounded-lg border bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
                  noteError ? "border-rose-300" : "border-zinc-200"
                )}
                placeholder={t("shipments.detail.notesPlaceholder")}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (noteError) setNoteError(null);
                }}
              />
              {noteError ? (
                <p className="mt-1 text-xs text-rose-600">{noteError}</p>
              ) : null}
              <div className="mt-3 flex flex-col gap-2">
                {actions.map((a) => (
                  <Button
                    key={a.key}
                    type="button"
                    variant={a.variant === "primary" ? "primary" : "secondary"}
                    className={cn(
                      a.variant === "danger" && "!bg-rose-600 !text-white hover:!bg-rose-500"
                    )}
                    onClick={() => trigger(a)}
                    disabled={transition.isPending}
                  >
                    {a.label}
                  </Button>
                ))}
                {canCancel ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="!text-rose-700 hover:!bg-rose-50"
                    onClick={() =>
                      trigger({
                        key: "cancel",
                        label: t("shipments.detail.actionCancel"),
                        toStatus: "CANCELLED",
                        variant: "secondary",
                        requiresNote: true,
                      })
                    }
                    disabled={transition.isPending}
                  >
                    {t("shipments.detail.actionCancel")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : data.status !== "DELIVERED" && data.status !== "CANCELLED" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
              {t("shipments.detail.actionsNotPermitted")}
            </div>
          ) : null}

          {data.status === "DELIVERED" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-emerald-900">
                    {t("shipments.detail.deliverySlipTitle")}
                  </h2>
                  <p className="mt-0.5 text-xs text-emerald-800/80">
                    {t("shipments.detail.deliverySlipHint")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const res = await apiFetch(`/shipment-requests/${id}/delivery-slip`);
                      if (!res.ok) throw new Error(`Download failed (${res.status})`);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `sevkiyat-teslim-irsaliye-${id}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      notify.error(toErrorMessage(e));
                    }
                  }}
                >
                  {t("shipments.detail.deliverySlipDownload")}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Timeline — bounded, scrollable inside the card so the page height stays stable */}
          <div className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-950">
              {t("shipments.detail.timelineTitle")}
            </h2>
            {data.timeline.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-500">—</p>
            ) : (
              <ol className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto overscroll-contain pr-1">
                {data.timeline.map((h) => {
                  const meta = parseTimelineMeta(h.metadataJson);
                  const isAdminBypass = meta?.adminBypass === true;
                  return (
                    <li
                      key={h.id}
                      className={cn(
                        "border-l-2 pl-3",
                        isAdminBypass
                          ? "border-amber-400 bg-amber-50/40 -ml-px rounded-r-md py-1 pr-2 ring-1 ring-inset ring-amber-200/70"
                          : "border-zinc-200",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                              STATUS_TONE[h.toStatus as ShipmentStatus] ??
                              "bg-zinc-100 text-zinc-700 ring-zinc-200"
                            }`}
                          >
                            {t(`shipments.status.${h.toStatus}`)}
                          </span>
                          {isAdminBypass ? (
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-inset ring-amber-300/80 sm:text-[11px]"
                              title={t("shipments.detail.timelineBypassTooltip")}
                            >
                              <span aria-hidden>⚡</span>
                              {t("shipments.detail.timelineBypassBadge")}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-zinc-500 tabular-nums">
                          {new Date(h.changedAt).toLocaleString()}
                        </span>
                      </div>
                      {h.note ? (
                        <p className="mt-1 break-words text-xs text-zinc-600">
                          {replaceVars(t("shipments.detail.timelineNote"), { note: h.note })}
                        </p>
                      ) : null}
                      {h.changedByFullName?.trim() ? (
                        <p className="mt-0.5 text-[11px] font-medium text-zinc-600">
                          {replaceVars(t("shipments.detail.timelineActor"), {
                            name: h.changedByFullName.trim(),
                          })}
                          {isAdminBypass ? (
                            <span className="ml-1 text-[10px] font-normal italic text-amber-800">
                              · {t("shipments.detail.timelineBypassActorSuffix")}
                            </span>
                          ) : null}
                        </p>
                      ) : h.changedBy ? (
                        <p className="mt-0.5 text-[10px] text-zinc-400">
                          {replaceVars(t("shipments.detail.timelineAuthor"), {
                            userId: h.changedBy,
                          })}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </aside>
      </div>

      {revisionModalOpen ? (
        <RevisionRequestModal
          shipment={data}
          isPending={requestRevision.isPending}
          locale={locale}
          productsById={productsById}
          t={t}
          onClose={() => setRevisionModalOpen(false)}
          onSubmit={async (proposedLines, noteValue) => {
            try {
              await requestRevision.mutateAsync({
                id,
                body: { proposedLines, note: noteValue?.trim() || null },
              });
              notify.success(t("shipments.detail.revisionSentToast"));
              setRevisionModalOpen(false);
            } catch (e) {
              notify.error(toErrorMessage(e));
            }
          }}
        />
      ) : null}

      {deliveryPreviewOpen ? (
        <DeliveryPreviewModal
          shipmentNo={data.shipmentNo}
          previewUrl={deliveryPreviewUrl}
          isLoading={deliveryPreviewLoading}
          isConfirming={deliveryConfirming}
          onClose={closeDeliveryPreview}
          onConfirm={confirmDelivery}
          t={t}
        />
      ) : null}
    </div>
  );
}

// ============================================================================
// Delivery Preview Modal — "Teslim aldım" sonrası DELIVERED tetiklenmeden önce
// PDF irsaliyenin önizlemesi gösterilir. Tablet kullanımı için responsive iframe.
// ============================================================================
type DeliveryPreviewModalProps = {
  shipmentNo: string;
  previewUrl: string | null;
  isLoading: boolean;
  isConfirming: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  t: (k: string) => string;
};

function DeliveryPreviewModal({
  shipmentNo,
  previewUrl,
  isLoading,
  isConfirming,
  onClose,
  onConfirm,
  t,
}: DeliveryPreviewModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/60 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("shipments.detail.deliveryPreviewTitle")}
    >
      <div className="flex h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-zinc-950 sm:text-lg">
              {t("shipments.detail.deliveryPreviewTitle")}
            </h2>
            <p className="mt-0.5 truncate text-xs text-zinc-600 sm:text-sm">
              {t("shipments.detail.deliveryPreviewSubtitle")} · #{shipmentNo}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50"
            aria-label={t("common.close")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* PDF preview area */}
        <div className="relative flex-1 overflow-hidden bg-zinc-100">
          {isLoading || !previewUrl ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700"
                  aria-hidden
                />
                <p className="text-sm">{t("shipments.detail.deliveryPreviewLoading")}</p>
              </div>
            </div>
          ) : (
            <iframe
              title={t("shipments.detail.deliveryPreviewTitle")}
              src={previewUrl}
              className="h-full w-full border-0"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-zinc-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-[11px] text-zinc-500 sm:text-xs">
            {t("shipments.detail.deliveryPreviewHint")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isConfirming}
            >
              {t("shipments.detail.deliveryPreviewCancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onConfirm}
              disabled={isLoading || !previewUrl || isConfirming}
            >
              {isConfirming
                ? t("shipments.detail.deliveryPreviewConfirming")
                : t("shipments.detail.deliveryPreviewConfirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type RevisionRequestModalProps = {
  shipment: ShipmentRequest;
  isPending: boolean;
  locale: Locale;
  productsById: Map<number, ReturnType<typeof useProductsCatalogPaged>["data"] extends infer T
    ? T extends { items: infer I } ? (I extends Array<infer U> ? U : never) : never
    : never>;
  t: (k: string) => string;
  onClose: () => void;
  onSubmit: (proposedLines: Array<{ itemId: number; proposedQuantity: number }>, note: string) => void;
};

function RevisionRequestModal({
  shipment,
  isPending,
  locale,
  productsById,
  t,
  onClose,
  onSubmit,
}: RevisionRequestModalProps) {
  // Draft state: her satır için (string olarak tut, kullanıcı boş bırakırsa hesaba katma).
  const [draftQty, setDraftQty] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      shipment.items.map((it) => [it.id, String(Number(it.requestedQuantity))]),
    ),
  );
  const [draftNote, setDraftNote] = useState("");

  const proposedLines = shipment.items
    .map((it) => {
      const raw = draftQty[it.id];
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return null;
      if (parsed === Number(it.requestedQuantity)) return null;
      return { itemId: it.id, proposedQuantity: parsed };
    })
    .filter((x): x is { itemId: number; proposedQuantity: number } => x !== null);

  const hasChanges = proposedLines.length > 0;
  const canSubmit = !isPending && (hasChanges || draftNote.trim().length > 0);

  return (
    <Modal
      open
      onClose={onClose}
      titleId="shipment-revision-modal-title"
      title={t("shipments.detail.revisionModalTitle")}
      description={t("shipments.detail.revisionModalDescription")}
      closeButtonLabel={t("common.close")}
      wide
      wideFixedHeight
      wideFullScreenMobile
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50/80 sm:bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-3 sm:px-5">
          <ul className="space-y-2">
            {shipment.items.map((item) => {
              const product = productsById.get(item.productId);
              const unit = product?.unit?.trim();
              const originalQty = Number(item.requestedQuantity);
              const draftValue = draftQty[item.id] ?? "";
              const parsed = Number(draftValue);
              const changed = Number.isFinite(parsed) && parsed !== originalQty;
              const tooHigh = Number.isFinite(parsed) && parsed > originalQty;
              const negative = Number.isFinite(parsed) && parsed < 0;
              const errorMsg = negative
                ? t("shipments.detail.revisionErrorNegative")
                : tooHigh
                  ? t("shipments.detail.revisionErrorTooHigh")
                  : "";
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-xl border bg-white p-3 transition-colors sm:p-4",
                    changed && !errorMsg
                      ? "border-amber-300 bg-amber-50/60 ring-1 ring-amber-200/60"
                      : errorMsg
                        ? "border-red-300 bg-red-50/60"
                        : "border-zinc-200",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {product
                          ? product.parentProductName?.trim() &&
                            product.parentProductName.trim() !== product.name.trim()
                            ? `${product.parentProductName} › ${product.name}`
                            : product.name
                          : `#${item.productId}`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {t("shipments.detail.originalQty")}:{" "}
                        <span className="font-mono tabular-nums">
                          {formatLocaleAmount(originalQty, locale)}
                          {unit ? ` ${unit}` : ""}
                        </span>
                      </p>
                    </div>
                    <div className="w-32 shrink-0">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max={originalQty}
                        inputMode="decimal"
                        value={draftValue}
                        onChange={(e) =>
                          setDraftQty((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        error={errorMsg || undefined}
                        className={cn(
                          "text-right md:h-11",
                          changed && !errorMsg && "border-amber-400 ring-amber-200",
                        )}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-700">
              {t("shipments.detail.revisionNoteInputLabel")}
            </label>
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder={t("shipments.detail.revisionNotePlaceholder")}
              rows={3}
              className="mt-1.5 block w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-zinc-200 bg-zinc-50/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:p-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={isPending}
            onClick={onClose}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-[2]"
            disabled={!canSubmit}
            onClick={() => onSubmit(proposedLines, draftNote)}
          >
            {isPending
              ? t("common.saving")
              : hasChanges
                ? replaceVars(t("shipments.detail.revisionSubmitWithCount"), {
                    count: proposedLines.length,
                  })
                : t("shipments.detail.revisionSubmitNoteOnly")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
