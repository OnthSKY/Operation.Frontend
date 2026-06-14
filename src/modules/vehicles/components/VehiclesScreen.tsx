"use client";

import { fetchBranches } from "@/modules/branch/api/branches-api";
import { fetchPersonnelList } from "@/modules/personnel/api/personnel-api";
import { VehicleDetailAuditTab } from "@/modules/vehicles/components/VehicleDetailAuditTab";
import { VEHICLE_DOCUMENT_KIND_OPTIONS } from "@/modules/vehicles/lib/vehicle-document-kinds";
import { useVehicleInsuranceForm } from "@/modules/vehicles/hooks/useVehicleInsuranceForm";
import { useVehicleExpenseForm } from "@/modules/vehicles/hooks/useVehicleExpenseForm";
import { useVehicleMaintenanceForm } from "@/modules/vehicles/hooks/useVehicleMaintenanceForm";
import { useVehicleDocumentForm } from "@/modules/vehicles/hooks/useVehicleDocumentForm";
import { useVehicleOdometerModal } from "@/modules/vehicles/hooks/useVehicleOdometerModal";
import { useVehicleAssignmentDialog } from "@/modules/vehicles/hooks/useVehicleAssignmentDialog";
import { useVehicleEditForm } from "@/modules/vehicles/hooks/useVehicleEditForm";
import { useVehicleExpenseSummary as useVehicleExpenseSummaryState } from "@/modules/vehicles/hooks/useVehicleExpenseSummary";
import { VehicleOdometerModal } from "@/modules/vehicles/components/VehicleOdometerModal";
import { VehicleAssignDialog } from "@/modules/vehicles/components/VehicleAssignDialog";
import { VehicleInsuranceModal } from "@/modules/vehicles/components/VehicleInsuranceModal";
import { VehicleExpenseModal } from "@/modules/vehicles/components/VehicleExpenseModal";
import { VehicleMaintenanceModal } from "@/modules/vehicles/components/VehicleMaintenanceModal";
import {
  VehicleDocumentUploadSheet,
  VehicleDocumentDeleteModal,
} from "@/modules/vehicles/components/VehicleDocumentUploadSheet";
import { VehicleEditModal } from "@/modules/vehicles/components/VehicleEditModal";
import { VehicleListPanel } from "@/modules/vehicles/components/VehicleListPanel";
import { VehicleDetailDocumentsTab } from "@/modules/vehicles/components/VehicleDetailDocumentsTab";
import { VehicleDetailAssignmentsTab } from "@/modules/vehicles/components/VehicleDetailAssignmentsTab";
import { VehicleDetailInsurancesTab } from "@/modules/vehicles/components/VehicleDetailInsurancesTab";
import { VehicleDetailServiceTab } from "@/modules/vehicles/components/VehicleDetailServiceTab";
import { VehicleDetailCostsTab } from "@/modules/vehicles/components/VehicleDetailCostsTab";
import { VehicleDetailOverviewTab } from "@/modules/vehicles/components/VehicleDetailOverviewTab";
import {
  useDeleteVehiclePhoto,
  useUploadVehiclePhoto,
  useVehicle,
  useVehicleDocuments,
  useVehicles,
} from "@/modules/vehicles/hooks/useVehicleQueries";
import { useAuth } from "@/lib/auth/AuthContext";
import { isDriverPortalRole, isPersonnelPortalRole } from "@/lib/auth/roles";
import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { vehicleStatusLabel } from "@/modules/vehicles/lib/vehicle-status-display";
import {
  VEHICLE_MAINTENANCE_TYPE_IDS,
  isKnownVehicleMaintenanceType,
  labelVehicleMaintenanceType,
} from "@/modules/vehicles/lib/vehicle-maintenance-types";
import {
  VEHICLE_INSURANCE_COMPANY_ALIASES,
  VEHICLE_INSURANCE_COMPANY_SLUGS,
  VEHICLE_INSURANCE_OTHER_SLUG,
  VEHICLE_INSURANCE_TYPE_ALIASES,
  VEHICLE_INSURANCE_TYPE_SLUGS,
  matchInsurancePresetSlug,
} from "@/modules/vehicles/lib/vehicle-insurance-presets";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import {
  formatLocaleAmount,
  formatLocaleAmountInput,
  formatAmountInputOnBlur,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { OVERLAY_Z_INDEX } from "@/shared/overlays/z-layers";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
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
import type { VehicleDocumentKind } from "@/types/vehicle-document";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FocusEventHandler, type ReactNode } from "react";

