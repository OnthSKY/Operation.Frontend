"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Locale } from "@/i18n/messages";
import { fetchWarehouses } from "@/modules/warehouse/api/warehouses-api";
import {
  useUpdateWarehouse,
  warehouseKeys,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { normalizePositiveUserId } from "@/modules/personnel/lib/personnel-user-link";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { Personnel } from "@/types/personnel";
import type { WarehouseListItem } from "@/types/warehouse";
import type { SelectOption } from "@/shared/ui/Select";

export type PersonnelWarehouseAssignmentRoleKind =
  | "manager"
  | "master"
  | "both";

/**
 * Personel detayı "Roller" sekmesi için tüm depo atama state'i + derived
 * select option'ları + arama-bazlı mevcut roller listesi + atama mutation handler'ı.
 * Caller (modal) yalnızca personnel + tab-aktif-mi bilgisini verir.
 */
export function usePersonnelWarehouseAssignment({
  personnel,
  enabled,
  open,
  locale,
  t,
}: {
  personnel: Personnel | null;
  /** Roles tabı aktifse `true` — query'leri enable eder. */
  enabled: boolean;
  /** Modal açıksa `true` — warehouses query'sinin de bağlı olduğu üst koşul. */
  open: boolean;
  locale: Locale;
  t: (k: string) => string;
}) {
  const [rolesSearch, setRolesSearch] = useState("");
  const debouncedRolesSearch = useDebouncedValue(rolesSearch.trim(), 200);
  const [assignWarehouseId, setAssignWarehouseId] = useState("");
  const [assignRole, setAssignRole] =
    useState<PersonnelWarehouseAssignmentRoleKind>("manager");

  const { data: warehouses = [], isPending: whLoading } = useQuery({
    queryKey: warehouseKeys.list(),
    queryFn: fetchWarehouses,
    enabled: open && personnel != null && enabled,
  });

  const updateWhMut = useUpdateWarehouse();

  const warehouseAssignOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: t("personnel.detailRolesAssignWarehousePick") },
      ...[...warehouses]
        .sort((a, b) =>
          a.name.localeCompare(b.name, locale === "tr" ? "tr" : "en"),
        )
        .map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [warehouses, locale, t],
  );

  const roleAssignOptions = useMemo<SelectOption[]>(
    () => [
      {
        value: "manager",
        label: t("personnel.detailRolesAssignRoleManager"),
      },
      { value: "master", label: t("personnel.detailRolesAssignRoleMaster") },
      { value: "both", label: t("personnel.detailRolesAssignRoleBoth") },
    ],
    [t],
  );

  const warehouseRoles = useMemo<
    { warehouse: WarehouseListItem; tags: string[] }[]
  >(() => {
    const uid = normalizePositiveUserId(personnel?.userId);
    if (!uid) return [];
    const q = debouncedRolesSearch.toLowerCase();
    return warehouses
      .filter((w) => {
        const mgr = normalizePositiveUserId(w.responsibleManagerUserId);
        const mst = normalizePositiveUserId(w.responsibleMasterUserId);
        if (mgr !== uid && mst !== uid) return false;
        if (!q) return true;
        return w.name.toLowerCase().includes(q);
      })
      .map((w) => {
        const tags: string[] = [];
        if (normalizePositiveUserId(w.responsibleManagerUserId) === uid)
          tags.push("manager");
        if (normalizePositiveUserId(w.responsibleMasterUserId) === uid)
          tags.push("master");
        return { warehouse: w, tags };
      })
      .sort((a, b) =>
        a.warehouse.name.localeCompare(
          b.warehouse.name,
          locale === "tr" ? "tr" : "en",
        ),
      );
  }, [warehouses, personnel?.userId, debouncedRolesSearch, locale]);

  const runAssignWarehouse = useCallback(async () => {
    const uid = normalizePositiveUserId(personnel?.userId);
    if (!uid || !personnel) return;
    const wid = parseInt(assignWarehouseId, 10);
    if (!Number.isFinite(wid) || wid <= 0) {
      notify.error(t("personnel.detailRolesAssignNeedWarehouse"));
      return;
    }
    const w = warehouses.find((x) => x.id === wid);
    if (!w) {
      notify.error(t("personnel.detailRolesAssignNeedWarehouse"));
      return;
    }
    let mgr =
      w.responsibleManagerUserId != null && w.responsibleManagerUserId > 0
        ? w.responsibleManagerUserId
        : null;
    let mst =
      w.responsibleMasterUserId != null && w.responsibleMasterUserId > 0
        ? w.responsibleMasterUserId
        : null;
    if (assignRole === "manager" || assignRole === "both") mgr = uid;
    if (assignRole === "master" || assignRole === "both") mst = uid;
    try {
      await updateWhMut.mutateAsync({
        id: wid,
        input: {
          name: w.name.trim(),
          address: w.address?.trim() ? w.address.trim() : null,
          city: w.city?.trim() ? w.city.trim() : null,
          responsibleManagerUserId: mgr,
          responsibleMasterUserId: mst,
        },
      });
      notify.success(t("toast.warehouseUpdated"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [
    assignRole,
    assignWarehouseId,
    personnel,
    t,
    updateWhMut,
    warehouses,
  ]);

  /** Modal yeniden açıldığında state'leri sıfırla. */
  const reset = useCallback(() => {
    setRolesSearch("");
    setAssignWarehouseId("");
    setAssignRole("manager");
  }, []);

  return {
    rolesSearch,
    setRolesSearch,
    debouncedRolesSearch,
    assignWarehouseId,
    setAssignWarehouseId,
    assignRole,
    setAssignRole,
    warehouseAssignOptions,
    roleAssignOptions,
    warehouseRoles,
    whLoading,
    assignBusy: updateWhMut.isPending,
    runAssignWarehouse,
    reset,
  };
}
