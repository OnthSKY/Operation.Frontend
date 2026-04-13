"use client";

import { fetchBranches } from "@/modules/branch/api/branches-api";
import {
  BranchQuickActionsMenu,
  type QuickActionsMenuSection,
} from "@/modules/branch/components/BranchQuickActionsMenu";
import { fetchPersonnelList } from "@/modules/personnel/api/personnel-api";
import { vehiclePhotoUrl } from "@/modules/vehicles/api/vehicles-api";
import { VehicleDetailAuditTab } from "@/modules/vehicles/components/VehicleDetailAuditTab";
import {
  useCreateVehicle,
  useCreateVehicleExpense,
  useCreateVehicleInsurance,
  useCreateVehicleMaintenance,
  useDeleteVehicleExpense,
  useDeleteVehicleInsurance,
  useDeleteVehicleMaintenance,
  useDeleteVehiclePhoto,
  usePatchVehicleOdometer,
  useUpdateVehicle,
  useUpdateVehicleExpense,
  useUpdateVehicleInsurance,
  useUpdateVehicleMaintenance,
  usePatchVehicleAssignment,
  useUploadVehiclePhoto,
  useVehicle,
  useVehicleExpenseSummary,
  useVehicles,
} from "@/modules/vehicles/hooks/useVehicleQueries";
import { useAuth } from "@/lib/auth/AuthContext";
import { isDriverPortalRole, isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { StatusBadge } from "@/shared/components/StatusBadge";
import {
  vehicleHeaderStatusTone,
  vehicleListStatusTone,
  vehicleStatusLabel,
} from "@/modules/vehicles/lib/vehicle-status-display";
import {
  VEHICLE_MAINTENANCE_TYPE_IDS,
  isKnownVehicleMaintenanceType,
  labelVehicleMaintenanceType,
} from "@/modules/vehicles/lib/vehicle-maintenance-types";
import { TABLE_TOOLBAR_ICON_BTN, TableToolbarSplit } from "@/shared/components/TableToolbar";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { notifyDefaults } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { detailOpenIconButtonClass, EyeIcon, PencilIcon, PlusIcon } from "@/shared/ui/EyeIcon";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { Tooltip } from "@/shared/ui/Tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import type {
  VehicleExpense,
  VehicleInsurance,
  VehicleInsuranceBadge,
  VehicleListItem,
  VehicleMaintenance,
} from "@/types/vehicle";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "react-toastify";

type DetailTab = "overview" | "service" | "assignments" | "insurances" | "costs" | "audit";
type CostsSubTab = "ledger" | "report";
type AssignMode = "idle" | "personnel" | "branch";

function vehicleExpenseBranchPostingDetail(x: VehicleExpense, t: (key: string) => string): string | null {
  if (x.postedBranchId == null || x.postedBranchId <= 0) return null;
  const src = (x.postedExpensePaymentSource ?? "REGISTER").toUpperCase();
  if (src === "PATRON") {
    const card = x.postedRegisterCardAmount ?? 0;
    const cash = x.postedRegisterCashAmount ?? 0;
    const method = card > 0 && cash <= 0 ? t("vehicles.expensePayCard") : t("vehicles.expensePayCash");
    return `${t("vehicles.expensePaidByPatron")} · ${method}`;
  }
  return t("vehicles.expensePaidFromRegisterDrawer");
}

function buildVehicleRowMenuSections(params: {
  canEdit: boolean;
  t: (key: string) => string;
  onView: () => void;
  onEdit: () => void;
  onAddMaintenance: () => void;
  onEditKm: () => void;
  onChangeAssignment?: () => void;
  onAddExpense?: () => void;
  onAddInsurance?: () => void;
  /** `extras`: only maintenance + km (view/edit as separate buttons on narrow layouts). */
  menuMode?: "full" | "extras";
}): QuickActionsMenuSection[] {
  const {
    canEdit,
    t,
    onView,
    onEdit,
    onAddMaintenance,
    onEditKm,
    onChangeAssignment,
    onAddExpense,
    onAddInsurance,
    menuMode = "full",
  } = params;
  const items: QuickActionsMenuSection["items"] = [];
  if (menuMode === "full") {
    items.push({ id: "view", label: t("common.openDetails"), onSelect: onView });
    if (canEdit) {
      items.push(
        { id: "edit", label: t("common.edit"), onSelect: onEdit },
        { id: "maint", label: t("vehicles.rowAddMaintenance"), onSelect: onAddMaintenance },
        { id: "km", label: t("vehicles.rowEditOdometer"), onSelect: onEditKm }
      );
    }
  } else if (canEdit) {
    if (onChangeAssignment) {
      items.push({
        id: "assign",
        label: t("vehicles.changeAssignment"),
        onSelect: onChangeAssignment,
      });
    }
    if (onAddExpense) {
      items.push({ id: "expense", label: t("vehicles.addExpense"), onSelect: onAddExpense });
    }
    if (onAddInsurance) {
      items.push({ id: "insurance", label: t("vehicles.addInsurance"), onSelect: onAddInsurance });
    }
    items.push(
      { id: "maint", label: t("vehicles.rowAddMaintenance"), onSelect: onAddMaintenance },
      { id: "km", label: t("vehicles.rowEditOdometer"), onSelect: onEditKm }
    );
  }
  if (items.length === 0) return [];
  const storyTitle =
    menuMode === "extras" ? t("vehicles.rowMenuExtras") : t("vehicles.rowMenuStory");
  return [{ storyTitle, items }];
}

function badgeClasses(b: VehicleInsuranceBadge) {
  switch (b) {
    case "EXPIRED":
      return "bg-red-50 text-red-800 ring-red-200";
    case "SOON":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "OK":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200";
    default:
      return "bg-zinc-100 text-zinc-600 ring-zinc-200";
  }
}

function VehicleOverviewRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100/90 py-2.5 last:border-b-0 sm:py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 shrink-0 text-zinc-400 [&_svg]:h-4 [&_svg]:w-4" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      </div>
      <div className="max-w-[min(100%,18rem)] text-right text-sm font-semibold leading-snug text-zinc-900 sm:max-w-[60%]">
        {value}
      </div>
    </div>
  );
}

