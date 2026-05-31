"use client";

import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasPermissionCode, PERM } from "@/lib/auth/permissions";
import { cn } from "@/lib/cn";
import {
  useSaveShipmentBranchAssignment,
  useShipmentBranchAssignments,
} from "@/modules/shipments/hooks/useShipmentQueries";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import type { ShipmentBranchAssignment } from "@/types/shipment";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Search, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type DraftRow = {
  starterUserId: string;
  approverUserId: string;
  warehouseUserId: string;
  driverAssignerUserId: string;
  dispatcherUserId: string;
  completerUserId: string;
};

const ACTOR_KEYS = [
  "starterUserId",
  "approverUserId",
  "warehouseUserId",
  "driverAssignerUserId",
  "dispatcherUserId",
  "completerUserId",
] as const;

type ActorKey = (typeof ACTOR_KEYS)[number];

// UI'da görünen aktörler (3): Onaylayıcı + Depo görevlisi + Şoför.
// "Başlatıcı" dinamiktir (izin sahibi herkes yapar). Dispatcher + Completer ileride başka
// akışlarla atanır; şimdilik UI'dan saklanır ve save'de ORİJİNAL DEĞERLER KORUNUR
// (hidden field'ların admin niyeti olmaksızın null'a yazılmasını önlemek için).
const VISIBLE_ACTOR_KEYS = [
  "approverUserId",
  "warehouseUserId",
  "driverAssignerUserId",
] as const satisfies readonly ActorKey[];

type VisibleActorKey = (typeof VISIBLE_ACTOR_KEYS)[number];

function emptyDraft(): DraftRow {
  return {
    starterUserId: "",
    approverUserId: "",
    warehouseUserId: "",
    driverAssignerUserId: "",
    dispatcherUserId: "",
    completerUserId: "",
  };
}

function rowToDraft(row: ShipmentBranchAssignment): DraftRow {
  return {
    starterUserId: row.starterUserId ? String(row.starterUserId) : "",
    approverUserId: row.approverUserId ? String(row.approverUserId) : "",
    warehouseUserId: row.warehouseUserId ? String(row.warehouseUserId) : "",
    driverAssignerUserId: row.driverAssignerUserId ? String(row.driverAssignerUserId) : "",
    dispatcherUserId: row.dispatcherUserId ? String(row.dispatcherUserId) : "",
    completerUserId: row.completerUserId ? String(row.completerUserId) : "",
  };
}

