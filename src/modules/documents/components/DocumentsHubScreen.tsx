"use client";

import { useI18n } from "@/i18n/context";
import { useDocumentsHubQuery } from "@/modules/documents/hooks/useDocumentsHubQuery";
import type { DocumentsHubRow } from "@/modules/documents/types";
import { useBranchesList, useUploadBranchDocument } from "@/modules/branch/hooks/useBranchQueries";
import {
  defaultPersonnelListFilters,
  usePersonnelList,
  useUploadNationalIdPhotos,
  useUploadPersonnelYearClosurePdf,
  useUploadProfilePhotos,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { notify } from "@/shared/lib/notify";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type { BranchDocumentKind } from "@/types/branch-document";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FocusEventHandler } from "react";

const NOOP_BLUR: FocusEventHandler<HTMLInputElement> = () => {};

export function DocumentsHubScreen() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [openError, setOpenError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("BRANCH_DOCUMENT");
  const [uploadBranchId, setUploadBranchId] = useState("");
  const [uploadBranchKind, setUploadBranchKind] = useState<BranchDocumentKind>("OTHER");
  const [uploadPersonnelId, setUploadPersonnelId] = useState("");
  const [uploadNationalIdSide, setUploadNationalIdSide] = useState<"front" | "back">("front");
  const [uploadProfileSlot, setUploadProfileSlot] = useState<"1" | "2">("1");
  const [uploadYear, setUploadYear] = useState(String(new Date().getFullYear()));
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { data: unifiedRows = [], isPending: loading } = useDocumentsHubQuery();
  const { data: branches = [] } = useBranchesList();
  const { data: personnelList } = usePersonnelList(defaultPersonnelListFilters);
  const branchUploadMut = useUploadBranchDocument(
    Number.parseInt(uploadBranchId, 10) || 0,
  );
  const nationalIdUploadMut = useUploadNationalIdPhotos();
  const profileUploadMut = useUploadProfilePhotos();
  const yearClosureUploadMut = useUploadPersonnelYearClosurePdf(
    Number.parseInt(uploadPersonnelId, 10) || 0,
  );

  const uploadBusy =
    branchUploadMut.isPending ||
    nationalIdUploadMut.isPending ||
    profileUploadMut.isPending ||
    yearClosureUploadMut.isPending;

  const filteredRows = useMemo<DocumentsHubRow[]>(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return unifiedRows.filter((r) => {
      if (category !== "ALL" && r.category !== category) return false;
      if (!q) return true;
      return r.searchText.toLocaleLowerCase("tr-TR").includes(q);
    });
  }, [unifiedRows, query, category]);
  const selectedRow = useMemo(() => {
    if (filteredRows.length === 0) return null;
    return filteredRows.find((r) => r.id === selectedId) ?? filteredRows[0];
  }, [filteredRows, selectedId]);

  const categoryOptions = [
    { value: "ALL", label: t("documents.categoryAll") },
    { value: "BRANCH_DOCUMENT", label: t("documents.categoryBranch") },
    { value: "VEHICLE_DOCUMENT", label: t("documents.categoryVehicle") },
    { value: "VEHICLE_INSURANCE_POLICY", label: t("documents.categoryVehicleInsurancePolicy") },
    { value: "PERSONNEL_NATIONAL_ID", label: t("documents.categoryPersonnelNationalId") },
    { value: "PERSONNEL_PROFILE", label: t("documents.categoryPersonnelProfile") },
    { value: "PERSONNEL_YEAR_CLOSURE", label: t("documents.categoryPersonnelYearClosure") },
    { value: "WAREHOUSE_INBOUND_INVOICE", label: t("documents.categoryWarehouseInboundInvoice") },
    { value: "WAREHOUSE_OUTBOUND_INVOICE", label: t("documents.categoryWarehouseOutboundInvoice") },
  ];
  const uploadCategoryOptions = categoryOptions.filter(
    (opt) =>
      opt.value !== "ALL" &&
      opt.value !== "WAREHOUSE_INBOUND_INVOICE" &&
      opt.value !== "WAREHOUSE_OUTBOUND_INVOICE"
  );
  const branchKindOptions: { value: BranchDocumentKind; label: string }[] = [
    { value: "TAX_BASE", label: t("documents.branchKindTaxBase") },
    { value: "WORK_PERMIT", label: t("documents.branchKindWorkPermit") },
    { value: "AGRICULTURE_CERT", label: t("documents.branchKindAgricultureCert") },
    { value: "OTHER", label: t("documents.branchKindOther") },
  ];

  const branchOptions = branches.map((b) => ({ value: String(b.id), label: b.name }));
  const personnelOptions = (personnelList?.items ?? []).map((p) => ({
    value: String(p.id),
    label: p.fullName,
  }));

  const openQuickAdd = () => {
    const initialCategory =
      category !== "ALL" &&
      category !== "WAREHOUSE_INBOUND_INVOICE" &&
      category !== "WAREHOUSE_OUTBOUND_INVOICE"
        ? category
        : "BRANCH_DOCUMENT";
    setUploadCategory(initialCategory);
    setUploadBranchKind("OTHER");
    setUploadNationalIdSide("front");
    setUploadProfileSlot("1");
    setUploadYear(String(new Date().getFullYear()));
    setUploadNotes("");
    setUploadFile(null);
    setUploadError(null);
    setUploadOpen(true);
  };
  const quickUploadDirty =
    uploadCategory !== "BRANCH_DOCUMENT" ||
    uploadBranchId.trim() !== "" ||
    uploadBranchKind !== "OTHER" ||
    uploadPersonnelId.trim() !== "" ||
    uploadNationalIdSide !== "front" ||
    uploadProfileSlot !== "1" ||
    uploadYear !== String(new Date().getFullYear()) ||
    uploadNotes.trim() !== "" ||
    uploadFile != null;
  const requestQuickUploadClose = useDirtyGuard({
    isDirty: quickUploadDirty,
    isBlocked: uploadBusy,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose: () => setUploadOpen(false),
  });

  const submitQuickAdd = async () => {
    setUploadError(null);
    if (!uploadFile || uploadFile.size <= 0) {
      setUploadError(t("documents.uploadFileRequired"));
      return;
    }
    try {
      if (uploadCategory === "BRANCH_DOCUMENT") {
        const branchId = Number.parseInt(uploadBranchId, 10);
        if (!Number.isFinite(branchId) || branchId <= 0) {
          setUploadError(t("documents.uploadBranchRequired"));
          return;
        }
        await branchUploadMut.mutateAsync({
          file: uploadFile,
          kind: uploadBranchKind,
          notes: uploadNotes.trim() || null,
        });
      } else if (uploadCategory === "PERSONNEL_NATIONAL_ID") {
        const personnelId = Number.parseInt(uploadPersonnelId, 10);
        if (!Number.isFinite(personnelId) || personnelId <= 0) {
          setUploadError(t("documents.uploadPersonnelRequired"));
          return;
        }
        await nationalIdUploadMut.mutateAsync({
          personnelId,
          input: uploadNationalIdSide === "front" ? { photoFront: uploadFile } : { photoBack: uploadFile },
        });
      } else if (uploadCategory === "PERSONNEL_PROFILE") {
        const personnelId = Number.parseInt(uploadPersonnelId, 10);
        if (!Number.isFinite(personnelId) || personnelId <= 0) {
          setUploadError(t("documents.uploadPersonnelRequired"));
          return;
        }
        await profileUploadMut.mutateAsync({
          personnelId,
          input: uploadProfileSlot === "1" ? { photo1: uploadFile } : { photo2: uploadFile },
        });
      } else if (uploadCategory === "PERSONNEL_YEAR_CLOSURE") {
        const personnelId = Number.parseInt(uploadPersonnelId, 10);
        const year = Number.parseInt(uploadYear, 10);
        if (!Number.isFinite(personnelId) || personnelId <= 0) {
          setUploadError(t("documents.uploadPersonnelRequired"));
          return;
        }
        if (!Number.isFinite(year) || year < 1990 || year > 2100) {
          setUploadError(t("documents.uploadYearInvalid"));
          return;
        }
        await yearClosureUploadMut.mutateAsync({ year, file: uploadFile });
      }

      await queryClient.invalidateQueries({ queryKey: ["documents-hub"] });
      notify.success(t("documents.uploadSuccess"));
      setUploadOpen(false);
    } catch (e) {
      setUploadError(toErrorMessage(e));
    }
  };

  const openSelectedInNewTab = () => {
    if (!selectedRow) return;
    setOpenError(null);
    const opened = window.open(selectedRow.previewUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      setOpenError(t("documents.openPopupBlocked"));
    }
  };

  const mobilePreviewBody = !selectedRow ? (
    <p className="text-sm text-zinc-500">{t("documents.empty")}</p>
  ) : selectedRow.previewMode === "image" ? (
    <img
      src={selectedRow.previewUrl}
      alt={selectedRow.subtitle}
      className="h-full w-full rounded-lg border border-zinc-200 object-contain"
    />
  ) : selectedRow.previewMode === "pdf" ? (
    <iframe
      src={selectedRow.previewUrl}
      title={selectedRow.subtitle}
      className="h-full w-full rounded-lg border border-zinc-200"
    />
  ) : (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
      {t("documents.previewNotSupported")}
    </div>
  );

  const previewBody = !selectedRow ? (
    <p className="text-sm text-zinc-500">{t("documents.empty")}</p>
  ) : selectedRow.previewMode === "image" ? (
    <img
      src={selectedRow.previewUrl}
      alt={selectedRow.subtitle}
      className="h-[48vh] w-full rounded-lg border border-zinc-200 object-contain"
    />
  ) : selectedRow.previewMode === "pdf" ? (
    <iframe
      src={selectedRow.previewUrl}
      title={selectedRow.subtitle}
      className="h-[52vh] w-full rounded-lg border border-zinc-200"
    />
  ) : (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
      {t("documents.previewNotSupported")}
    </div>
  );

  const previewPane = !selectedRow ? (
    previewBody
  ) : (
    <div className="space-y-2">
      <p className="font-medium text-zinc-900">{selectedRow.title}</p>
      <p className="text-sm text-zinc-600">{selectedRow.subtitle}</p>
      {previewBody}
    </div>
  );

  return (
    <div className="space-y-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="sticky top-0 z-10 rounded-2xl border border-zinc-200 bg-white/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:p-4">
        <h1 className="text-lg font-semibold text-zinc-900">{t("documents.pageTitle")}</h1>
        <p className="mt-1 text-sm text-zinc-600">{t("documents.pageDescription")}</p>
        <div className="mt-3 flex justify-end md:mt-4">
          <Button type="button" variant="primary" className="min-h-10 px-3 py-2 text-sm" onClick={openQuickAdd}>
            {t("documents.quickAdd")}
          </Button>
        </div>
        <div className="mt-3 grid gap-2 md:mt-4 md:grid-cols-[1fr_18rem] md:gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("documents.searchPlaceholder")}
            className="min-h-12 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2"
          />
          <Select
            name="documentsCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onBlur={NOOP_BLUR}
            options={categoryOptions}
            menuZIndex={220}
          />
        </div>
      </div>

      {openError ? <p className="text-sm text-red-600">{openError}</p> : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,34rem)]">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
        {loading ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("documents.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {filteredRows.map((r) => (
              <li
                key={r.id}
                className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3 ${
                  selectedRow?.id === r.id
                    ? "border-zinc-900 bg-zinc-100"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="min-h-11 w-full rounded-lg p-1 text-left touch-manipulation"
                    onClick={() => setSelectedId(r.id)}
                  >
                    <p className="font-medium text-zinc-900">{r.title}</p>
                    <p className="truncate text-sm text-zinc-700">{r.subtitle}</p>
                    <p className="mt-1 text-xs text-zinc-500">{r.detail}</p>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 lg:hidden"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(r.id);
                      setMobilePreviewOpen(true);
                    }}
                    aria-label={t("documents.open")}
                    title={t("documents.open")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
                    disabled={openingId === r.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenError(null);
                      setOpeningId(r.id);
                      void r
                        .download()
                        .catch((e2) => setOpenError(toErrorMessage(e2)))
                        .finally(() => setOpeningId(null));
                    }}
                    aria-label={t("documents.download")}
                    title={t("documents.download")}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="hidden rounded-2xl border border-zinc-200 bg-white p-3 lg:block">
        {previewPane}
      </div>
      </div>
      <Modal
        open={uploadOpen}
        onClose={requestQuickUploadClose}
        titleId="documents-quick-upload-title"
        title={t("documents.quickAdd")}
        className="max-w-lg"
        nested
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitQuickAdd();
          }}
        >
          <ModalFormLayout
            body={
              <FormSection>
                <Select
                  name="documentsUploadCategory"
                  label={t("documents.uploadCategoryLabel")}
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  onBlur={NOOP_BLUR}
                  options={uploadCategoryOptions}
                  menuZIndex={320}
                />

                {uploadCategory === "BRANCH_DOCUMENT" ? (
                  <>
              <Select
                name="documentsUploadBranch"
                label={t("documents.uploadBranchLabel")}
                value={uploadBranchId}
                onChange={(e) => setUploadBranchId(e.target.value)}
                onBlur={NOOP_BLUR}
                options={branchOptions}
                menuZIndex={320}
              />
              <Select
                name="documentsUploadBranchKind"
                label={t("documents.uploadBranchKindLabel")}
                value={uploadBranchKind}
                onChange={(e) => setUploadBranchKind(e.target.value as BranchDocumentKind)}
                onBlur={NOOP_BLUR}
                options={branchKindOptions}
                menuZIndex={320}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  {t("documents.uploadNotesLabel")}
                </label>
                <textarea
                  className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  maxLength={500}
                  placeholder={t("documents.uploadNotesPlaceholder")}
                />
              </div>
                  </>
                ) : null}

                {uploadCategory === "PERSONNEL_NATIONAL_ID" || uploadCategory === "PERSONNEL_PROFILE" || uploadCategory === "PERSONNEL_YEAR_CLOSURE" ? (
                  <Select
                    name="documentsUploadPersonnel"
                    label={t("documents.uploadPersonnelLabel")}
                    value={uploadPersonnelId}
                    onChange={(e) => setUploadPersonnelId(e.target.value)}
                    onBlur={NOOP_BLUR}
                    options={personnelOptions}
                    menuZIndex={320}
                  />
                ) : null}

                {uploadCategory === "PERSONNEL_NATIONAL_ID" ? (
                  <Select
              name="documentsUploadNationalIdSide"
              label={t("documents.uploadNationalIdSideLabel")}
              value={uploadNationalIdSide}
              onChange={(e) => setUploadNationalIdSide(e.target.value as "front" | "back")}
              onBlur={NOOP_BLUR}
              options={[
                { value: "front", label: t("documents.personnelNationalIdFront") },
                { value: "back", label: t("documents.personnelNationalIdBack") },
              ]}
              menuZIndex={320}
                  />
                ) : null}

                {uploadCategory === "PERSONNEL_PROFILE" ? (
                  <Select
              name="documentsUploadProfileSlot"
              label={t("documents.uploadProfileSlotLabel")}
              value={uploadProfileSlot}
              onChange={(e) => setUploadProfileSlot(e.target.value as "1" | "2")}
              onBlur={NOOP_BLUR}
              options={[
                { value: "1", label: t("documents.personnelProfilePhoto1") },
                { value: "2", label: t("documents.personnelProfilePhoto2") },
              ]}
              menuZIndex={320}
                  />
                ) : null}

                {uploadCategory === "PERSONNEL_YEAR_CLOSURE" ? (
                  <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                {t("documents.uploadYearLabel")}
              </label>
              <input
                type="number"
                min={1990}
                max={2100}
                value={uploadYear}
                onChange={(e) => setUploadYear(e.target.value)}
                className="min-h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
                  </div>
                ) : null}

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    {t("documents.uploadFileLabel")}
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    accept={uploadCategory === "PERSONNEL_YEAR_CLOSURE" ? "application/pdf,.pdf" : "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"}
                    className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
              </FormSection>
            }
            footer={
              <>
                <Button type="button" variant="secondary" onClick={requestQuickUploadClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="primary" disabled={uploadBusy}>
                  {uploadBusy ? t("common.loading") : t("documents.uploadSubmit")}
                </Button>
              </>
            }
          />
        </form>
      </Modal>
      <Modal
        open={mobilePreviewOpen}
        onClose={() => setMobilePreviewOpen(false)}
        titleId="documents-mobile-preview-title"
        title={selectedRow?.title ?? t("documents.pageTitle")}
        description={selectedRow?.subtitle}
        closeButtonLabel={t("common.close")}
        className="h-[100dvh] max-h-[100dvh] w-screen max-w-screen rounded-none border-0 lg:hidden"
        wide
      >
        <div className="flex h-full min-h-0 flex-col gap-3 p-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="min-h-0 flex-1">{mobilePreviewBody}</div>
          {selectedRow ? (
            <div className="mt-auto flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
              <Button type="button" variant="secondary" onClick={openSelectedInNewTab}>
                {t("documents.open")}
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={openingId === selectedRow.id}
                onClick={() => {
                  setOpenError(null);
                  setOpeningId(selectedRow.id);
                  void selectedRow
                    .download()
                    .catch((e) => setOpenError(toErrorMessage(e)))
                    .finally(() => setOpeningId(null));
                }}
              >
                {openingId === selectedRow.id ? t("common.loading") : t("documents.download")}
              </Button>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