type DetailTab = "overview" | "service" | "documents" | "assignments" | "insurances" | "costs" | "audit";
type CostsSubTab = "ledger" | "report";
type AssignMode = "idle" | "personnel" | "branch";

const NOOP_BLUR: FocusEventHandler<HTMLInputElement> = () => {};


export function VehiclesScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const canEdit =
    !isPersonnelPortalRole(user?.role) && !isDriverPortalRole(user?.role);

  const { data: rows = [], isPending, isError, error } = useVehicles();

  useEffect(() => {
    if (!isError || error == null) {
      notify.dismiss("vehicles-list-load");
      return;
    }
    notify.error(toErrorMessage(error), { toastId: "vehicles-list-load" });
  }, [isError, error]);

  const uploadVehiclePhotoMut = useUploadVehiclePhoto();
  const deleteVehiclePhotoMut = useDeleteVehiclePhoto();

  const { data: personnelRows = [] } = useQuery({
    queryKey: ["vehicles", "personnel-options"],
    queryFn: async () => (await fetchPersonnelList()).items,
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
        (r.odometerKm != null && String(r.odometerKm).includes(q)) ||
        personnel.includes(q) ||
        branch.includes(q) ||
        status.includes(q)
      );
    });
  }, [rows, search]);

  // Detail overlay state — editForm.onAfterDelete callback'i içinde okunduğu için
  // editForm çağrısından önce tanımlanmalı.
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [costsSubTab, setCostsSubTab] = useState<CostsSubTab>("ledger");

  // ─── Vehicle add/edit form hook (en büyük form: 15+ alan + dirty-guard) ───
  const editForm = useVehicleEditForm({
    locale,
    t,
    onAfterDelete: (vehicleId) => {
      if (detailId === vehicleId) setDetailId(null);
    },
  });
  const vehicleModal = editForm.modal;
  const editRow = editForm.editRow;
  const editFormDetail = editForm.editFormDetail;
  const editFormDetailPending = editForm.editFormDetailPending;
  const plate = editForm.plate;
  const setPlate = editForm.setPlate;
  const brand = editForm.brand;
  const setBrand = editForm.setBrand;
  const model = editForm.model;
  const setModel = editForm.setModel;
  const year = editForm.year;
  const setYear = editForm.setYear;
  const status = editForm.status;
  const setStatus = editForm.setStatus;
  const assignMode = editForm.assignMode;
  const setAssignMode = editForm.setAssignMode;
  const personnelId = editForm.personnelId;
  const setPersonnelId = editForm.setPersonnelId;
  const branchId = editForm.branchId;
  const setBranchId = editForm.setBranchId;
  const odometerKmStr = editForm.odometerKmStr;
  const setOdometerKmStr = editForm.setOdometerKmStr;
  const inspectionUntil = editForm.inspectionUntil;
  const setInspectionUntil = editForm.setInspectionUntil;
  const notes = editForm.notes;
  const setNotes = editForm.setNotes;
  const driverSrc = editForm.driverSrc;
  const setDriverSrc = editForm.setDriverSrc;
  const driverPsy = editForm.driverPsy;
  const setDriverPsy = editForm.setDriverPsy;
  const serviceIntervalKmStr = editForm.serviceIntervalKmStr;
  const setServiceIntervalKmStr = editForm.setServiceIntervalKmStr;
  const serviceIntervalMonthsStr = editForm.serviceIntervalMonthsStr;
  const setServiceIntervalMonthsStr = editForm.setServiceIntervalMonthsStr;
  const openAdd = editForm.openAdd;
  const openEdit = editForm.openEdit;
  const requestCloseVehicleModal = editForm.requestClose;
  const saveVehicle = editForm.save;
  const confirmDeleteVehicle = editForm.confirmDelete;

  const [photoCacheBust, setPhotoCacheBust] = useState(0);

  const openAssignmentDialogFromDetail = () => {
    if (!detail || !canEdit) return;
    assignment.openFor(detail);
  };

  const openAssignmentFromListRow = (r: VehicleListItem) => {
    if (!canEdit) return;
    assignment.openFor(r);
  };


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
  const currentVehicleId = detailId ?? 0;
  const {
    data: vehicleDocuments = [],
    isPending: vehicleDocumentsPending,
    isError: vehicleDocumentsError,
    error: vehicleDocumentsErrorValue,
  } = useVehicleDocuments(detailId, detailEnabled);
  // ─── Document form hook ───────────────────────────────────────────────────
  const docForm = useVehicleDocumentForm({
    vehicleId: currentVehicleId,
    active: detailEnabled,
    t,
  });
  const docFormOpen = docForm.formOpen;
  const setDocFormOpen = docForm.setFormOpen;
  const docKind = docForm.kind;
  const setDocKind = docForm.setKind;
  const docNotes = docForm.notes;
  const setDocNotes = docForm.setNotes;
  const docFile = docForm.file;
  const setDocFile = docForm.setFile;
  const docFormError = docForm.formError;
  const setDocFormError = docForm.setFormError;
  const docDeleteId = docForm.deleteId;
  const setDocDeleteId = docForm.setDeleteId;
  const openingVehicleDocId = docForm.openingId;
  const vehicleDocPreviewMode = docForm.previewMode;
  const vehicleDocPreviewUrl = docForm.previewUrl;
  const openVehicleDoc = docForm.openDoc;
  const submitVehicleDocUpload = docForm.submitUpload;
  const confirmVehicleDocDelete = docForm.confirmDelete;

  const [maintLogFilterType, setMaintLogFilterType] = useState("");

  const vehicleDocKindLabel = (k: VehicleDocumentKind) => {
    const opt = VEHICLE_DOCUMENT_KIND_OPTIONS.find((x) => x.value === k);
    return opt ? t(opt.labelKey) : k;
  };

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

  // ─── Expense summary report (Costs tab → Report sub-tab) ─────────────────
  const expenseSummary = useVehicleExpenseSummaryState({
    detailId,
    active: detailTab === "costs" && costsSubTab === "report",
    canEdit,
  });
  const sumYear = expenseSummary.sumYear;
  const setSumYear = expenseSummary.setSumYear;
  const sumMonth = expenseSummary.sumMonth;
  const setSumMonth = expenseSummary.setSumMonth;
  const sumVehicleId = expenseSummary.sumVehicleId;
  const setSumVehicleId = expenseSummary.setSumVehicleId;
  const sumBranchId = expenseSummary.sumBranchId;
  const setSumBranchId = expenseSummary.setSumBranchId;
  const applyExpenseReportFilters = expenseSummary.applyFilters;
  const summaryRows = expenseSummary.summaryRows;
  const summaryPending = expenseSummary.summaryPending;
  const summaryQueryEnabled = expenseSummary.queryEnabled;



  // ─── Expense modal hook ───────────────────────────────────────────────────
  const expense = useVehicleExpenseForm({
    defaultVehicleId: detailId,
    t,
  });
  const expModal = expense.modal;
  const expType = expense.type;
  const setExpType = expense.setType;
  const expAmount = expense.amount;
  const setExpAmount = expense.setAmount;
  const expCur = expense.currency;
  const setExpCur = expense.setCurrency;
  const expDate = expense.date;
  const setExpDate = expense.setDate;
  const expDesc = expense.desc;
  const setExpDesc = expense.setDesc;
  const expBranchId = expense.branchId;
  const setExpBranchId = expense.setBranchId;
  const expBranchPaySource = expense.branchPaySource;
  const setExpBranchPaySource = expense.setBranchPaySource;
  const expPatronPay = expense.patronPay;
  const setExpPatronPay = expense.setPatronPay;
  const openAddExpenseForVehicle = expense.openAddFor;
  const openAddExpense = expense.openAdd;
  const openEditExpense = expense.openEdit;
  const saveExpense = expense.save;

  // ─── Insurance modal hook ─────────────────────────────────────────────────
  const insurance = useVehicleInsuranceForm({
    defaultVehicleId: detailId,
    locale,
    t,
  });
  const insModal = insurance.modal;
  const setInsModal = insurance.setModal;
  const insEditId = insurance.editId;
  const insTypeSlug = insurance.typeSlug;
  const setInsTypeSlug = insurance.setTypeSlug;
  const insTypeCustom = insurance.typeCustom;
  const setInsTypeCustom = insurance.setTypeCustom;
  const insProvSlug = insurance.provSlug;
  const setInsProvSlug = insurance.setProvSlug;
  const insProvCustom = insurance.provCustom;
  const setInsProvCustom = insurance.setProvCustom;
  const insPolicy = insurance.policy;
  const setInsPolicy = insurance.setPolicy;
  const insStart = insurance.start;
  const setInsStart = insurance.setStart;
  const insEnd = insurance.end;
  const setInsEnd = insurance.setEnd;
  const insAmount = insurance.amount;
  const setInsAmount = insurance.setAmount;
  const openAddInsuranceForVehicle = insurance.openAddFor;
  const openAddInsurance = insurance.openAdd;
  const openEditInsurance = insurance.openEdit;
  const saveInsurance = insurance.save;

  // ─── Maintenance modal hook ───────────────────────────────────────────────
  const maintenance = useVehicleMaintenanceForm({ t });
  const maintModal = maintenance.modal;
  const maintVehicleId = maintenance.vehicleId;
  const maintEditId = maintenance.editId;
  const maintServiceDate = maintenance.serviceDate;
  const setMaintServiceDate = maintenance.setServiceDate;
  const maintOdometerStr = maintenance.odometerStr;
  const setMaintOdometerStr = maintenance.setOdometerStr;
  const maintType = maintenance.type;
  const setMaintType = maintenance.setType;
  const maintWorkshop = maintenance.workshop;
  const setMaintWorkshop = maintenance.setWorkshop;
  const maintDesc = maintenance.desc;
  const setMaintDesc = maintenance.setDesc;
  const maintCost = maintenance.cost;
  const setMaintCost = maintenance.setCost;
  const maintCur = maintenance.currency;
  const setMaintCur = maintenance.setCurrency;
  const maintNextDate = maintenance.nextDate;
  const setMaintNextDate = maintenance.setNextDate;
  const maintNextKmStr = maintenance.nextKmStr;
  const setMaintNextKmStr = maintenance.setNextKmStr;
  const openAddMaintenanceForVehicle = maintenance.openAddFor;
  const openEditMaintenance = maintenance.openEdit;
  const saveMaintenance = maintenance.save;

  // ─── Odometer modal hook ──────────────────────────────────────────────────
  const odometer = useVehicleOdometerModal({ t });
  const kmModalVehicleId = odometer.vehicleId;
  const kmModalStr = odometer.str;
  const setKmModalStr = odometer.setStr;
  const kmModalEnabled = odometer.enabled;
  const kmModalVehicle = odometer.vehicle;
  const openKmModal = odometer.openFor;
  const saveKmModal = odometer.save;

  // ─── Assignment dialog hook ───────────────────────────────────────────────
  const assignment = useVehicleAssignmentDialog({ t });
  const assignDlgOpen = assignment.open;
  const setAssignDlgOpen = assignment.setOpen;
  const assignDlgVehicleId = assignment.vehicleId;
  const assignDlgMode = assignment.mode;
  const setAssignDlgMode = assignment.setMode;
  const assignDlgPersonnelId = assignment.personnelId;
  const setAssignDlgPersonnelId = assignment.setPersonnelId;
  const assignDlgBranchId = assignment.branchId;
  const setAssignDlgBranchId = assignment.setBranchId;
  const saveAssignmentDialog = assignment.save;

  const insuranceTypeSelectOptions = useMemo((): SelectOption[] => {
    return [
      { value: "", label: t("vehicles.insuranceSelectType") },
      ...VEHICLE_INSURANCE_TYPE_SLUGS.map((slug) => ({
        value: slug,
        label: t(`vehicles.insuranceTypeOptions.${slug}`),
      })),
      {
        value: VEHICLE_INSURANCE_OTHER_SLUG,
        label: t("vehicles.insuranceTypeOptions.other"),
      },
    ];
  }, [t]);

  const insuranceCompanySelectOptions = useMemo((): SelectOption[] => {
    return [
      { value: "", label: t("vehicles.insuranceSelectCompany") },
      ...VEHICLE_INSURANCE_COMPANY_SLUGS.map((slug) => ({
        value: slug,
        label: t(`vehicles.insuranceCompanyOptions.${slug}`),
      })),
      {
        value: VEHICLE_INSURANCE_OTHER_SLUG,
        label: t("vehicles.insuranceCompanyOptions.other"),
      },
    ];
  }, [t]);

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




  const openAddMaintenanceFromDetail = () => {
    if (!detailId) return;
    openAddMaintenanceForVehicle(detailId);
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
      { id: "documents", label: t("vehicles.tabDocuments") },
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
            <VehicleListPanel
              vehicles={filtered}
              search={search}
              onSearchChange={setSearch}
              canEdit={canEdit}
              isPending={isPending}
              isError={isError}
              deletePending={editForm.deleteBusy}
              locale={locale}
              vehicleStatusLabel={vehicleStatusLabel}
              insuranceBadgeLabel={insuranceBadgeLabel}
              onAddVehicle={openAdd}
              onOpenDetail={(r) => {
                setDetailId(r.id);
                setDetailTab("overview");
              }}
              onEdit={openEdit}
              onDelete={confirmDeleteVehicle}
              onAddMaintenance={openAddMaintenanceForVehicle}
              onEditOdometer={openKmModal}
              onChangeAssignment={openAssignmentFromListRow}
              onAddExpense={openAddExpenseForVehicle}
              onAddInsurance={openAddInsuranceForVehicle}
              t={t}
            />
          </Card>
        }
      />

      <VehicleEditModal
        state={editForm}
        personnelOptions={personnelRows}
        branchOptions={branchRows}
        nested={detailId != null}
        locale={locale}
        t={t}
      />

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
              <VehicleDetailOverviewTab
                detail={detail}
                canEdit={canEdit}
                locale={locale}
                photoCacheBust={photoCacheBust}
                setPhotoCacheBust={setPhotoCacheBust}
                uploadPhotoMut={uploadVehiclePhotoMut}
                deletePhotoMut={deleteVehiclePhotoMut}
                onChangeAssignment={openAssignmentDialogFromDetail}
                insuranceBadgeLabel={insuranceBadgeLabel}
                t={t}
              />
            ) : null}

            {detailTab === "service" ? (
              <VehicleDetailServiceTab
                vehicleId={detail.id}
                serviceIntervalKm={detail.serviceIntervalKm}
                serviceIntervalMonths={detail.serviceIntervalMonths}
                maintenances={detail.maintenances ?? []}
                filterType={maintLogFilterType}
                filterOptions={maintenanceLogFilterSelectOptions}
                filteredMaintenances={filteredVehicleMaintenances}
                canEdit={canEdit}
                locale={locale}
                onAddMaintenance={openAddMaintenanceFromDetail}
                onFilterTypeChange={setMaintLogFilterType}
                onEditMaintenance={openEditMaintenance}
                onDeleteMaintenance={(id) =>
                  maintenance.askDelete(id, detail.id)
                }
                t={t}
              />
            ) : null}

            {detailTab === "assignments" ? (
              <VehicleDetailAssignmentsTab
                assignments={detail.assignments}
                canEdit={canEdit}
                locale={locale}
                onOpenAssignmentDialog={openAssignmentDialogFromDetail}
                t={t}
              />
            ) : null}

            {detailTab === "documents" ? (
              <VehicleDetailDocumentsTab
                vehicleId={detail.id}
                documents={vehicleDocuments}
                pending={vehicleDocumentsPending}
                error={vehicleDocumentsError}
                errorValue={vehicleDocumentsErrorValue}
                openingId={openingVehicleDocId}
                canEdit={canEdit}
                documentKindLabel={vehicleDocKindLabel}
                onOpenAddSheet={() => {
                  setDocKind("REGISTRATION");
                  setDocNotes("");
                  setDocFile(null);
                  setDocFormError(null);
                  setDocFormOpen(true);
                }}
                onOpenDocument={openVehicleDoc}
                onAskDelete={setDocDeleteId}
                t={t}
              />
            ) : null}

            {detailTab === "insurances" ? (
              <VehicleDetailInsurancesTab
                insurances={detail.insurances}
                canEdit={canEdit}
                locale={locale}
                onAddInsurance={openAddInsurance}
                onEditInsurance={openEditInsurance}
                onDeleteInsurance={(id) => insurance.askDelete(id, detail.id)}
                t={t}
              />
            ) : null}

            {detailTab === "costs" ? (
              <VehicleDetailCostsTab
                expenses={detail.expenses}
                subTab={costsSubTab}
                onSubTabChange={setCostsSubTab}
                canEdit={canEdit}
                locale={locale}
                onAddExpense={openAddExpense}
                onEditExpense={openEditExpense}
                onDeleteExpense={(id) => expense.askDelete(id, detail.id)}
                sumYear={sumYear}
                sumMonth={sumMonth}
                sumVehicleId={sumVehicleId}
                sumBranchId={sumBranchId}
                onSumYearChange={setSumYear}
                onSumMonthChange={setSumMonth}
                onSumVehicleIdChange={setSumVehicleId}
                onSumBranchIdChange={setSumBranchId}
                onApplyReportFilters={applyExpenseReportFilters}
                vehicleOptions={rows}
                branchOptions={branchRows}
                summaryRows={summaryRows}
                summaryPending={summaryPending}
                summaryQueryEnabled={summaryQueryEnabled}
                t={t}
              />
            ) : null}

            {canEdit && detailTab === "audit" ? (
              <VehicleDetailAuditTab vehicleId={detail.id} enabled={detailTab === "audit"} />
            ) : null}
            </div>
          </div>
        )}
      </Modal>

      <VehicleInsuranceModal
        state={insurance}
        typeOptions={insuranceTypeSelectOptions}
        providerOptions={insuranceCompanySelectOptions}
        locale={locale}
        t={t}
      />

      <VehicleExpenseModal
        state={expense}
        branchOptions={branchRows}
        canEdit={canEdit}
        t={t}
      />

      <VehicleMaintenanceModal
        state={maintenance}
        typeOptions={maintenanceTypeFormSelectOptions}
        t={t}
      />

      <VehicleOdometerModal
        state={odometer}
        nested={detailId != null}
        t={t}
      />

      <VehicleAssignDialog
        state={assignment}
        vehicles={rows}
        personnelOptions={personnelRows}
        branchOptions={branchRows}
        nested={detailId != null}
        t={t}
      />

      <VehicleDocumentUploadSheet state={docForm} t={t} />
      <VehicleDocumentDeleteModal state={docForm} t={t} />
    </>
  );
}