function toNullableId(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function actorLabel(key: VisibleActorKey, t: (k: string) => string): string {
  switch (key) {
    case "approverUserId":
      return t("shipments.assignments.actorApprover");
    case "warehouseUserId":
      return t("shipments.assignments.actorWarehouse");
    case "driverAssignerUserId":
      return t("shipments.assignments.actorDriver");
  }
}

function actorDescription(key: VisibleActorKey, t: (k: string) => string): string {
  switch (key) {
    case "approverUserId":
      return t("shipments.assignments.actorApproverHint");
    case "warehouseUserId":
      return t("shipments.assignments.actorWarehouseHint");
    case "driverAssignerUserId":
      return t("shipments.assignments.actorDriverHint");
  }
}

export function ShipmentAssignmentsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const isAdmin = hasPermissionCode(user, PERM.systemAdmin);

  // Sayfayı yalnız admin'e aç (mevcut routing'le tutarlı).
  useEffect(() => {
    if (isReady && user && !isAdmin) router.replace("/shipments");
  }, [isReady, user, isAdmin, router]);

  const { data, isPending, isError, refetch } = useShipmentBranchAssignments();
  const save = useSaveShipmentBranchAssignment();

  const [drafts, setDrafts] = useState<Record<number, DraftRow>>({});
  const [branchSearch, setBranchSearch] = useState("");

  // Sunucu cevabı geldiğinde draft'ları yeniden seed et (dirty olmayanlar refresh olur).
  useEffect(() => {
    if (!data) return;
    setDrafts((prev) => {
      const next: Record<number, DraftRow> = {};
      for (const row of data.assignments) {
        next[row.branchId] = prev[row.branchId] ?? rowToDraft(row);
      }
      return next;
    });
  }, [data]);

  const userOptions: RichComboboxOption[] = useMemo(
    () =>
      (data?.users ?? []).map((u) => ({
        value: String(u.userId),
        title: u.fullName?.trim() || u.username,
        description: u.username,
      })),
    [data?.users],
  );

  const filteredAssignments = useMemo(() => {
    if (!data) return [];
    const q = branchSearch.trim().toLowerCase();
    if (!q) return data.assignments;
    return data.assignments.filter((a) => a.branchName.toLowerCase().includes(q));
  }, [data, branchSearch]);

  // Dirty kontrolü yalnız VISIBLE alanlar üzerinden — saklanan alanlardaki orijinal değer
  // hiç değişmediği için onları kontrole katmaya gerek yok.
  const isDirty = useCallback(
    (branchId: number): boolean => {
      const row = data?.assignments.find((a) => a.branchId === branchId);
      const draft = drafts[branchId];
      if (!row || !draft) return false;
      return VISIBLE_ACTOR_KEYS.some((k) => {
        const original = row[k] ? String(row[k]) : "";
        return original !== draft[k];
      });
    },
    [data, drafts],
  );

  const setField = useCallback((branchId: number, key: VisibleActorKey, value: string) => {
    setDrafts((prev) => {
      const current = prev[branchId] ?? emptyDraft();
      return { ...prev, [branchId]: { ...current, [key]: value } };
    });
  }, []);

  const handleReset = useCallback(
    (branchId: number) => {
      const row = data?.assignments.find((a) => a.branchId === branchId);
      if (!row) return;
      setDrafts((prev) => ({ ...prev, [branchId]: rowToDraft(row) }));
    },
    [data],
  );

  const handleSave = useCallback(
    async (branchId: number) => {
      const draft = drafts[branchId];
      const row = data?.assignments.find((a) => a.branchId === branchId);
      if (!draft || !row) return;
      try {
        await save.mutateAsync({
          branchId,
          body: {
            // Hidden alanlar (Başlatıcı dinamiktir; Dispatcher/Completer ileride başka akışla):
            // mevcut DB değerlerini KORU, UI silmek anlamına gelmez.
            starterUserId: row.starterUserId,
            dispatcherUserId: row.dispatcherUserId,
            completerUserId: row.completerUserId,
            // Visible alanlar: draft'tan gelir.
            approverUserId: toNullableId(draft.approverUserId),
            warehouseUserId: toNullableId(draft.warehouseUserId),
            driverAssignerUserId: toNullableId(draft.driverAssignerUserId),
          },
        });
        notify.success(t("shipments.assignments.saved"));
      } catch (e) {
        notify.error(toErrorMessage(e));
      }
    },
    [data, drafts, save, t],
  );

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full min-w-0 app-page-max flex-1 flex-col gap-4 p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:gap-5 sm:p-4 md:p-6">
      {/* Header */}
      <div className="min-w-0">
        <Link
          href="/shipments"
          className="inline-flex min-h-11 items-center text-sm font-medium text-violet-700 hover:text-violet-800"
        >
          ← {t("shipments.assignments.back")}
        </Link>
        <div className="mt-1 flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 sm:h-11 sm:w-11"
            aria-hidden
          >
            <Truck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-zinc-900 sm:text-xl md:text-2xl">
              {t("shipments.assignments.pageTitle")}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
              {t("shipments.assignments.pageDescription")}
            </p>
          </div>
        </div>
      </div>

      {/* Search (şubelerde filtre) */}
      {data && data.assignments.length > 4 ? (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            type="search"
            className="pl-9"
            value={branchSearch}
            onChange={(e) => setBranchSearch(e.target.value)}
            placeholder={t("shipments.assignments.searchBranches")}
            aria-label={t("shipments.assignments.searchBranches")}
          />
        </div>
      ) : null}

      {/* States */}
      {isPending ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 to-white p-10 text-center text-sm text-zinc-500 shadow-inner">
          {t("common.loading")}
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50/40 p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-red-700">{t("shipments.assignments.loadError")}</p>
          <Button type="button" variant="secondary" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : data.assignments.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          {t("shipments.assignments.emptyAll")}
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {filteredAssignments.map((row) => (
            <BranchAssignmentCard
              key={row.branchId}
              row={row}
              draft={drafts[row.branchId] ?? rowToDraft(row)}
              dirty={isDirty(row.branchId)}
              isSaving={save.isPending && save.variables?.branchId === row.branchId}
              userOptions={userOptions}
              t={t}
              onChange={(key, value) => setField(row.branchId, key, value)}
              onReset={() => handleReset(row.branchId)}
              onSave={() => void handleSave(row.branchId)}
            />
          ))}

          {filteredAssignments.length === 0 && branchSearch.trim() ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              {t("shipments.assignments.searchNoMatch")}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

type BranchAssignmentCardProps = {
  row: ShipmentBranchAssignment;
  draft: DraftRow;
  dirty: boolean;
  isSaving: boolean;
  userOptions: RichComboboxOption[];
  t: (k: string) => string;
  onChange: (key: VisibleActorKey, value: string) => void;
  onReset: () => void;
  onSave: () => void;
};

function BranchAssignmentCard({
  row,
  draft,
  dirty,
  isSaving,
  userOptions,
  t,
  onChange,
  onReset,
  onSave,
}: BranchAssignmentCardProps) {
  const assignedCount = VISIBLE_ACTOR_KEYS.filter((k) => draft[k]).length;
  const totalVisible = VISIBLE_ACTOR_KEYS.length;
  const countLabel = t("shipments.assignments.assignedCount")
    .replace("{current}", String(assignedCount))
    .replace("{total}", String(totalVisible));

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white shadow-md shadow-zinc-900/[0.04] ring-1 ring-zinc-950/[0.03] transition-colors sm:rounded-3xl",
        dirty
          ? "border-amber-200/90"
          : "border-zinc-200/90",
      )}
    >
      {/* Card header — branch + status */}
      <header
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-t-2xl px-3 py-2.5 sm:rounded-t-3xl sm:gap-3 sm:px-5 sm:py-3",
          dirty
            ? "bg-amber-50/70"
            : "bg-gradient-to-r from-violet-50/70 via-white to-fuchsia-50/40",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
            {row.branchName}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 sm:text-[11px]">
            #{row.branchId}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {dirty ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80 sm:text-[11px]">
              {t("shipments.assignments.unsavedBadge")}
            </span>
          ) : assignedCount === totalVisible ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200/80 sm:text-[11px]">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              {t("shipments.assignments.fullyAssignedBadge")}
            </span>
          ) : null}
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium tabular-nums text-zinc-700 ring-1 ring-zinc-200 sm:text-[11px]">
            {countLabel}
          </span>
        </div>
      </header>

      {/* Body — actor grid (3 görünür alan) */}
      <div className="grid gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-3">
        {VISIBLE_ACTOR_KEYS.map((key) => (
          <div key={key} className="flex min-w-0 flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 sm:text-xs">
              {actorLabel(key, t)}
            </label>
            <RichCombobox
              value={draft[key]}
              onChange={(v) => onChange(key, v)}
              options={userOptions}
              placeholder={t("shipments.assignments.actorPlaceholder")}
              searchPlaceholder={t("shipments.assignments.actorSearchPlaceholder")}
              emptyText={t("shipments.assignments.actorEmpty")}
            />
            <p className="text-[10px] leading-snug text-zinc-500 sm:text-[11px]">
              {actorDescription(key, t)}
            </p>
          </div>
        ))}
      </div>

      {/* Footer — actions */}
      <footer className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3 sm:rounded-b-3xl">
        <Button
          type="button"
          variant="ghost"
          disabled={!dirty || isSaving}
          onClick={onReset}
          className="min-h-10 gap-1.5 px-3 text-sm"
          aria-label={t("shipments.assignments.resetAria").replace("{branch}", row.branchName)}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("shipments.assignments.resetButton")}</span>
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!dirty || isSaving}
          onClick={onSave}
          className="min-h-10 px-4 text-sm"
        >
          {isSaving
            ? t("shipments.assignments.saving")
            : dirty
              ? t("shipments.assignments.saveButton")
              : t("shipments.assignments.noChanges")}
        </Button>
      </footer>
    </article>
  );
}