export function VehiclesScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const canEdit =
    !isPersonnelPortalRole(user?.role) && !isDriverPortalRole(user?.role);

  const { data: rows = [], isPending, isError, error } = useVehicles();

  useEffect(() => {
    if (!isError || error == null) {
      toast.dismiss("vehicles-list-load");
      return;
    }
    toast.error(toErrorMessage(error), { ...notifyDefaults, toastId: "vehicles-list-load" });
  }, [isError, error]);

  const createV = useCreateVehicle();
  const updateV = useUpdateVehicle();
  const patchOdometerMut = usePatchVehicleOdometer();
  const patchAssignmentMut = usePatchVehicleAssignment();
  const uploadVehiclePhotoMut = useUploadVehiclePhoto();
  const deleteVehiclePhotoMut = useDeleteVehiclePhoto();

  const { data: personnelRows = [] } = useQuery({
    queryKey: ["vehicles", "personnel-options"],
    queryFn: fetchPersonnelList,
    enabled: canEdit,
  });
  const { data: branchRows = [] } = useQuery({
    queryKey: ["vehicles", "branch-options"],
    queryFn: fetchBranches,
    enabled: canEdit,
  });

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const personnel = (r.assignedPersonnelName ?? "").toLowerCase();
      const branch = (r.assignedBranchName ?? "").toLowerCase();
      const status = (r.status ?? "").toLowerCase();
      return (
        r.plateNumber.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        (r.year != null && String(r.year).includes(q)) ||
        personnel.includes(q) ||
        branch.includes(q) ||
        status.includes(q)
      );
    });
  }, [rows, search]);

  const [vehicleModal, setVehicleModal] = useState<"add" | "edit" | null>(null);
  const [editRow, setEditRow] = useState<VehicleListItem | null>(null);
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [assignMode, setAssignMode] = useState<AssignMode>("idle");
  const [personnelId, setPersonnelId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [odometerKmStr, setOdometerKmStr] = useState("");
  const [inspectionUntil, setInspectionUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [driverSrc, setDriverSrc] = useState("");
  const [driverPsy, setDriverPsy] = useState("");
  const [serviceIntervalKmStr, setServiceIntervalKmStr] = useState("");
  const [serviceIntervalMonthsStr, setServiceIntervalMonthsStr] = useState("");
  const [photoCacheBust, setPhotoCacheBust] = useState(0);
  const syncedVehicleFormDetail = useRef<number | null>(null);

  const editingFormVehicleId = vehicleModal === "edit" && editRow ? editRow.id : null;
  const { data: editFormDetail, isPending: editFormDetailPending } = useVehicle(
    editingFormVehicleId,
    editingFormVehicleId != null
  );

  useEffect(() => {
    if (vehicleModal !== "edit" || !editRow || !editFormDetail) return;
    if (editFormDetail.id !== editRow.id) return;
    if (syncedVehicleFormDetail.current === editRow.id) return;
    syncedVehicleFormDetail.current = editRow.id;
    setOdometerKmStr(editFormDetail.odometerKm != null ? String(editFormDetail.odometerKm) : "");
    setInspectionUntil(editFormDetail.inspectionValidUntil ?? "");
    setNotes(editFormDetail.notes ?? "");
    setDriverSrc(editFormDetail.driverSrcValidUntil ?? "");
    setDriverPsy(editFormDetail.driverPsychotechnicalValidUntil ?? "");
    setServiceIntervalKmStr(
      editFormDetail.serviceIntervalKm != null ? String(editFormDetail.serviceIntervalKm) : ""
    );
    setServiceIntervalMonthsStr(
      editFormDetail.serviceIntervalMonths != null ? String(editFormDetail.serviceIntervalMonths) : ""
    );
  }, [vehicleModal, editRow, editFormDetail]);

  const openAdd = () => {
    setEditRow(null);
    setPlate("");
    setBrand("");
    setModel("");
    setYear("");
    setStatus("ACTIVE");
    setAssignMode("idle");
    setPersonnelId("");
    setBranchId("");
    setOdometerKmStr("");
    setInspectionUntil("");
    setNotes("");
    setDriverSrc("");
    setDriverPsy("");
    setServiceIntervalKmStr("");
    setServiceIntervalMonthsStr("");
    syncedVehicleFormDetail.current = null;
    setVehicleModal("add");
  };

  const openEdit = (r: VehicleListItem) => {
    setEditRow(r);
    setPlate(r.plateNumber);
    setBrand(r.brand);
    setModel(r.model);
    setYear(r.year != null ? String(r.year) : "");
    setStatus(r.status);
    if (r.assignedPersonnelId) {
      setAssignMode("personnel");
      setPersonnelId(String(r.assignedPersonnelId));
      setBranchId("");
    } else if (r.assignedBranchId) {
      setAssignMode("branch");
      setBranchId(String(r.assignedBranchId));
      setPersonnelId("");
    } else {
      setAssignMode("idle");
      setPersonnelId("");
      setBranchId("");
    }
    setOdometerKmStr("");
    setInspectionUntil("");
    setNotes("");
    setDriverSrc("");
    setDriverPsy("");
    setServiceIntervalKmStr("");
    setServiceIntervalMonthsStr("");
    syncedVehicleFormDetail.current = null;
    setVehicleModal("edit");
  };

  const openAssignmentDialogFromDetail = () => {
    if (!detail || !canEdit) return;
    setAssignDlgVehicleId(detail.id);
    if (detail.assignedPersonnelId) {
      setAssignDlgMode("personnel");
      setAssignDlgPersonnelId(String(detail.assignedPersonnelId));
      setAssignDlgBranchId("");
    } else if (detail.assignedBranchId) {
      setAssignDlgMode("branch");
      setAssignDlgBranchId(String(detail.assignedBranchId));
      setAssignDlgPersonnelId("");
    } else {
      setAssignDlgMode("idle");
      setAssignDlgPersonnelId("");
      setAssignDlgBranchId("");
    }
    setAssignDlgOpen(true);
  };

  const openAssignmentFromListRow = (r: VehicleListItem) => {
    if (!canEdit) return;
    setAssignDlgVehicleId(r.id);
    if (r.assignedPersonnelId) {
      setAssignDlgMode("personnel");
      setAssignDlgPersonnelId(String(r.assignedPersonnelId));
      setAssignDlgBranchId("");
    } else if (r.assignedBranchId) {
      setAssignDlgMode("branch");
      setAssignDlgBranchId(String(r.assignedBranchId));
      setAssignDlgPersonnelId("");
    } else {
      setAssignDlgMode("idle");
      setAssignDlgPersonnelId("");
      setAssignDlgBranchId("");
    }
    setAssignDlgOpen(true);
  };

  const saveAssignmentDialog = async () => {
    if (assignDlgVehicleId == null) return;
    let assignedPersonnelId: number | null = null;
    let assignedBranchId: number | null = null;
    if (assignDlgMode === "personnel") {
      const raw = assignDlgPersonnelId.trim();
      if (!raw) {
        toast.error(t("vehicles.assignmentIncomplete"), { ...notifyDefaults });
        return;
      }
      const id = parseInt(raw, 10);
      if (!Number.isFinite(id)) {
        toast.error(t("common.invalid"), { ...notifyDefaults });
        return;
      }
      assignedPersonnelId = id;
    } else if (assignDlgMode === "branch") {
      const raw = assignDlgBranchId.trim();
      if (!raw) {
        toast.error(t("vehicles.assignmentIncomplete"), { ...notifyDefaults });
        return;
      }
      const id = parseInt(raw, 10);
      if (!Number.isFinite(id)) {
        toast.error(t("common.invalid"), { ...notifyDefaults });
        return;
      }
      assignedBranchId = id;
    }
    try {
      await patchAssignmentMut.mutateAsync({
        vehicleId: assignDlgVehicleId,
        assignedPersonnelId,
        assignedBranchId,
      });
      toast.success(t("common.saved"), { ...notifyDefaults });
      setAssignDlgOpen(false);
      setAssignDlgVehicleId(null);
    } catch (e) {
      toast.error(toErrorMessage(e), { ...notifyDefaults });
    }
  };

  const saveVehicle = async () => {
    const y = year.trim() ? parseInt(year, 10) : null;
    const ap =
      assignMode === "personnel" && personnelId.trim()
        ? parseInt(personnelId, 10)
        : null;
    const ab =
      assignMode === "branch" && branchId.trim() ? parseInt(branchId, 10) : null;
    const odomRaw = odometerKmStr.trim();
    const odomParsed = odomRaw ? parseInt(odomRaw, 10) : null;
    const odometerKm =
      odomParsed != null && Number.isFinite(odomParsed) && odomParsed >= 0 ? odomParsed : null;
    const inspectionIso = inspectionUntil.trim() || null;
    const notesTrim = notes.trim() || null;
    const srcIso = ap != null && driverSrc.trim() ? driverSrc.trim() : null;
    const psyIso = ap != null && driverPsy.trim() ? driverPsy.trim() : null;
    const siKmRaw = serviceIntervalKmStr.trim();
    const siKmParsed = siKmRaw ? parseInt(siKmRaw, 10) : null;
    const serviceIntervalKm =
      siKmParsed != null && Number.isFinite(siKmParsed) && siKmParsed > 0 ? siKmParsed : null;
    const siMoRaw = serviceIntervalMonthsStr.trim();
    const siMoParsed = siMoRaw ? parseInt(siMoRaw, 10) : null;
    const serviceIntervalMonths =
      siMoParsed != null && Number.isFinite(siMoParsed) && siMoParsed > 0 ? siMoParsed : null;
    try {
      if (vehicleModal === "add") {
        await createV.mutateAsync({
          plateNumber: plate.trim(),
          brand: brand.trim(),
          model: model.trim(),
          year: y != null && Number.isFinite(y) ? y : null,
          status,
          assignedPersonnelId: ap,
          assignedBranchId: ab,
          odometerKm,
          inspectionValidUntil: inspectionIso,
          notes: notesTrim,
          driverSrcValidUntil: srcIso,
          driverPsychotechnicalValidUntil: psyIso,
          serviceIntervalKm,
          serviceIntervalMonths,
        });
        toast.success(t("common.saved"), { ...notifyDefaults });
      } else if (editRow) {
        await updateV.mutateAsync({
          id: editRow.id,
          plateNumber: plate.trim(),
          brand: brand.trim(),
          model: model.trim(),
          year: y != null && Number.isFinite(y) ? y : null,
          status,
          assignedPersonnelId: ap,
          assignedBranchId: ab,
          odometerKm,
          inspectionValidUntil: inspectionIso,
          notes: notesTrim,
          driverSrcValidUntil: srcIso,
          driverPsychotechnicalValidUntil: psyIso,
          serviceIntervalKm,
          serviceIntervalMonths,
        });
        toast.success(t("common.saved"), { ...notifyDefaults });
      }
      setVehicleModal(null);
    } catch (e) {
      toast.error(toErrorMessage(e), { ...notifyDefaults });
    }
  };

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [costsSubTab, setCostsSubTab] = useState<CostsSubTab>("ledger");
  const searchParams = useSearchParams();

  const goDetailTab = (tab: DetailTab) => {
    setDetailTab(tab);
    if (tab !== "costs") setCostsSubTab("ledger");
  };

  useEffect(() => {
    if (!canEdit && detailTab === "audit") setDetailTab("overview");
  }, [canEdit, detailTab]);

  useEffect(() => {
    const raw = searchParams.get("openVehicle");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    if (!rows.some((r) => r.id === id)) return;
    setDetailId(id);
    setDetailTab("overview");
  }, [searchParams, rows]);

  useEffect(() => {
    setMaintLogFilterType("");
  }, [detailId]);

  const detailEnabled = detailId != null && detailId > 0;
  const { data: detail, isPending: detailPending } = useVehicle(detailId, detailEnabled);

  const [maintLogFilterType, setMaintLogFilterType] = useState("");

  const filteredVehicleMaintenances = useMemo(() => {
    const m = detail?.maintenances ?? [];
    if (!maintLogFilterType.trim()) return m;
    return m.filter((x) => x.maintenanceType === maintLogFilterType);
  }, [detail?.maintenances, maintLogFilterType]);

  const maintenanceLogFilterSelectOptions = useMemo(() => {
    const known = VEHICLE_MAINTENANCE_TYPE_IDS.map((id) => ({
      value: id,
      label: t(`vehicles.maintenanceTypes.${id}`),
    }));
    const seen = new Set<string>([...VEHICLE_MAINTENANCE_TYPE_IDS]);
    const legacy: { value: string; label: string }[] = [];
    for (const x of detail?.maintenances ?? []) {
      const v = x.maintenanceType?.trim();
      if (v && !seen.has(v)) {
        seen.add(v);
        legacy.push({ value: v, label: v });
      }
    }
    legacy.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return [
      { value: "", label: t("vehicles.maintenanceFilterAll") },
      ...known,
      ...legacy,
    ];
  }, [detail?.maintenances, t]);

  const [sumYear, setSumYear] = useState(String(new Date().getFullYear()));
  const [sumMonth, setSumMonth] = useState("");
  const [sumVehicleId, setSumVehicleId] = useState("");
  const [sumBranchId, setSumBranchId] = useState("");
  const [expenseReportParams, setExpenseReportParams] = useState<{
    year?: number;
    month?: number;
    vehicleId?: number;
    branchId?: number;
  } | null>(null);

  const applyExpenseReportFilters = useCallback(() => {
    const y = sumYear.trim() ? parseInt(sumYear, 10) : undefined;
    const m = sumMonth.trim() ? parseInt(sumMonth, 10) : undefined;
    const vid = sumVehicleId.trim() ? parseInt(sumVehicleId, 10) : undefined;
    const bid = sumBranchId.trim() ? parseInt(sumBranchId, 10) : undefined;
    setExpenseReportParams({
      year: y != null && Number.isFinite(y) ? y : undefined,
      month: m != null && Number.isFinite(m) && m >= 1 && m <= 12 ? m : undefined,
      vehicleId: vid != null && Number.isFinite(vid) ? vid : undefined,
      branchId: bid != null && Number.isFinite(bid) ? bid : undefined,
    });
  }, [sumYear, sumMonth, sumVehicleId, sumBranchId]);

  useEffect(() => {
    if (detailTab !== "costs" || detailId == null) {
      setExpenseReportParams(null);
      return;
    }
    if (costsSubTab !== "report") {
      setExpenseReportParams(null);
      return;
    }
    const y = new Date().getFullYear();
    setSumYear(String(y));
    setSumMonth("");
    setSumVehicleId(String(detailId));
    setSumBranchId("");
    setExpenseReportParams({
      year: y,
      month: undefined,
      vehicleId: detailId,
      branchId: undefined,
    });
  }, [detailTab, costsSubTab, detailId]);

  const summaryQueryEnabled =
    canEdit &&
    detailTab === "costs" &&
    costsSubTab === "report" &&
    detailId != null &&
    expenseReportParams != null;
  const { data: summaryRows = [], isPending: summaryPending } = useVehicleExpenseSummary(
    expenseReportParams ?? {},
    summaryQueryEnabled
  );

  const insCreate = useCreateVehicleInsurance();
  const insUpdate = useUpdateVehicleInsurance();
  const insDel = useDeleteVehicleInsurance();
  const expCreate = useCreateVehicleExpense();
  const expUpdate = useUpdateVehicleExpense();
  const expDel = useDeleteVehicleExpense();
  const maintCreate = useCreateVehicleMaintenance();
  const maintUpdate = useUpdateVehicleMaintenance();
  const maintDel = useDeleteVehicleMaintenance();

  const [insModal, setInsModal] = useState<"add" | "edit" | null>(null);
  const [insEditId, setInsEditId] = useState<number | null>(null);
  const [insType, setInsType] = useState("");
  const [insProvider, setInsProvider] = useState("");
  const [insPolicy, setInsPolicy] = useState("");
  const [insStart, setInsStart] = useState("");
  const [insEnd, setInsEnd] = useState("");
  const [insAmount, setInsAmount] = useState("");

  const [expModal, setExpModal] = useState<"add" | "edit" | null>(null);
  const [expEditId, setExpEditId] = useState<number | null>(null);
  const [expType, setExpType] = useState("fuel");
  const [expAmount, setExpAmount] = useState("");
  const [expCur, setExpCur] = useState("TRY");
  const [expDate, setExpDate] = useState(localIsoDate());
  const [expDesc, setExpDesc] = useState("");
  const [expBranchId, setExpBranchId] = useState("");
  const [expBranchPaySource, setExpBranchPaySource] = useState<"REGISTER" | "PATRON">("REGISTER");
  const [expPatronPay, setExpPatronPay] = useState<"CASH" | "CARD">("CASH");
  const [expModalVehicleId, setExpModalVehicleId] = useState<number | null>(null);
  const [insModalVehicleId, setInsModalVehicleId] = useState<number | null>(null);

  const [maintModal, setMaintModal] = useState<"add" | "edit" | null>(null);
  const [maintVehicleId, setMaintVehicleId] = useState<number | null>(null);
  const [maintEditId, setMaintEditId] = useState<number | null>(null);
  const [maintServiceDate, setMaintServiceDate] = useState("");
  const [maintOdometerStr, setMaintOdometerStr] = useState("");
  const [maintType, setMaintType] = useState("");
  const [maintWorkshop, setMaintWorkshop] = useState("");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState("");
  const [maintCur, setMaintCur] = useState("TRY");
  const [maintNextDate, setMaintNextDate] = useState("");
  const [maintNextKmStr, setMaintNextKmStr] = useState("");

  const [kmModalVehicleId, setKmModalVehicleId] = useState<number | null>(null);
  const [kmModalStr, setKmModalStr] = useState("");

  const [assignDlgOpen, setAssignDlgOpen] = useState(false);
  const [assignDlgVehicleId, setAssignDlgVehicleId] = useState<number | null>(null);
  const [assignDlgMode, setAssignDlgMode] = useState<AssignMode>("idle");
  const [assignDlgPersonnelId, setAssignDlgPersonnelId] = useState("");
  const [assignDlgBranchId, setAssignDlgBranchId] = useState("");

  const maintenanceTypeFormSelectOptions = useMemo(() => {
    const base = VEHICLE_MAINTENANCE_TYPE_IDS.map((id) => ({
      value: id,
      label: t(`vehicles.maintenanceTypes.${id}`),
    }));
    const cur = maintType.trim();
    if (cur && !isKnownVehicleMaintenanceType(cur)) {
      return [{ value: cur, label: cur }, ...base];
    }
    return base;
  }, [maintType, t]);

  const kmModalEnabled = kmModalVehicleId != null && kmModalVehicleId > 0;
  const { data: kmModalVehicle } = useVehicle(kmModalVehicleId, kmModalEnabled);

  useEffect(() => {
    if (!kmModalEnabled || !kmModalVehicle) return;
    setKmModalStr(kmModalVehicle.odometerKm != null ? String(kmModalVehicle.odometerKm) : "");
  }, [kmModalEnabled, kmModalVehicle, kmModalVehicleId]);

  const openKmModal = (vehicleId: number) => {
    setKmModalVehicleId(vehicleId);
    setKmModalStr("");
  };

  const saveKmModal = async () => {
    if (kmModalVehicleId == null) return;
    const raw = kmModalStr.trim();
    const parsed = raw ? parseInt(raw, 10) : null;
    const odometerKm =
      parsed != null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    if (raw !== "" && odometerKm == null) {
      toast.error(t("common.invalid"), { ...notifyDefaults });
      return;
    }
    try {
      await patchOdometerMut.mutateAsync({
        vehicleId: kmModalVehicleId,
        odometerKm: raw === "" ? null : odometerKm,
      });
      toast.success(t("common.saved"), { ...notifyDefaults });
      setKmModalVehicleId(null);
    } catch (e) {
      toast.error(toErrorMessage(e), { ...notifyDefaults });
    }
  };

  const openAddMaintenanceForVehicle = (vehicleId: number) => {
    setMaintVehicleId(vehicleId);
    setMaintEditId(null);
    setMaintServiceDate(localIsoDate());
    setMaintOdometerStr("");
    setMaintType(VEHICLE_MAINTENANCE_TYPE_IDS[0]);
    setMaintWorkshop("");
    setMaintDesc("");
    setMaintCost("");
    setMaintCur("TRY");
    setMaintNextDate("");
    setMaintNextKmStr("");
    setMaintModal("add");
  };

  const openEditMaintenance = (vehicleId: number, x: VehicleMaintenance) => {
    setMaintVehicleId(vehicleId);
    setMaintEditId(x.id);
    setMaintServiceDate(x.serviceDate.slice(0, 10));
    setMaintOdometerStr(x.odometerKm != null ? String(x.odometerKm) : "");
    setMaintType(x.maintenanceType);
    setMaintWorkshop(x.workshop ?? "");
    setMaintDesc(x.description ?? "");
    setMaintCost(x.cost != null ? String(x.cost) : "");
    setMaintCur(x.currencyCode);
    setMaintNextDate(x.nextDueDate?.slice(0, 10) ?? "");
    setMaintNextKmStr(x.nextDueKm != null ? String(x.nextDueKm) : "");
    setMaintModal("edit");
  };

  const saveMaintenance = async () => {
    if (maintVehicleId == null) return;
    const sd = maintServiceDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sd) || !maintType.trim()) {
      toast.error(t("vehicles.maintenanceFillRequired"), { ...notifyDefaults });
      return;
    }
    const curNorm = (maintCur.trim() || "TRY").toUpperCase();
    if (curNorm.length !== 3) {
      toast.error(t("vehicles.maintenanceFillRequired"), { ...notifyDefaults });
      return;
    }
    const odomRaw = maintOdometerStr.trim();
    const odomParsed = odomRaw ? parseInt(odomRaw, 10) : NaN;
    const odometerKm =
      Number.isFinite(odomParsed) && odomParsed >= 0 ? odomParsed : null;
    if (odometerKm == null) {
      toast.error(t("vehicles.maintenanceCostOdometerRequired"), { ...notifyDefaults });
      return;
    }
    const nextKmRaw = maintNextKmStr.trim();
    const nextKmParsed = nextKmRaw ? parseInt(nextKmRaw, 10) : null;
    const nextDueKm =
      nextKmParsed != null && Number.isFinite(nextKmParsed) && nextKmParsed >= 0
        ? nextKmParsed
        : null;
    const costRaw = maintCost.trim();
    const costParsed = costRaw ? parseFloat(costRaw.replace(",", ".")) : NaN;
    const cost = Number.isFinite(costParsed) && costParsed >= 0 ? costParsed : null;
    if (cost == null) {
      toast.error(t("vehicles.maintenanceCostOdometerRequired"), { ...notifyDefaults });
      return;
    }
    const nextDateIso = maintNextDate.trim() || null;
    try {
      if (maintModal === "add") {
        await maintCreate.mutateAsync({
          vehicleId: maintVehicleId,
          serviceDate: sd,
          odometerKm,
          maintenanceType: maintType.trim(),
          workshop: maintWorkshop.trim() || null,
          description: maintDesc.trim() || null,
          cost,
          currencyCode: curNorm,
          nextDueDate: nextDateIso,
          nextDueKm: nextKmRaw === "" ? null : nextDueKm,
        });
      } else if (maintEditId != null) {
        await maintUpdate.mutateAsync({
          vehicleId: maintVehicleId,
          maintenanceId: maintEditId,
          serviceDate: sd,
          odometerKm,
          maintenanceType: maintType.trim(),
          workshop: maintWorkshop.trim() || null,
          description: maintDesc.trim() || null,
          cost,
          currencyCode: curNorm,
          nextDueDate: nextDateIso,
          nextDueKm: nextKmRaw === "" ? null : nextDueKm,
        });
      }
      toast.success(t("common.saved"), { ...notifyDefaults });
      setMaintModal(null);
      setMaintVehicleId(null);
    } catch (e) {
      toast.error(toErrorMessage(e), { ...notifyDefaults });
    }
  };

  const openAddInsuranceForVehicle = (vehicleId: number) => {
    setInsModalVehicleId(vehicleId);
    setInsEditId(null);
    setInsType("");
    setInsProvider("");
    setInsPolicy("");
    setInsStart(localIsoDate());
    setInsEnd(localIsoDate());
    setInsAmount("");
    setInsModal("add");
  };

  const openAddInsurance = () => {
    if (!detailId) return;
    openAddInsuranceForVehicle(detailId);
  };

  const openEditInsurance = (x: VehicleInsurance) => {
    if (detailId) setInsModalVehicleId(detailId);
    setInsEditId(x.id);
    setInsType(x.insuranceType);
    setInsProvider(x.provider ?? "");
    setInsPolicy(x.policyNumber ?? "");
    setInsStart(x.startDate.slice(0, 10));
    setInsEnd(x.endDate.slice(0, 10));
    setInsAmount(x.amount != null ? String(x.amount) : "");
    setInsModal("edit");
  };

  const saveInsurance = async () => {
    const vid = insModalVehicleId ?? detailId;
    if (!vid) return;
    const amt = insAmount.trim() ? parseFloat(insAmount.replace(",", ".")) : null;
    try {
      if (insModal === "add") {
        await insCreate.mutateAsync({
          vehicleId: vid,
          insuranceType: insType.trim(),
          provider: insProvider.trim() || null,
          policyNumber: insPolicy.trim() || null,
          startDate: insStart,
          endDate: insEnd,
          amount: amt != null && Number.isFinite(amt) ? amt : null,
        });
      } else if (insEditId) {
        await insUpdate.mutateAsync({
          vehicleId: vid,
          insuranceId: insEditId,
          insuranceType: insType.trim(),
          provider: insProvider.trim() || null,
          policyNumber: insPolicy.trim() || null,
          startDate: insStart,
          endDate: insEnd,
          amount: amt != null && Number.isFinite(amt) ? amt : null,
        });
      }
      toast.success(t("common.saved"), { ...notifyDefaults });
      setInsModal(null);
      setInsModalVehicleId(null);
    } catch (e) {
      toast.error(toErrorMessage(e), { ...notifyDefaults });
    }
  };

  const openAddMaintenanceFromDetail = () => {
    if (!detailId) return;
    openAddMaintenanceForVehicle(detailId);
  };

  const openAddExpenseForVehicle = (vehicleId: number) => {
    setExpModalVehicleId(vehicleId);
    setExpEditId(null);
    setExpType("fuel");
    setExpAmount("");
    setExpCur("TRY");
    setExpDate(localIsoDate());
    setExpDesc("");
    setExpBranchId("");
    setExpBranchPaySource("REGISTER");
    setExpPatronPay("CASH");
    setExpModal("add");
  };

  const openAddExpense = () => {
    if (!detailId) return;
    openAddExpenseForVehicle(detailId);
  };

  const openEditExpense = (x: VehicleExpense) => {
    if (detailId) setExpModalVehicleId(detailId);
    setExpEditId(x.id);
    setExpType(x.expenseType);
    setExpAmount(String(x.amount));
    setExpCur(x.currencyCode);
    setExpDate(x.expenseDate.slice(0, 10));
    setExpDesc(x.description ?? "");
    setExpBranchId(
      x.postedBranchId != null && x.postedBranchId > 0 ? String(x.postedBranchId) : ""
    );
    const src = (x.postedExpensePaymentSource ?? "REGISTER").toUpperCase();
    setExpBranchPaySource(src === "PATRON" ? "PATRON" : "REGISTER");
    const card = x.postedRegisterCardAmount ?? 0;
    const cash = x.postedRegisterCashAmount ?? 0;
    setExpPatronPay(card > 0 && cash <= 0 ? "CARD" : "CASH");
    setExpModal("edit");
  };

  const saveExpense = async () => {
    const vid = expModalVehicleId ?? detailId;
    if (!vid) return;
    const amt = parseFloat(expAmount.replace(",", "."));
    if (!Number.isFinite(amt)) {
      toast.error(t("common.invalid"), { ...notifyDefaults });
      return;
    }
    const brRaw = expBranchId.trim();
    const branchIdParsed = brRaw ? parseInt(brRaw, 10) : null;
    const branchId =
      branchIdParsed != null && Number.isFinite(branchIdParsed) && branchIdParsed > 0
        ? branchIdParsed
        : null;
    const branchExpensePaymentSource = branchId != null ? expBranchPaySource : undefined;
    const patronPaymentMethod =
      branchId != null && expBranchPaySource === "PATRON" ? expPatronPay : undefined;
    try {
      if (expModal === "add") {
        await expCreate.mutateAsync({
          vehicleId: vid,
          expenseType: expType.trim(),
          amount: amt,
          currencyCode: expCur.trim() || "TRY",
          expenseDate: expDate,
          description: expDesc.trim() || null,
          branchId,
          branchExpensePaymentSource,
          patronPaymentMethod,
        });
      } else if (expEditId) {
        await expUpdate.mutateAsync({
          vehicleId: vid,
          expenseId: expEditId,
          expenseType: expType.trim(),
          amount: amt,
          currencyCode: expCur.trim() || "TRY",
          expenseDate: expDate,
          description: expDesc.trim() || null,
          branchId,
          branchExpensePaymentSource,
          patronPaymentMethod,
        });
      }
      toast.success(t("common.saved"), { ...notifyDefaults });
      setExpModal(null);
      setExpModalVehicleId(null);
    } catch (e) {
      toast.error(toErrorMessage(e), { ...notifyDefaults });
    }
  };

  const insuranceBadgeLabel = (b: VehicleInsuranceBadge) => {
    switch (b) {
      case "OK":
        return t("vehicles.badgeOk");
      case "SOON":
        return t("vehicles.badgeSoon");
      case "EXPIRED":
        return t("vehicles.badgeExpired");
      default:
        return t("vehicles.badgeNone");
    }
  };

  const detailTabItems: { id: DetailTab; label: string }[] = useMemo(() => {
    const base: { id: DetailTab; label: string }[] = [
      { id: "overview", label: t("vehicles.tabOverview") },
      { id: "service", label: t("vehicles.tabService") },
      { id: "assignments", label: t("vehicles.tabAssignments") },
      { id: "insurances", label: t("vehicles.tabInsurances") },
      { id: "costs", label: t("vehicles.tabCosts") },
    ];
    if (canEdit) base.push({ id: "audit", label: t("vehicles.tabAudit") });
    return base;
  }, [t, canEdit]);

  return (
    <>
      <PageScreenScaffold
        className="min-w-0 w-full px-2 py-3 pb-24 sm:px-3 sm:py-4 sm:pb-10 md:px-4 md:py-6"
        intro={
          <>
            <div className="min-w-0">
              <h1 className="text-pretty text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
                {t("vehicles.title")}
              </h1>
              <p className="mt-1 text-pretty text-sm text-zinc-500">{t("vehicles.subtitle")}</p>
            </div>

            <PageWhenToUseGuide
              guideTab="vehicles"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.vehicles.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.vehicles.step1") },
                { text: t("pageHelp.vehicles.step2") },
                { text: t("pageHelp.vehicles.step3") },
              ]}
            />
          </>
        }
        main={
          <Card className="min-w-0 p-3 sm:p-4" title={t("common.pageSectionMain")}>
            <TableToolbarSplit
              className="mb-1 sm:mb-2"
              lead={
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("vehicles.listFilterPlaceholder")}
                  className="w-full text-base sm:text-sm"
                  name="vehicles-list-search"
                  autoComplete="off"
                  aria-label={t("vehicles.listFilterPlaceholder")}
                />
              }
              trailing={
                canEdit ? (
                  <Tooltip content={t("vehicles.addVehicle")} delayMs={200}>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={openAdd}
                      className={TABLE_TOOLBAR_ICON_BTN}
                      aria-label={t("vehicles.addVehicle")}
                    >
                      <PlusIcon />
                    </Button>
                  </Tooltip>
                ) : null
              }
            />
        {isError ? (
          <p className="mt-3 text-sm text-zinc-600">{t("toast.loadFailed")}</p>
        ) : isPending ? (
          <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : (
          <>
            <ul className="mt-4 flex flex-col gap-3 lg:hidden">
              {filtered.map((r) => {
                const extrasSections = buildVehicleRowMenuSections({
                  canEdit,
                  t,
                  onView: () => {
                    setDetailId(r.id);
                    setDetailTab("overview");
                  },
                  onEdit: () => openEdit(r),
                  onAddMaintenance: () => openAddMaintenanceForVehicle(r.id),
                  onEditKm: () => openKmModal(r.id),
                  onChangeAssignment: () => openAssignmentFromListRow(r),
                  onAddExpense: () => openAddExpenseForVehicle(r.id),
                  onAddInsurance: () => openAddInsuranceForVehicle(r.id),
                  menuMode: "extras",
                });
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3 shadow-sm ring-1 ring-zinc-100/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-lg font-bold tracking-wide text-zinc-900">
                          {r.plateNumber}
                        </p>
                        <p className="mt-0.5 text-pretty text-sm text-zinc-700">
                          {r.brand} {r.model}
                          {r.year != null ? (
                            <span className="text-zinc-500"> · {r.year}</span>
                          ) : null}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                          <StatusBadge tone={vehicleListStatusTone(r.status)}>
                            {vehicleStatusLabel(t, r.status)}
                          </StatusBadge>
                          <span className="break-words text-zinc-600">
                            {r.assignedPersonnelName ?? r.assignedBranchName ?? t("vehicles.idle")}
                          </span>
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 self-start rounded-full px-2 py-1 text-[0.6rem] font-bold uppercase leading-tight ring-1",
                          badgeClasses(r.insuranceBadge)
                        )}
                      >
                        {insuranceBadgeLabel(r.insuranceBadge)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      className="mt-3 inline-flex w-full !min-h-12 touch-manipulation items-center justify-center gap-2 text-base font-semibold sm:text-sm"
                      onClick={() => {
                        setDetailId(r.id);
                        setDetailTab("overview");
                      }}
                    >
                      <EyeIcon className="shrink-0 opacity-90" />
                      {t("common.openDetails")}
                    </Button>
                    {canEdit ? (
                      <div className="mt-2 flex items-stretch gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="inline-flex min-h-12 flex-1 touch-manipulation items-center justify-center gap-2 text-base font-medium sm:min-h-11 sm:text-sm"
                          onClick={() => openEdit(r)}
                        >
                          <PencilIcon className="shrink-0 opacity-90" />
                          {t("common.edit")}
                        </Button>
                        {extrasSections.length > 0 ? (
                          <div className="flex shrink-0 items-stretch">
                            <BranchQuickActionsMenu
                              menuId={`vehicle-row-${r.id}`}
                              triggerLabel={t("vehicles.rowMenuExtras")}
                              compact
                              sections={extrasSections}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 hidden w-full min-w-0 overflow-x-auto overscroll-x-contain lg:block">
              <div className="w-max min-w-full">
                <Table className="min-w-[52rem] [&_thead_th]:whitespace-nowrap">
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("vehicles.plate")}</TableHeader>
                      <TableHeader>{t("vehicles.brand")}</TableHeader>
                      <TableHeader>{t("vehicles.model")}</TableHeader>
                      <TableHeader className="hidden lg:table-cell">{t("vehicles.year")}</TableHeader>
                      <TableHeader>{t("vehicles.status")}</TableHeader>
                      <TableHeader className="hidden xl:table-cell">{t("vehicles.assignment")}</TableHeader>
                      <TableHeader>{t("vehicles.insuranceBadge")}</TableHeader>
                      <TableHeader className="w-[1%] whitespace-nowrap text-right">
                        {t("vehicles.rowActions")}
                      </TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((r) => {
                      const tableExtrasSections = buildVehicleRowMenuSections({
                        canEdit,
                        t,
                        onView: () => {
                          setDetailId(r.id);
                          setDetailTab("overview");
                        },
                        onEdit: () => openEdit(r),
                        onAddMaintenance: () => openAddMaintenanceForVehicle(r.id),
                        onEditKm: () => openKmModal(r.id),
                        onChangeAssignment: () => openAssignmentFromListRow(r),
                        onAddExpense: () => openAddExpenseForVehicle(r.id),
                        onAddInsurance: () => openAddInsuranceForVehicle(r.id),
                        menuMode: "extras",
                      });
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-semibold">{r.plateNumber}</TableCell>
                          <TableCell>{r.brand}</TableCell>
                          <TableCell>{r.model}</TableCell>
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 md:hidden lg:table-cell">
                            {r.year ?? "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge tone={vehicleListStatusTone(r.status)}>
                              {vehicleStatusLabel(t, r.status)}
                            </StatusBadge>
                          </TableCell>
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 max-w-[12rem] truncate md:hidden xl:table-cell">
                            {r.assignedPersonnelName ?? r.assignedBranchName ?? t("vehicles.idle")}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ring-1",
                                badgeClasses(r.insuranceBadge)
                              )}
                            >
                              {insuranceBadgeLabel(r.insuranceBadge)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right align-middle">
                            <div className="inline-flex flex-nowrap items-center justify-end gap-1">
                              <Tooltip content={t("common.openDetails")} delayMs={200}>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className={detailOpenIconButtonClass}
                                  aria-label={t("common.openDetails")}
                                  title={t("common.openDetails")}
                                  onClick={() => {
                                    setDetailId(r.id);
                                    setDetailTab("overview");
                                  }}
                                >
                                  <EyeIcon />
                                </Button>
                              </Tooltip>
                              {canEdit ? (
                                <Tooltip content={t("common.edit")} delayMs={200}>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className={detailOpenIconButtonClass}
                                    aria-label={t("common.edit")}
                                    title={t("common.edit")}
                                    onClick={() => openEdit(r)}
                                  >
                                    <PencilIcon />
                                  </Button>
                                </Tooltip>
                              ) : null}
                              {tableExtrasSections.length > 0 ? (
                                <BranchQuickActionsMenu
                                  menuId={`vehicle-table-${r.id}`}
                                  triggerLabel={t("vehicles.rowMenuExtras")}
                                  sections={tableExtrasSections}
                                />
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
          </Card>
        }
      />

      <Modal
        open={vehicleModal != null}
        onClose={() => setVehicleModal(null)}
        titleId="vehicle-form-title"
        title={vehicleModal === "add" ? t("vehicles.addVehicle") : t("vehicles.editVehicle")}
        narrow
        nested={detailId != null}
      >
        <div className="flex flex-col gap-3 p-1">
          <Input label={t("vehicles.plate")} value={plate} onChange={(e) => setPlate(e.target.value)} />
          <Input label={t("vehicles.brand")} value={brand} onChange={(e) => setBrand(e.target.value)} />
          <Input label={t("vehicles.model")} value={model} onChange={(e) => setModel(e.target.value)} />
          <Input label={t("vehicles.year")} value={year} onChange={(e) => setYear(e.target.value)} />
          <Select
            name="vehicle-status"
            label={t("vehicles.status")}
            value={status}
            onBlur={() => {}}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "ACTIVE", label: t("vehicles.statusActive") },
              { value: "INACTIVE", label: t("vehicles.statusInactive") },
              { value: "MAINTENANCE", label: t("vehicles.statusMaintenance") },
            ]}
          />
          <Select
            name="vehicle-assign-mode"
            label={t("vehicles.assignment")}
            value={assignMode}
            onBlur={() => {}}
            onChange={(e) => setAssignMode(e.target.value as AssignMode)}
            options={[
              { value: "idle", label: t("vehicles.idle") },
              { value: "personnel", label: t("vehicles.assignedPerson") },
              { value: "branch", label: t("vehicles.assignedBranch") },
            ]}
          />
          {assignMode === "personnel" ? (
            <Select
              name="vehicle-personnel"
              label={t("vehicles.assignedPerson")}
              value={personnelId}
              onBlur={() => {}}
              onChange={(e) => setPersonnelId(e.target.value)}
              options={[
                { value: "", label: "—" },
                ...personnelRows.map((p) => ({
                  value: String(p.id),
                  label: p.fullName,
                })),
              ]}
            />
          ) : null}
          {assignMode === "branch" ? (
            <Select
              name="vehicle-branch"
              label={t("vehicles.assignedBranch")}
              value={branchId}
              onBlur={() => {}}
              onChange={(e) => setBranchId(e.target.value)}
              options={[
                { value: "", label: "—" },
                ...branchRows.map((b) => ({
                  value: String(b.id),
                  label: b.name,
                })),
              ]}
            />
          ) : null}
          <Input
            label={t("vehicles.odometerKm")}
            value={odometerKmStr}
            onChange={(e) => setOdometerKmStr(e.target.value)}
            inputMode="numeric"
            placeholder="—"
          />
          <DateField
            label={t("vehicles.inspectionValidUntil")}
            value={inspectionUntil}
            onChange={(e) => setInspectionUntil(e.target.value)}
          />
          <Input
            label={t("vehicles.serviceIntervalKm")}
            value={serviceIntervalKmStr}
            onChange={(e) => setServiceIntervalKmStr(e.target.value)}
            inputMode="numeric"
            placeholder="—"
          />
          <Input
            label={t("vehicles.serviceIntervalMonths")}
            value={serviceIntervalMonthsStr}
            onChange={(e) => setServiceIntervalMonthsStr(e.target.value)}
            inputMode="numeric"
            placeholder="—"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700" htmlFor="vehicle-notes">
              {t("vehicles.notes")}
            </label>
            <textarea
              id="vehicle-notes"
              name="vehicle-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="min-h-[5.5rem] w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2"
            />
          </div>
          {assignMode === "personnel" ? (
            <>
              <DateField
                label={t("vehicles.driverSrcValidUntil")}
                value={driverSrc}
                onChange={(e) => setDriverSrc(e.target.value)}
              />
              <DateField
                label={t("vehicles.driverPsychotechnicalValidUntil")}
                value={driverPsy}
                onChange={(e) => setDriverPsy(e.target.value)}
              />
            </>
          ) : null}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => setVehicleModal(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => void saveVehicle()}
              disabled={
                createV.isPending ||
                updateV.isPending ||
                (vehicleModal === "edit" && editRow != null && editFormDetailPending)
              }
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={detailId != null}
        onClose={() => setDetailId(null)}
        titleId="vehicle-detail-title"
        title={detail ? detail.plateNumber : t("vehicles.title")}
        wide
        wideFixedHeight
        wideExpanded
        closeButtonLabel={t("common.close")}
      >
        {detailPending || !detail ? (
          <div className="flex min-h-[12rem] flex-1 flex-col items-center justify-center p-4 sm:min-h-[16rem] sm:p-5">
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom,0.5rem))] sm:gap-4 sm:p-4 sm:pb-4">
            <nav
              className="sticky top-0 z-[1] -mx-1 shrink-0 border-b border-zinc-200/90 bg-gradient-to-b from-white via-white/95 to-white/90 pb-px backdrop-blur-md supports-[backdrop-filter]:to-white/80 sm:mx-0 sm:rounded-t-lg"
              aria-label={t("vehicles.title")}
            >
              <div
                className={cn(
                  "flex min-w-0 gap-0 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x md:grid md:overflow-x-visible [&::-webkit-scrollbar]:hidden",
                  canEdit ? "md:grid-cols-6" : "md:grid-cols-5"
                )}
                role="tablist"
              >
                {detailTabItems.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={detailTab === id}
                    id={`vehicle-detail-tab-${id}`}
                    onClick={() => goDetailTab(id)}
                    className={cn(
                      "min-h-11 min-w-[5.75rem] shrink-0 touch-manipulation border-b-2 px-3 py-2.5 text-center text-xs font-semibold transition-colors md:min-w-0 md:px-2 md:py-3 md:text-[0.8125rem]",
                      detailTab === id
                        ? "border-zinc-900 text-zinc-900"
                        : "border-transparent text-zinc-500 hover:border-zinc-200 hover:text-zinc-800"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </nav>

            <div
              role="tabpanel"
              aria-labelledby={`vehicle-detail-tab-${detailTab}`}
              className="min-h-0 min-w-0 flex-1"
            >
            {detailTab === "overview" ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-zinc-100/80">
                  <div className="border-b border-zinc-800/20 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4 py-4 sm:px-5 sm:py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">
                          {t("vehicles.plate")}
                        </p>
                        <p className="mt-0.5 font-mono text-2xl font-bold tracking-[0.08em] text-white sm:text-[1.65rem]">
                          {detail.plateNumber}
                        </p>
                        <p className="mt-1.5 text-sm text-zinc-300">
                          {detail.brand} {detail.model}
                          {detail.year != null ? ` · ${detail.year}` : ""}
                        </p>
                      </div>
                      <StatusBadge
                        surface="dark"
                        tone={vehicleHeaderStatusTone(detail.status)}
                        size="md"
                        className="w-fit font-bold"
                      >
                        {vehicleStatusLabel(t, detail.status)}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-6">
                    <section
                      className="flex min-h-0 flex-col rounded-xl border border-dashed border-zinc-200/90 bg-zinc-50/60 p-3 ring-1 ring-zinc-100/60 sm:p-4"
                      aria-label={t("vehicles.vehiclePhoto")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                          {t("vehicles.vehiclePhoto")}
                        </h3>
                      </div>
                      <div className="mt-3 flex min-h-[10rem] flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border border-zinc-200/80 bg-white shadow-inner">
                        {detail.hasPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={vehiclePhotoUrl(detail.id, photoCacheBust)}
                            alt=""
                            className="max-h-52 w-full object-contain"
                          />
                        ) : (
                          <p className="px-3 text-center text-sm text-zinc-500">{t("vehicles.noPhoto")}</p>
                        )}
                      </div>
                      {canEdit ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <input
                            id={`vehicle-detail-photo-${detail.id}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
                            className="sr-only"
                            onChange={(e) => {
                              const input = e.currentTarget;
                              const f = input.files?.[0];
                              if (!f) return;
                              void (async () => {
                                try {
                                  await uploadVehiclePhotoMut.mutateAsync({
                                    vehicleId: detail.id,
                                    file: f,
                                  });
                                  setPhotoCacheBust(Date.now());
                                  toast.success(t("common.saved"), { ...notifyDefaults });
                                } catch (err) {
                                  toast.error(toErrorMessage(err), { ...notifyDefaults });
                                } finally {
                                  input.value = "";
                                }
                              })();
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full !min-h-11 touch-manipulation shadow-sm sm:w-auto sm:!min-h-10"
                            disabled={uploadVehiclePhotoMut.isPending}
                            onClick={() =>
                              document.getElementById(`vehicle-detail-photo-${detail.id}`)?.click()
                            }
                          >
                            {t("vehicles.uploadPhoto")}
                          </Button>
                          {detail.hasPhoto ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="w-full !min-h-11 touch-manipulation shadow-sm sm:w-auto sm:!min-h-10"
                              disabled={deleteVehiclePhotoMut.isPending}
                              onClick={() =>
                                void notifyConfirmToast({
                                  toastId: `vehicle-photo-delete-${detail.id}`,
                                  message: t("vehicles.confirmDeletePhoto"),
                                  confirmLabel: t("vehicles.deletePhoto"),
                                  cancelLabel: t("common.cancel"),
                                  onConfirm: async () => {
                                    try {
                                      await deleteVehiclePhotoMut.mutateAsync(detail.id);
                                      setPhotoCacheBust(Date.now());
                                      toast.success(t("common.saved"), { ...notifyDefaults });
                                    } catch (err) {
                                      toast.error(toErrorMessage(err), { ...notifyDefaults });
                                    }
                                  },
                                })
                              }
                            >
                              {t("vehicles.deletePhoto")}
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </section>

                    <div className="min-w-0 space-y-4">
                      <section
                        className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:p-4"
                        aria-labelledby="vehicle-overview-lines-heading"
                      >
                        <div
                          id="vehicle-overview-lines-heading"
                          className="mb-1 flex items-center gap-2 border-b border-zinc-100 pb-2"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                            <svg
                              viewBox="0 0 24 24"
                              width={18}
                              height={18}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                            </svg>
                          </span>
                          <h3 className="text-sm font-semibold text-zinc-900">{t("vehicles.tabOverview")}</h3>
                        </div>
                        <div className="px-0.5">
                          <VehicleOverviewRow
                            label={`${t("vehicles.brand")} / ${t("vehicles.model")}`}
                            value={`${detail.brand} ${detail.model}`.trim() || "—"}
                            icon={
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.3-1.5-2.1c-.2-.8-.7-1.4-1.5-1.4H8.5c-.8 0-1.3.6-1.5 1.4C6.8 8.7 5.5 10 5.5 10 3.3 10 2 11.7 2 14v3c0 .6.4 1 1 1h2" />
                                <circle cx="7" cy="17" r="2" />
                                <path d="M9 17h6" />
                                <circle cx="17" cy="17" r="2" />
                              </svg>
                            }
                          />
                          <VehicleOverviewRow
                            label={t("vehicles.year")}
                            value={detail.year ?? "—"}
                            icon={
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M8 2v4M16 2v4" />
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M3 10h18" />
                              </svg>
                            }
                          />
                          <VehicleOverviewRow
                            label={t("vehicles.odometerKm")}
                            value={
                              detail.odometerKm != null
                                ? new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(
                                    detail.odometerKm
                                  )
                                : "—"
                            }
                            icon={
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                              </svg>
                            }
                          />
                          <VehicleOverviewRow
                            label={t("vehicles.inspectionValidUntil")}
                            value={
                              detail.inspectionValidUntil
                                ? new Date(`${detail.inspectionValidUntil}T12:00:00`).toLocaleDateString(
                                    locale === "tr" ? "tr-TR" : "en-US"
                                  )
                                : "—"
                            }
                            icon={
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M8 2v4M16 2v4" />
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <path d="M3 10h18" />
                              </svg>
                            }
                          />
                          {detail.assignedPersonnelId ? (
                            <>
                              <VehicleOverviewRow
                                label={t("vehicles.driverSrcValidUntil")}
                                value={
                                  detail.driverSrcValidUntil
                                    ? new Date(
                                        `${detail.driverSrcValidUntil}T12:00:00`
                                      ).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")
                                    : "—"
                                }
                                icon={
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M8 2v4M16 2v4" />
                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                    <path d="M3 10h18" />
                                  </svg>
                                }
                              />
                              <VehicleOverviewRow
                                label={t("vehicles.driverPsychotechnicalValidUntil")}
                                value={
                                  detail.driverPsychotechnicalValidUntil
                                    ? new Date(
                                        `${detail.driverPsychotechnicalValidUntil}T12:00:00`
                                      ).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")
                                    : "—"
                                }
                                icon={
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M8 2v4M16 2v4" />
                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                    <path d="M3 10h18" />
                                  </svg>
                                }
                              />
                            </>
                          ) : null}
                          <VehicleOverviewRow
                            label={t("vehicles.assignment")}
                            value={
                              <span className="inline-flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <span className="break-words font-semibold text-zinc-900">
                                  {detail.assignedPersonnelName ??
                                    detail.assignedBranchName ??
                                    t("vehicles.idle")}
                                </span>
                                {canEdit ? (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="!min-h-10 w-full shrink-0 touch-manipulation shadow-sm sm:w-auto"
                                    onClick={openAssignmentDialogFromDetail}
                                  >
                                    {t("vehicles.changeAssignment")}
                                  </Button>
                                ) : null}
                              </span>
                            }
                            icon={
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            }
                          />
                          <VehicleOverviewRow
                            label={t("vehicles.notes")}
                            value={
                              <span className="whitespace-pre-wrap font-normal text-zinc-800">
                                {detail.notes?.trim() ? detail.notes : "—"}
                              </span>
                            }
                            icon={
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                              </svg>
                            }
                          />
                          <VehicleOverviewRow
                            label={t("vehicles.insuranceBadge")}
                            value={
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase ring-1",
                                  badgeClasses(detail.insuranceBadge)
                                )}
                              >
                                {insuranceBadgeLabel(detail.insuranceBadge)}
                              </span>
                            }
                            icon={
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                            }
                          />
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {detailTab === "service" ? (
              <div className="flex flex-col gap-8">
                <section
                  className="rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-4 ring-1 ring-zinc-100/60 sm:p-5"
                  aria-labelledby="vehicle-service-plan-heading"
                >
                  <h3
                    id="vehicle-service-plan-heading"
                    className="text-sm font-semibold tracking-tight text-zinc-900"
                  >
                    {t("vehicles.serviceSectionPlan")}
                  </h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-zinc-600">
                    {t("vehicles.maintenancePlanHint")}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="min-w-0 rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm">
                      <p className="text-[0.65rem] font-bold uppercase text-zinc-400">
                        {t("vehicles.serviceIntervalKm")}
                      </p>
                      <p className="mt-1 text-base font-semibold tabular-nums text-zinc-900 sm:text-lg">
                        {detail.serviceIntervalKm == null
                          ? "—"
                          : new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(
                              detail.serviceIntervalKm
                            )}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm">
                      <p className="text-[0.65rem] font-bold uppercase text-zinc-400">
                        {t("vehicles.serviceIntervalMonths")}
                      </p>
                      <p className="mt-1 text-base font-semibold tabular-nums text-zinc-900 sm:text-lg">
                        {detail.serviceIntervalMonths == null
                          ? "—"
                          : new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(
                              detail.serviceIntervalMonths
                            )}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-3" aria-labelledby="vehicle-service-log-heading">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3
                      id="vehicle-service-log-heading"
                      className="text-sm font-semibold tracking-tight text-zinc-900"
                    >
                      {t("vehicles.serviceSectionLog")}
                    </h3>
                    {canEdit ? (
                      <Button
                        type="button"
                        className="w-full !min-h-11 shrink-0 px-3 text-sm sm:w-auto sm:!min-h-9"
                        onClick={openAddMaintenanceFromDetail}
                      >
                        {t("vehicles.addMaintenance")}
                      </Button>
                    ) : null}
                  </div>
                {(detail.maintenances ?? []).length === 0 ? (
                  <p className="text-sm text-zinc-500">{t("vehicles.emptyMaintenances")}</p>
                ) : (
                  <>
                    <Select
                      name="vehicle-maintenance-log-filter"
                      label={t("vehicles.maintenanceFilterByType")}
                      value={maintLogFilterType}
                      onBlur={() => {}}
                      onChange={(e) => setMaintLogFilterType(e.target.value)}
                      options={maintenanceLogFilterSelectOptions}
                      className="max-w-md"
                    />
                    {filteredVehicleMaintenances.length === 0 ? (
                      <p className="text-sm text-zinc-500">{t("vehicles.maintenanceFilterNoResults")}</p>
                    ) : (
                      <>
                    <ul className="flex flex-col gap-3 md:hidden">
                      {filteredVehicleMaintenances.map((x) => {
                        const nextDueLabel = x.nextDueDate
                          ? x.nextDueDate.slice(0, 10)
                          : x.nextDueKm != null
                            ? `${new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(x.nextDueKm)} km`
                            : null;
                        return (
                          <li
                            key={x.id}
                            className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-100/80"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-zinc-900">
                                  {labelVehicleMaintenanceType(x.maintenanceType, t)}
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-500">
                                  {t("vehicles.maintenanceServiceDate")}: {x.serviceDate.slice(0, 10)}
                                </p>
                              </div>
                              <p className="shrink-0 tabular-nums text-sm font-medium text-zinc-800">
                                {x.cost != null
                                  ? formatLocaleAmount(x.cost, locale, x.currencyCode)
                                  : "—"}
                              </p>
                            </div>
                            <dl className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-zinc-600">
                              <div className="flex justify-between gap-2">
                                <dt>{t("vehicles.odometerKm")}</dt>
                                <dd className="tabular-nums text-zinc-800">
                                  {x.odometerKm != null
                                    ? new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(
                                        x.odometerKm
                                      )
                                    : "—"}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt>{t("vehicles.maintenanceWorkshop")}</dt>
                                <dd className="max-w-[60%] text-right text-zinc-800">
                                  {x.workshop ?? "—"}
                                </dd>
                              </div>
                              {nextDueLabel ? (
                                <div className="flex justify-between gap-2">
                                  <dt>{t("vehicles.maintenanceNextDueDate")}</dt>
                                  <dd className="text-zinc-800">{nextDueLabel}</dd>
                                </div>
                              ) : null}
                              {x.description?.trim() ? (
                                <div className="border-t border-zinc-100 pt-2 text-zinc-700">
                                  {x.description}
                                </div>
                              ) : null}
                            </dl>
                            {canEdit ? (
                              <div className="mt-3 flex flex-col gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="w-full !min-h-11 touch-manipulation"
                                  onClick={() => openEditMaintenance(detail.id, x)}
                                >
                                  {t("common.edit")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="w-full !min-h-11 touch-manipulation text-red-700 ring-red-200 hover:bg-red-50"
                                  onClick={() =>
                                    notifyConfirmToast({
                                      toastId: `vm-del-${x.id}`,
                                      title: t("vehicles.delete"),
                                      message: t("vehicles.confirmDeleteMaintenance"),
                                      cancelLabel: t("common.cancel"),
                                      confirmLabel: t("vehicles.delete"),
                                      onConfirm: async () => {
                                        try {
                                          await maintDel.mutateAsync({
                                            vehicleId: detail.id,
                                            maintenanceId: x.id,
                                          });
                                          toast.success(t("common.saved"), { ...notifyDefaults });
                                        } catch (e) {
                                          toast.error(toErrorMessage(e), { ...notifyDefaults });
                                        }
                                      },
                                    })
                                  }
                                >
                                  {t("vehicles.delete")}
                                </Button>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="hidden md:block">
                      <div className="-mx-1 min-w-0 overflow-x-auto rounded-lg sm:mx-0">
                        <Table className="min-w-[40rem] text-sm sm:min-w-0 sm:text-base">
                          <TableHead>
                            <TableRow>
                              <TableHeader>{t("vehicles.maintenanceServiceDate")}</TableHeader>
                              <TableHeader>{t("vehicles.maintenanceType")}</TableHeader>
                              <TableHeader className="hidden sm:table-cell">{t("vehicles.odometerKm")}</TableHeader>
                              <TableHeader className="hidden md:table-cell">
                                {t("vehicles.maintenanceWorkshop")}
                              </TableHeader>
                              <TableHeader>{t("vehicles.amount")}</TableHeader>
                              <TableHeader className="hidden md:table-cell">
                                {t("vehicles.maintenanceNextDueDate")}
                              </TableHeader>
                              <TableHeader className="w-[1%]" />
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredVehicleMaintenances.map((x) => (
                              <TableRow key={x.id}>
                                <TableCell className="whitespace-nowrap">
                                  {x.serviceDate.slice(0, 10)}
                                </TableCell>
                                <TableCell className="max-w-[10rem] truncate">
                                  {labelVehicleMaintenanceType(x.maintenanceType, t)}
                                </TableCell>
                                <TableCell className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 tabular-nums md:table-cell">
                                  {x.odometerKm != null
                                    ? new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(
                                        x.odometerKm
                                      )
                                    : "—"}
                                </TableCell>
                                <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 max-w-[8rem] truncate md:table-cell">
                                  {x.workshop ?? "—"}
                                </TableCell>
                                <TableCell className="tabular-nums">
                                  {x.cost != null
                                    ? formatLocaleAmount(x.cost, locale, x.currencyCode)
                                    : "—"}
                                </TableCell>
                                <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 whitespace-nowrap text-xs text-zinc-600 md:table-cell">
                                  {x.nextDueDate
                                    ? x.nextDueDate.slice(0, 10)
                                    : x.nextDueKm != null
                                      ? `${new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(x.nextDueKm)} km`
                                      : "—"}
                                </TableCell>
                                <TableCell className="align-top">
                                  {canEdit ? (
                                    <div className="flex min-w-[7rem] flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                        onClick={() => openEditMaintenance(detail.id, x)}
                                      >
                                        {t("common.edit")}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                        onClick={() =>
                                          notifyConfirmToast({
                                            toastId: `vm-del-${x.id}`,
                                            title: t("vehicles.delete"),
                                            message: t("vehicles.confirmDeleteMaintenance"),
                                            cancelLabel: t("common.cancel"),
                                            confirmLabel: t("vehicles.delete"),
                                            onConfirm: async () => {
                                              try {
                                                await maintDel.mutateAsync({
                                                  vehicleId: detail.id,
                                                  maintenanceId: x.id,
                                                });
                                                toast.success(t("common.saved"), { ...notifyDefaults });
                                              } catch (e) {
                                                toast.error(toErrorMessage(e), { ...notifyDefaults });
                                              }
                                            },
                                          })
                                        }
                                      >
                                        {t("vehicles.delete")}
                                      </Button>
                                    </div>
                                  ) : null}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                      </>
                    )}
                  </>
                )}
                </section>
              </div>
            ) : null}

            {detailTab === "assignments" ? (
              <div className="flex flex-col gap-4">
                {canEdit ? (
                  <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 p-3 ring-1 ring-zinc-100/80 sm:p-4">
                    <p className="text-pretty text-sm leading-relaxed text-zinc-600">
                      {t("vehicles.assignmentTabHint")}
                    </p>
                    <Button
                      type="button"
                      className="mt-3 w-full !min-h-11 touch-manipulation sm:w-auto sm:!min-h-10"
                      onClick={openAssignmentDialogFromDetail}
                    >
                      {t("vehicles.changeAssignment")}
                    </Button>
                  </div>
                ) : null}
                {detail.assignments.length === 0 ? (
                  <p className="text-sm text-zinc-500">{t("vehicles.emptyAssignments")}</p>
                ) : (
                  <>
                    <ul className="flex flex-col gap-2 md:hidden">
                      {detail.assignments.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3 text-sm ring-1 ring-zinc-100/80"
                        >
                          <p className="font-medium text-zinc-900">
                            {a.personnelName ?? a.branchName ?? t("vehicles.idle")}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600">
                            <span className="font-medium text-zinc-500">{t("vehicles.assignedAt")}:</span>{" "}
                            {new Date(a.assignedAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-600">
                            <span className="font-medium text-zinc-500">{t("vehicles.released")}:</span>{" "}
                            {a.releasedAt
                              ? new Date(a.releasedAt).toLocaleString(
                                  locale === "tr" ? "tr-TR" : "en-US"
                                )
                              : t("vehicles.active")}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <div className="-mx-1 hidden min-w-0 overflow-x-auto rounded-lg sm:mx-0 md:block">
                      <Table className="min-w-[32rem] text-sm sm:min-w-0 sm:text-base">
                        <TableHead>
                          <TableRow>
                            <TableHeader>{t("vehicles.assignment")}</TableHeader>
                            <TableHeader>{t("vehicles.assignedAt")}</TableHeader>
                            <TableHeader>{t("vehicles.released")}</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detail.assignments.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell>
                                {a.personnelName ?? a.branchName ?? t("vehicles.idle")}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-xs text-zinc-600">
                                {new Date(a.assignedAt).toLocaleString(
                                  locale === "tr" ? "tr-TR" : "en-US"
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-zinc-600">
                                {a.releasedAt
                                  ? new Date(a.releasedAt).toLocaleString(
                                      locale === "tr" ? "tr-TR" : "en-US"
                                    )
                                  : t("vehicles.active")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {detailTab === "insurances" ? (
              <div className="flex flex-col gap-3">
                {canEdit ? (
                  <Button
                    type="button"
                    className="w-full !min-h-11 self-stretch px-3 text-sm sm:w-auto sm:!min-h-9 sm:self-start"
                    onClick={openAddInsurance}
                  >
                    {t("vehicles.addInsurance")}
                  </Button>
                ) : null}
                {detail.insurances.length === 0 ? (
                  <p className="text-sm text-zinc-500">{t("vehicles.emptyInsurances")}</p>
                ) : (
                  <>
                    <ul className="flex flex-col gap-3 md:hidden">
                      {detail.insurances.map((x) => (
                        <li
                          key={x.id}
                          className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-100/80"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="font-semibold text-zinc-900">{x.insuranceType}</p>
                            <p className="text-xs font-medium text-zinc-600">
                              {t("vehicles.endDate")}: {x.endDate.slice(0, 10)}
                            </p>
                          </div>
                          {x.provider ? (
                            <p className="mt-1 text-xs text-zinc-500">
                              {t("vehicles.provider")}: {x.provider}
                            </p>
                          ) : null}
                          {canEdit ? (
                            <div className="mt-3 flex flex-col gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                className="w-full !min-h-11 touch-manipulation"
                                onClick={() => openEditInsurance(x)}
                              >
                                {t("common.edit")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="w-full !min-h-11 touch-manipulation text-red-700 ring-red-200 hover:bg-red-50"
                                onClick={() =>
                                  notifyConfirmToast({
                                    toastId: `vi-del-${x.id}`,
                                    title: t("vehicles.delete"),
                                    message: t("vehicles.confirmDeleteInsurance"),
                                    cancelLabel: t("common.cancel"),
                                    confirmLabel: t("vehicles.delete"),
                                    onConfirm: async () => {
                                      try {
                                        await insDel.mutateAsync({
                                          vehicleId: detail.id,
                                          insuranceId: x.id,
                                        });
                                        toast.success(t("common.saved"), { ...notifyDefaults });
                                      } catch (e) {
                                        toast.error(toErrorMessage(e), { ...notifyDefaults });
                                      }
                                    },
                                  })
                                }
                              >
                                {t("vehicles.delete")}
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <div className="-mx-1 hidden min-w-0 overflow-x-auto rounded-lg sm:mx-0 md:block">
                      <Table className="min-w-[36rem] text-sm sm:min-w-0 sm:text-base">
                        <TableHead>
                          <TableRow>
                            <TableHeader>{t("vehicles.insuranceType")}</TableHeader>
                            <TableHeader className="hidden sm:table-cell">{t("vehicles.provider")}</TableHeader>
                            <TableHeader>{t("vehicles.endDate")}</TableHeader>
                            <TableHeader className="w-[1%]" />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detail.insurances.map((x) => (
                            <TableRow key={x.id}>
                              <TableCell>{x.insuranceType}</TableCell>
                              <TableCell className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 sm:table-cell">
                                {x.provider ?? "—"}
                              </TableCell>
                              <TableCell>{x.endDate.slice(0, 10)}</TableCell>
                              <TableCell className="align-top">
                                {canEdit ? (
                                  <div className="flex min-w-[7rem] flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                      onClick={() => openEditInsurance(x)}
                                    >
                                      {t("common.edit")}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                      onClick={() =>
                                        notifyConfirmToast({
                                          toastId: `vi-del-${x.id}`,
                                          title: t("vehicles.delete"),
                                          message: t("vehicles.confirmDeleteInsurance"),
                                          cancelLabel: t("common.cancel"),
                                          confirmLabel: t("vehicles.delete"),
                                          onConfirm: async () => {
                                            try {
                                              await insDel.mutateAsync({
                                                vehicleId: detail.id,
                                                insuranceId: x.id,
                                              });
                                              toast.success(t("common.saved"), { ...notifyDefaults });
                                            } catch (e) {
                                              toast.error(toErrorMessage(e), { ...notifyDefaults });
                                            }
                                          },
                                        })
                                      }
                                    >
                                      {t("vehicles.delete")}
                                    </Button>
                                  </div>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {detailTab === "costs" ? (
              <div className="flex flex-col gap-4">
                {canEdit ? (
                  <div
                    className="flex w-full max-w-md flex-wrap gap-1 rounded-xl bg-zinc-100/90 p-1 ring-1 ring-zinc-200/80"
                    role="tablist"
                    aria-label={t("vehicles.tabCosts")}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={costsSubTab === "ledger"}
                      className={cn(
                        "min-h-10 flex-1 touch-manipulation rounded-lg px-3 py-2 text-center text-xs font-semibold transition-all sm:text-sm",
                        costsSubTab === "ledger"
                          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                          : "text-zinc-600 hover:text-zinc-900"
                      )}
                      onClick={() => setCostsSubTab("ledger")}
                    >
                      {t("vehicles.costsSubLedger")}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={costsSubTab === "report"}
                      className={cn(
                        "min-h-10 flex-1 touch-manipulation rounded-lg px-3 py-2 text-center text-xs font-semibold transition-all sm:text-sm",
                        costsSubTab === "report"
                          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                          : "text-zinc-600 hover:text-zinc-900"
                      )}
                      onClick={() => setCostsSubTab("report")}
                    >
                      {t("vehicles.costsSubReport")}
                    </button>
                  </div>
                ) : null}

                {(!canEdit || costsSubTab === "ledger") ? (
              <div className="flex flex-col gap-3">
                {canEdit ? (
                  <Button
                    type="button"
                    className="w-full !min-h-11 self-stretch px-3 text-sm sm:w-auto sm:!min-h-9 sm:self-start"
                    onClick={openAddExpense}
                  >
                    {t("vehicles.addExpense")}
                  </Button>
                ) : null}
                {detail.expenses.length === 0 ? (
                  <p className="text-sm text-zinc-500">{t("vehicles.emptyExpenses")}</p>
                ) : (
                  <>
                    <ul className="flex flex-col gap-3 md:hidden">
                      {detail.expenses.map((x) => {
                        const postingDetail = vehicleExpenseBranchPostingDetail(x, t);
                        return (
                        <li
                          key={x.id}
                          className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-100/80"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-900">{x.expenseType}</p>
                              <p className="text-xs text-zinc-500">{x.expenseDate.slice(0, 10)}</p>
                              {x.postedBranchName?.trim() ? (
                                <p className="mt-0.5 text-[11px] text-sky-800">
                                  {t("vehicles.expensePostedBranch")}: {x.postedBranchName.trim()}
                                  {postingDetail ? (
                                    <span className="ml-1 font-semibold">· {postingDetail}</span>
                                  ) : null}
                                </p>
                              ) : null}
                            </div>
                            <p className="shrink-0 tabular-nums text-sm font-medium text-zinc-800">
                              {formatLocaleAmount(x.amount, locale, x.currencyCode)}
                            </p>
                          </div>
                          {x.description?.trim() ? (
                            <p className="mt-2 text-xs text-zinc-600">{x.description}</p>
                          ) : null}
                          {canEdit ? (
                            <div className="mt-3 flex flex-col gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                className="w-full !min-h-11 touch-manipulation"
                                onClick={() => openEditExpense(x)}
                              >
                                {t("common.edit")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="w-full !min-h-11 touch-manipulation text-red-700 ring-red-200 hover:bg-red-50"
                                onClick={() =>
                                  notifyConfirmToast({
                                    toastId: `ve-del-${x.id}`,
                                    title: t("vehicles.delete"),
                                    message: t("vehicles.confirmDeleteExpense"),
                                    cancelLabel: t("common.cancel"),
                                    confirmLabel: t("vehicles.delete"),
                                    onConfirm: async () => {
                                      try {
                                        await expDel.mutateAsync({
                                          vehicleId: detail.id,
                                          expenseId: x.id,
                                        });
                                        toast.success(t("common.saved"), { ...notifyDefaults });
                                      } catch (e) {
                                        toast.error(toErrorMessage(e), { ...notifyDefaults });
                                      }
                                    },
                                  })
                                }
                              >
                                {t("vehicles.delete")}
                              </Button>
                            </div>
                          ) : null}
                        </li>
                        );
                      })}
                    </ul>
                    <div className="-mx-1 hidden min-w-0 overflow-x-auto rounded-lg sm:mx-0 md:block">
                      <Table className="min-w-[34rem] text-sm sm:min-w-0 sm:text-base">
                        <TableHead>
                          <TableRow>
                            <TableHeader>{t("vehicles.expenseDate")}</TableHeader>
                            <TableHeader>{t("vehicles.expenseType")}</TableHeader>
                            <TableHeader>{t("vehicles.amount")}</TableHeader>
                            <TableHeader className="w-[1%]" />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detail.expenses.map((x) => {
                                const postingDetail = vehicleExpenseBranchPostingDetail(x, t);
                                return (
                            <TableRow key={x.id}>
                              <TableCell>{x.expenseDate.slice(0, 10)}</TableCell>
                              <TableCell>
                                <div>{x.expenseType}</div>
                                {x.postedBranchName?.trim() ? (
                                  <div className="mt-0.5 text-xs text-sky-800">
                                    {x.postedBranchName.trim()}
                                    {postingDetail ? (
                                      <span className="ml-1 font-semibold">· {postingDetail}</span>
                                    ) : null}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {formatLocaleAmount(x.amount, locale, x.currencyCode)}
                              </TableCell>
                              <TableCell className="align-top">
                                {canEdit ? (
                                  <div className="flex min-w-[7rem] flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                      onClick={() => openEditExpense(x)}
                                    >
                                      {t("common.edit")}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="!min-h-10 w-full px-2 text-sm sm:!min-h-9 sm:w-auto"
                                      onClick={() =>
                                        notifyConfirmToast({
                                          toastId: `ve-del-${x.id}`,
                                          title: t("vehicles.delete"),
                                          message: t("vehicles.confirmDeleteExpense"),
                                          cancelLabel: t("common.cancel"),
                                          confirmLabel: t("vehicles.delete"),
                                          onConfirm: async () => {
                                            try {
                                              await expDel.mutateAsync({
                                                vehicleId: detail.id,
                                                expenseId: x.id,
                                              });
                                              toast.success(t("common.saved"), { ...notifyDefaults });
                                            } catch (e) {
                                              toast.error(toErrorMessage(e), { ...notifyDefaults });
                                            }
                                          },
                                        })
                                      }
                                    >
                                      {t("vehicles.delete")}
                                    </Button>
                                  </div>
                                ) : null}
                              </TableCell>
                            </TableRow>
                                );
                              })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
                ) : null}

                {canEdit && costsSubTab === "report" ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-3 ring-1 ring-zinc-100/60 sm:p-4">
                <p className="text-pretty text-sm leading-relaxed text-zinc-600">
                  {t("vehicles.vehicleExpenseReportHint")}
                </p>
                <p className="text-xs text-zinc-500">{t("vehicles.branchFilterHint")}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    label={t("vehicles.filterYear")}
                    value={sumYear}
                    onChange={(e) => setSumYear(e.target.value)}
                  />
                  <Input
                    label={t("vehicles.filterMonth")}
                    value={sumMonth}
                    onChange={(e) => setSumMonth(e.target.value)}
                    placeholder={t("vehicles.filterMonthOptional")}
                  />
                  <Select
                    name="veh-sum-vehicle"
                    label={t("vehicles.filterVehicle")}
                    value={sumVehicleId}
                    onBlur={() => {}}
                    onChange={(e) => setSumVehicleId(e.target.value)}
                    options={[
                      { value: "", label: t("common.all") },
                      ...rows.map((r) => ({
                        value: String(r.id),
                        label: r.plateNumber,
                      })),
                    ]}
                  />
                  <Select
                    name="veh-sum-branch"
                    label={t("vehicles.filterBranch")}
                    value={sumBranchId}
                    onBlur={() => {}}
                    onChange={(e) => setSumBranchId(e.target.value)}
                    options={[
                      { value: "", label: t("vehicles.allBranches") },
                      ...branchRows.map((b) => ({
                        value: String(b.id),
                        label: b.name,
                      })),
                    ]}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full !min-h-11 touch-manipulation sm:w-auto sm:!min-h-10"
                  onClick={() => applyExpenseReportFilters()}
                >
                  {t("vehicles.applyExpenseReport")}
                </Button>
                {!summaryQueryEnabled || summaryPending ? (
                  <p className="text-sm text-zinc-500">{t("common.loading")}</p>
                ) : summaryRows.length === 0 ? (
                  <p className="text-sm text-zinc-500">{t("vehicles.emptySummary")}</p>
                ) : (
                  <>
                    <ul className="flex flex-col gap-2 md:hidden">
                      {summaryRows.map((s, i) => (
                        <li
                          key={`${s.vehicleId}-${s.year}-${s.month}-${s.expenseType}-${s.currencyCode}-${i}`}
                          className="rounded-xl border border-zinc-200/90 bg-zinc-50/40 p-3 text-sm ring-1 ring-zinc-100/80"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="font-mono font-semibold text-zinc-900">{s.plateNumber}</p>
                            <p className="tabular-nums font-medium text-zinc-800">
                              {formatLocaleAmount(s.totalAmount, locale, s.currencyCode)}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-zinc-600">
                            {s.expenseType} · {s.year}/{String(s.month).padStart(2, "0")}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <div className="-mx-1 hidden min-w-0 overflow-x-auto rounded-lg sm:mx-0 md:block">
                      <Table className="min-w-[36rem] text-sm sm:min-w-0 sm:text-base">
                        <TableHead>
                          <TableRow>
                            <TableHeader>{t("vehicles.plate")}</TableHeader>
                            <TableHeader>{t("vehicles.filterYear")}</TableHeader>
                            <TableHeader>{t("vehicles.filterMonth")}</TableHeader>
                            <TableHeader>{t("vehicles.expenseType")}</TableHeader>
                            <TableHeader>{t("vehicles.amount")}</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {summaryRows.map((s, i) => (
                            <TableRow
                              key={`${s.vehicleId}-${s.year}-${s.month}-${s.expenseType}-${s.currencyCode}-${i}`}
                            >
                              <TableCell className="max-w-[8rem] truncate sm:max-w-none">
                                {s.plateNumber}
                              </TableCell>
                              <TableCell>{s.year}</TableCell>
                              <TableCell>{s.month}</TableCell>
                              <TableCell className="max-w-[7rem] truncate sm:max-w-none">
                                {s.expenseType}
                              </TableCell>
                              <TableCell className="whitespace-nowrap tabular-nums">
                                {formatLocaleAmount(s.totalAmount, locale, s.currencyCode)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
                ) : null}
              </div>
            ) : null}

            {canEdit && detailTab === "audit" ? (
              <VehicleDetailAuditTab vehicleId={detail.id} enabled={detailTab === "audit"} />
            ) : null}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={insModal != null}
        onClose={() => {
          setInsModal(null);
          setInsModalVehicleId(null);
        }}
        titleId="vehicle-insurance-form"
        title={insModal === "add" ? t("vehicles.addInsurance") : t("vehicles.editInsurance")}
        narrow
        nested
        closeButtonLabel={t("common.close")}
      >
        <div className="flex flex-col gap-3 p-1">
          <Input
            label={t("vehicles.insuranceType")}
            value={insType}
            onChange={(e) => setInsType(e.target.value)}
            placeholder="trafik / kasko"
          />
          <Input
            label={t("vehicles.provider")}
            value={insProvider}
            onChange={(e) => setInsProvider(e.target.value)}
          />
          <Input
            label={t("vehicles.policyNumber")}
            value={insPolicy}
            onChange={(e) => setInsPolicy(e.target.value)}
          />
          <DateField
            label={t("vehicles.startDate")}
            value={insStart}
            onChange={(e) => setInsStart(e.target.value)}
          />
          <DateField
            label={t("vehicles.endDate")}
            value={insEnd}
            onChange={(e) => setInsEnd(e.target.value)}
          />
          <Input
            label={t("vehicles.amount")}
            value={insAmount}
            onChange={(e) => setInsAmount(e.target.value)}
          />
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => {
                setInsModal(null);
                setInsModalVehicleId(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => void saveInsurance()}
              disabled={insCreate.isPending || insUpdate.isPending}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={expModal != null}
        onClose={() => {
          setExpModal(null);
          setExpModalVehicleId(null);
        }}
        titleId="vehicle-expense-form"
        title={expModal === "add" ? t("vehicles.addExpense") : t("vehicles.editExpense")}
        narrow
        nested
        closeButtonLabel={t("common.close")}
      >
        <div className="flex flex-col gap-3 p-1">
          <Select
            name="vehicle-expense-type"
            label={t("vehicles.expenseType")}
            value={expType}
            onBlur={() => {}}
            onChange={(e) => setExpType(e.target.value)}
            options={[
              { value: "fuel", label: t("vehicles.types.fuel") },
              { value: "maintenance", label: t("vehicles.types.maintenance") },
              { value: "insurance", label: t("vehicles.types.insurance") },
              { value: "repair", label: t("vehicles.types.repair") },
              { value: "other", label: t("vehicles.types.other") },
            ]}
          />
          <Input
            label={t("vehicles.amount")}
            value={expAmount}
            onChange={(e) => setExpAmount(e.target.value)}
          />
          <Input
            label={t("vehicles.currency")}
            value={expCur}
            onChange={(e) => setExpCur(e.target.value.toUpperCase())}
          />
          <DateField
            label={t("vehicles.expenseDate")}
            value={expDate}
            onChange={(e) => setExpDate(e.target.value)}
          />
          <Input
            label={t("vehicles.description")}
            value={expDesc}
            onChange={(e) => setExpDesc(e.target.value)}
          />
          {canEdit ? (
            <Select
              name="vehicle-expense-branch"
              label={t("vehicles.expensePostToBranch")}
              value={expBranchId}
              onBlur={() => {}}
              onChange={(e) => {
                const v = e.target.value;
                setExpBranchId(v);
                if (!v.trim()) {
                  setExpBranchPaySource("REGISTER");
                  setExpPatronPay("CASH");
                }
              }}
              options={[
                { value: "", label: "—" },
                ...branchRows.map((b) => ({
                  value: String(b.id),
                  label: b.name,
                })),
              ]}
            />
          ) : null}
          {canEdit && expBranchId.trim() ? (
            <div className="flex flex-col gap-3 rounded-lg border border-zinc-200/80 bg-zinc-50/60 p-3">
              <p className="text-xs text-zinc-600">{t("vehicles.expenseBranchPayHint")}</p>
              <Select
                name="vehicle-expense-branch-pay-source"
                label={t("vehicles.expenseBranchPaySource")}
                value={expBranchPaySource}
                onBlur={() => {}}
                onChange={(e) => setExpBranchPaySource(e.target.value as "REGISTER" | "PATRON")}
                options={[
                  { value: "REGISTER", label: t("vehicles.expenseBranchPayRegister") },
                  { value: "PATRON", label: t("vehicles.expenseBranchPayPatron") },
                ]}
              />
              {expBranchPaySource === "PATRON" ? (
                <Select
                  name="vehicle-expense-patron-pay"
                  label={t("vehicles.expensePatronPayMethod")}
                  value={expPatronPay}
                  onBlur={() => {}}
                  onChange={(e) => setExpPatronPay(e.target.value as "CASH" | "CARD")}
                  options={[
                    { value: "CASH", label: t("vehicles.expensePayCash") },
                    { value: "CARD", label: t("vehicles.expensePayCard") },
                  ]}
                />
              ) : null}
            </div>
          ) : null}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => {
                setExpModal(null);
                setExpModalVehicleId(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => void saveExpense()}
              disabled={expCreate.isPending || expUpdate.isPending}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={maintModal != null}
        onClose={() => {
          setMaintModal(null);
          setMaintVehicleId(null);
        }}
        titleId="vehicle-maintenance-form"
        title={maintModal === "add" ? t("vehicles.addMaintenance") : t("vehicles.editMaintenance")}
        narrow
        nested
        closeButtonLabel={t("common.close")}
      >
        <div className="flex flex-col gap-3 p-1">
          <DateField
            label={t("vehicles.maintenanceServiceDate")}
            labelRequired
            value={maintServiceDate}
            onChange={(e) => setMaintServiceDate(e.target.value)}
          />
          <Input
            label={t("vehicles.odometerKm")}
            labelRequired
            value={maintOdometerStr}
            onChange={(e) => setMaintOdometerStr(e.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
          <Select
            name="vehicle-maintenance-type"
            label={t("vehicles.maintenanceType")}
            labelRequired
            value={maintType}
            onBlur={() => {}}
            onChange={(e) => setMaintType(e.target.value)}
            options={maintenanceTypeFormSelectOptions}
          />
          <Input
            label={t("vehicles.maintenanceWorkshop")}
            value={maintWorkshop}
            onChange={(e) => setMaintWorkshop(e.target.value)}
          />
          <Input
            label={t("vehicles.amount")}
            labelRequired
            value={maintCost}
            onChange={(e) => setMaintCost(e.target.value)}
            placeholder="0"
          />
          <Input
            label={t("vehicles.currency")}
            labelRequired
            value={maintCur}
            onChange={(e) => setMaintCur(e.target.value.toUpperCase())}
            maxLength={3}
          />
          <DateField
            label={t("vehicles.maintenanceNextDueDate")}
            value={maintNextDate}
            onChange={(e) => setMaintNextDate(e.target.value)}
          />
          <Input
            label={t("vehicles.maintenanceNextDueKm")}
            value={maintNextKmStr}
            onChange={(e) => setMaintNextKmStr(e.target.value)}
            inputMode="numeric"
            placeholder="—"
          />
          <Input
            label={t("vehicles.description")}
            value={maintDesc}
            onChange={(e) => setMaintDesc(e.target.value)}
          />
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => {
                setMaintModal(null);
                setMaintVehicleId(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => void saveMaintenance()}
              disabled={maintCreate.isPending || maintUpdate.isPending}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={kmModalVehicleId != null}
        onClose={() => setKmModalVehicleId(null)}
        titleId="vehicle-odometer-form"
        title={t("vehicles.editOdometerTitle")}
        narrow
        nested={detailId != null}
        closeButtonLabel={t("common.close")}
      >
        <div className="flex flex-col gap-3 p-1">
          <Input
            label={t("vehicles.odometerKm")}
            value={kmModalStr}
            onChange={(e) => setKmModalStr(e.target.value)}
            inputMode="numeric"
            placeholder="—"
          />
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => setKmModalVehicleId(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => void saveKmModal()}
              disabled={patchOdometerMut.isPending || (kmModalEnabled && !kmModalVehicle)}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={assignDlgOpen}
        onClose={() => {
          setAssignDlgOpen(false);
          setAssignDlgVehicleId(null);
        }}
        titleId="vehicle-assign-dialog-title"
        title={t("vehicles.assignmentDialogTitle")}
        narrow
        nested={detailId != null}
        closeButtonLabel={t("common.close")}
      >
        <div className="flex flex-col gap-3 p-1">
          {assignDlgVehicleId != null ? (
            <p className="text-sm font-medium text-zinc-800">
              {rows.find((r) => r.id === assignDlgVehicleId)?.plateNumber ?? `#${assignDlgVehicleId}`}
            </p>
          ) : null}
          <Select
            name="vehicle-assign-dlg-mode"
            label={t("vehicles.assignment")}
            value={assignDlgMode}
            onBlur={() => {}}
            onChange={(e) => setAssignDlgMode(e.target.value as AssignMode)}
            options={[
              { value: "idle", label: t("vehicles.idle") },
              { value: "personnel", label: t("vehicles.assignedPerson") },
              { value: "branch", label: t("vehicles.assignedBranch") },
            ]}
          />
          {assignDlgMode === "personnel" ? (
            <Select
              name="vehicle-assign-dlg-personnel"
              label={t("vehicles.assignedPerson")}
              value={assignDlgPersonnelId}
              onBlur={() => {}}
              onChange={(e) => setAssignDlgPersonnelId(e.target.value)}
              options={[
                { value: "", label: "—" },
                ...personnelRows.map((p) => ({
                  value: String(p.id),
                  label: p.fullName,
                })),
              ]}
            />
          ) : null}
          {assignDlgMode === "branch" ? (
            <Select
              name="vehicle-assign-dlg-branch"
              label={t("vehicles.assignedBranch")}
              value={assignDlgBranchId}
              onBlur={() => {}}
              onChange={(e) => setAssignDlgBranchId(e.target.value)}
              options={[
                { value: "", label: "—" },
                ...branchRows.map((b) => ({
                  value: String(b.id),
                  label: b.name,
                })),
              ]}
            />
          ) : null}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => {
                setAssignDlgOpen(false);
                setAssignDlgVehicleId(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
              onClick={() => void saveAssignmentDialog()}
              disabled={patchAssignmentMut.isPending || assignDlgVehicleId == null}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
