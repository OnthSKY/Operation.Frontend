"use client";

import {
  branchKeys,
  useBranchDocuments,
  useDeleteBranchDocument,
  useUploadBranchDocument,
} from "@/modules/branch/hooks/useBranchQueries";
import { useQueryClient } from "@tanstack/react-query";
import { confirmUndoableDelete } from "@/shared/lib/confirm-undoable-delete";
import { apiUrl } from "@/shared/api/client";
import { fetchBranchDocumentBlob } from "@/modules/branch/api/branch-documents-api";
import { ImagePreview } from "@/modules/documents/components/ImagePreview";
import { PdfBlobPreview } from "@/modules/documents/components/PdfBlobPreview";
import { useI18n } from "@/i18n/context";
import { isOrderAccountStatementPdfNote } from "@/modules/order-account-statement/lib/parse-order-account-document-metadata";
import type { BranchDocument, BranchDocumentKind } from "@/types/branch-document";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { Tooltip } from "@/shared/ui/Tooltip";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass, DownloadIcon, EyeIcon } from "@/shared/ui/EyeIcon";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { useEffect, useMemo, useState, type FocusEventHandler } from "react";

/** Belge dosya türü için kompakt sol-üst tile (PDF/IMG/etc). */
function DocFileTile({ contentType }: { contentType: string }) {
  const ct = contentType.toLowerCase();
  const isPdf = ct === "application/pdf";
  const isImage = ct.startsWith("image/");
  const label = isPdf ? "PDF" : isImage ? "IMG" : "···";
  const bar = isPdf
    ? "from-rose-600 to-red-500"
    : isImage
      ? "from-violet-600 to-purple-500"
      : "from-zinc-500 to-zinc-600";
  const frame = isPdf ? "border-rose-200" : isImage ? "border-violet-200" : "border-zinc-200";
  return (
    <div
      className={`flex h-12 w-10 shrink-0 flex-col overflow-hidden rounded-md border bg-white shadow-sm sm:h-14 sm:w-11 ${frame}`}
      aria-hidden
    >
      <div className={`flex h-5 shrink-0 items-center justify-center bg-gradient-to-r ${bar} sm:h-[22px]`}>
        <span className="text-[8px] font-bold tracking-wide text-white sm:text-[9px]">{label}</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-0.5 px-1.5 py-1.5 sm:gap-1 sm:px-2 sm:py-2">
        <div className={`h-0.5 rounded-sm sm:h-1 ${isPdf ? "bg-rose-100/90" : isImage ? "bg-violet-100/90" : "bg-zinc-100"}`} />
        <div className={`h-0.5 rounded-sm sm:h-1 ${isPdf ? "bg-rose-50" : isImage ? "bg-violet-50" : "bg-zinc-50"}`} />
        <div className={`h-0.5 w-3/4 rounded-sm sm:h-1 ${isPdf ? "bg-rose-50/80" : isImage ? "bg-violet-50/80" : "bg-zinc-50"}`} />
      </div>
    </div>
  );
}

const UPLOAD_MODAL_TITLE_ID = "branch-doc-upload-title";
const DELETE_MODAL_TITLE_ID = "branch-doc-delete-title";

const KIND_OPTIONS: { value: BranchDocumentKind; labelKey: string }[] = [
  { value: "TAX_BASE", labelKey: "branch.docKindTaxBase" },
  { value: "WORK_PERMIT", labelKey: "branch.docKindWorkPermit" },
  { value: "AGRICULTURE_CERT", labelKey: "branch.docKindAgricultureCert" },
  { value: "OTHER", labelKey: "branch.docKindOther" },
];

const NOOP_BLUR: FocusEventHandler<HTMLInputElement> = () => {};

/** Türetilmiş cari/sevkiyat PDF'leri kendi grubunda toplanır; gerisi belge türüne göre. */
const SHIPMENT_STATEMENT_GROUP = "SHIPMENT_STATEMENT";
const GROUP_ORDER: string[] = [
  SHIPMENT_STATEMENT_GROUP,
  "SHIPMENT_DELIVERY_SLIP",
  "TAX_BASE",
  "WORK_PERMIT",
  "AGRICULTURE_CERT",
  "OTHER",
];

function isPdfV2Note(note: string | null | undefined): boolean {
  return /(?:^|[;,\s·])version=v2(?:$|[;,\s·])/i.test(String(note ?? ""));
}

type Props = { branchId: number; active: boolean; readOnly?: boolean };

export function BranchDetailDocumentsTab({ branchId, active, readOnly = false }: Props) {
  const { t, locale } = useI18n();
  const { data = [], isPending, isError, error, refetch } = useBranchDocuments(branchId, active);
  const uploadMut = useUploadBranchDocument(branchId);
  const deleteMut = useDeleteBranchDocument(branchId);
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<BranchDocumentKind>("TAX_BASE");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<BranchDocument | null>(null);
  const [loadingDocAction, setLoadingDocAction] = useState<{
    id: number;
    mode: "view" | "start";
  } | null>(null);

  const selectedFileType = file?.type?.toLowerCase() ?? "";
  const filePreviewMode = useMemo<"image" | "pdf" | "other">(() => {
    if (!file) return "other";
    if (selectedFileType.startsWith("image/")) return "image";
    if (selectedFileType === "application/pdf") return "pdf";
    return "other";
  }, [file, selectedFileType]);
  const filePreviewUrl = useMemo(() => {
    if (!file || filePreviewMode === "other") return null;
    return URL.createObjectURL(file);
  }, [file, filePreviewMode]);

  useEffect(() => {
    if (!filePreviewUrl) return;
    return () => URL.revokeObjectURL(filePreviewUrl);
  }, [filePreviewUrl]);

  const openCreate = () => {
    setKind("TAX_BASE");
    setNotes("");
    setFile(null);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormError(null);
    setFile(null);
  };

  const submitUpload = async () => {
    setFormError(null);
    if (!file || file.size <= 0) {
      setFormError(t("branch.documentsFileRequired"));
      return;
    }
    try {
      await uploadMut.mutateAsync({
        file,
        kind,
        notes: notes.trim() || null,
      });
      notify.success(t("toast.branchDocumentUploaded"));
      closeForm();
    } catch (e) {
      setFormError(toErrorMessage(e));
    }
  };

  const confirmDelete = () => {
    if (deleteId == null) return;
    const targetId = deleteId;
    setDeleteId(null);
    confirmUndoableDelete<{ id: number }>({
      qc,
      queryKeyPrefix: branchKeys.documents(branchId),
      targetId,
      deleteFn: () => deleteMut.mutateAsync(targetId),
      successMessage: t("toast.branchDocumentDeleted"),
    });
  };

  const startDocumentAction = async (documentId: number) => {
    setLoadingDocAction({ id: documentId, mode: "start" });
    try {
      const { blob, contentType } = await fetchBranchDocumentBlob(branchId, documentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext =
        contentType === "application/pdf"
          ? "pdf"
          : contentType.includes("png")
            ? "png"
            : contentType.includes("webp")
              ? "webp"
              : "jpg";
      a.download = `branch-${branchId}-doc-${documentId}.${ext}`;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setLoadingDocAction(null);
    }
  };

  const kindLabel = (k: BranchDocumentKind) => {
    const opt = KIND_OPTIONS.find((o) => o.value === k);
    return opt ? t(opt.labelKey) : k;
  };
  const summarizeNotes = (value: string) => {
    const parts = value
      .split("·")
      .map((part) => part.trim())
      .filter(Boolean);
    return parts[0] ?? value.trim();
  };
  const extractShipmentNo = (row: { notes: string | null; originalFileName: string | null }) => {
    const source = `${row.notes ?? ""} ${row.originalFileName ?? ""}`;
    const match =
      source.match(/(?:sevkiyatNo|shipmentNo|irsaliyeNo|invoiceNo)\s*=\s*([^\s·,;]+)/i) ??
      source.match(/(?:sevkiyat|shipment|irsaliye)\s*[:#-]?\s*([A-Z0-9-]{4,})/i);
    return match?.[1] ?? null;
  };
  const isUploadDirty =
    kind !== "TAX_BASE" ||
    notes.trim() !== "" ||
    file != null;
  const requestUploadClose = useDirtyGuard({
    isDirty: isUploadDirty,
    isBlocked: uploadMut.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose: closeForm,
  });

  const groupLabel = (key: string) => {
    if (key === SHIPMENT_STATEMENT_GROUP) return t("branch.documentsGroupShipmentStatement");
    if (key === "SHIPMENT_DELIVERY_SLIP") return t("branch.docKindShipmentDeliverySlip");
    return kindLabel(key as BranchDocumentKind);
  };

  /** Belgeleri grupla (türetilmiş cari/sevkiyat PDF'leri ayrı grup); grup içinde en yeni üstte. */
  const groupedDocuments = useMemo(() => {
    const map = new Map<string, BranchDocument[]>();
    for (const row of data) {
      const key = isOrderAccountStatementPdfNote(row.notes) ? SHIPMENT_STATEMENT_GROUP : row.kind;
      const arr = map.get(key);
      if (arr) arr.push(row);
      else map.set(key, [row]);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0));
    }
    const orderedKeys = [
      ...GROUP_ORDER.filter((k) => map.has(k)),
      ...[...map.keys()].filter((k) => !GROUP_ORDER.includes(k)),
    ];
    return orderedKeys.map((key) => ({ key, items: map.get(key)! }));
  }, [data]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">{t("branch.documentsIntro")}</p>
        {!readOnly ? (
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px] min-w-[44px] px-3 py-2 text-sm"
            onClick={openCreate}
          >
            {t("branch.documentsAdd")}
          </Button>
        ) : null}
      </div>

      {isError ? (
        <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
      ) : null}

      {isPending ? (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3"
            >
              <div className="h-12 w-10 rounded-md bg-zinc-200/80 sm:h-14 sm:w-11" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-zinc-200/80" />
                <div className="h-3 w-1/2 rounded bg-zinc-100" />
                <div className="h-3 w-3/4 rounded bg-zinc-100/80" />
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branch.documentsEmpty")}</p>
      ) : (
        <div className="space-y-5">
          {groupedDocuments.map((group) => (
            <section key={group.key} className="space-y-2">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-1.5">
                <h3 className="text-sm font-semibold text-zinc-800">{groupLabel(group.key)}</h3>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 tabular-nums">
                  {group.items.length}
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {group.items.map((row) => {
                  const shipmentNo = extractShipmentNo(row);
                  const isStatement = group.key === SHIPMENT_STATEMENT_GROUP;
                  const isV2 = isStatement && isPdfV2Note(row.notes);
                  return (
                    <li
                      key={row.id}
                      className="group flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 hover:shadow-sm"
                    >
                      <DocFileTile contentType={row.contentType} />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(row)}
                          className="block w-full truncate text-left font-medium text-zinc-900 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
                          title={row.originalFileName ?? undefined}
                        >
                          {row.originalFileName ?? row.contentType}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
                            {groupLabel(group.key)}
                          </span>
                          {isStatement ? (
                            <span
                              className={
                                isV2
                                  ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                                  : "rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800"
                              }
                            >
                              {isV2
                                ? t("branch.documentsBadgeWithReceipts")
                                : t("branch.documentsBadgeOriginal")}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                            {formatLocaleDateTime(row.createdAt, locale)}
                          </span>
                          {shipmentNo ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                              {t("branch.documentsShipmentNo")}: {shipmentNo}
                            </span>
                          ) : null}
                        </div>
                        {row.notes ? (
                          <div className="mt-1 line-clamp-2 text-xs text-zinc-500" title={row.notes}>
                            {summarizeNotes(row.notes)}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-start">
                        <Tooltip content={t("branch.documentsView")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className={detailOpenIconButtonClass}
                            aria-label={t("branch.documentsView")}
                            title={t("branch.documentsView")}
                            onClick={() => setPreviewDoc(row)}
                          >
                            <EyeIcon />
                          </Button>
                        </Tooltip>
                        <Tooltip content={t("branch.documentsStartAction")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className={detailOpenIconButtonClass}
                            disabled={loadingDocAction?.id === row.id}
                            aria-label={t("branch.documentsStartAction")}
                            title={t("branch.documentsStartAction")}
                            onClick={() => void startDocumentAction(row.id)}
                          >
                            <DownloadIcon />
                          </Button>
                        </Tooltip>
                        {!readOnly ? (
                          <Tooltip content={t("common.delete")} delayMs={200}>
                            <Button
                              type="button"
                              variant="ghost"
                              className={trashIconActionButtonClass}
                              aria-label={t("common.delete")}
                              title={t("common.delete")}
                              onClick={() => setDeleteId(row.id)}
                            >
                              <TrashIcon />
                            </Button>
                          </Tooltip>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={requestUploadClose}
        titleId={UPLOAD_MODAL_TITLE_ID}
        title={t("branch.documentsUploadTitle")}
        closeButtonLabel={t("common.close")}
        nested
        className="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitUpload();
          }}
        >
          <ModalFormLayout
            body={
              <FormSection>
                <Select
                  name="branchDocumentKind"
                  label={t("branch.documentsKindLabel")}
                  value={kind}
                  onChange={(e) => setKind(e.target.value as BranchDocumentKind)}
                  onBlur={NOOP_BLUR}
                  options={KIND_OPTIONS.map((o) => ({
                    value: o.value,
                    label: t(o.labelKey),
                  }))}
                  menuZIndex={320}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    {t("branch.documentsFileLabel")}
                  </label>
                  <label
                    htmlFor="branch-doc-file-input"
                    className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-center text-sm text-zinc-600 transition-colors hover:border-zinc-500 hover:bg-zinc-100"
                  >
                    {file ? file.name : t("branch.documentsFileLabel")}
                  </label>
                  <input
                    id="branch-doc-file-input"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-2">
                      {filePreviewMode === "image" && filePreviewUrl ? (
                        <img
                          src={filePreviewUrl}
                          alt={file.name}
                          className="h-40 w-full rounded-lg object-cover"
                        />
                      ) : filePreviewMode === "pdf" && filePreviewUrl ? (
                        <iframe
                          src={filePreviewUrl}
                          title={file.name}
                          className="h-48 w-full rounded-lg border border-zinc-200"
                        />
                      ) : (
                        <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
                          {file.name}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-zinc-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    {t("branch.documentsNotesLabel")}
                  </label>
                  <textarea
                    className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    placeholder={t("branch.documentsNotesPlaceholder")}
                  />
                </div>
                {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
              </FormSection>
            }
            footer={
              <>
                <Button type="button" variant="secondary" onClick={requestUploadClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="primary" disabled={uploadMut.isPending}>
                  {uploadMut.isPending ? t("common.loading") : t("branch.documentsUploadSubmit")}
                </Button>
              </>
            }
          />
        </form>
      </Modal>

      <Modal
        open={previewDoc != null}
        onClose={() => setPreviewDoc(null)}
        titleId="branch-doc-preview-title"
        title={previewDoc?.originalFileName ?? t("branch.documentsView")}
        description={
          previewDoc
            ? `${kindLabel(previewDoc.kind)} · ${formatLocaleDateTime(previewDoc.createdAt, locale)}`
            : undefined
        }
        closeButtonLabel={t("common.close")}
        nested
        wide
        wideFixedHeight
      >
        {previewDoc ? (
          (() => {
            const previewUrl = apiUrl(`/branches/${branchId}/documents/${previewDoc.id}/file`);
            const ct = previewDoc.contentType.toLowerCase();
            if (ct.startsWith("image/")) {
              return (
                <ImagePreview
                  url={previewUrl}
                  alt={previewDoc.originalFileName ?? previewDoc.contentType}
                  mimeType={previewDoc.contentType}
                  className="h-[70vh]"
                />
              );
            }
            if (ct === "application/pdf") {
              return (
                <PdfBlobPreview
                  url={previewUrl}
                  title={previewDoc.originalFileName ?? "PDF"}
                  className="h-[70vh] w-full rounded-lg border border-zinc-200"
                />
              );
            }
            return (
              <div className="flex h-[40vh] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-600">
                {t("documents.previewNotSupported")}
              </div>
            );
          })()
        ) : null}
        {previewDoc?.notes ? (
          <p className="mt-3 text-xs leading-relaxed text-zinc-500" title={previewDoc.notes}>
            {previewDoc.notes}
          </p>
        ) : null}
      </Modal>

      <Modal
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        titleId={DELETE_MODAL_TITLE_ID}
        title={t("branch.documentsDeleteTitle")}
        closeButtonLabel={t("common.close")}
        nested
        className="max-w-md"
      >
        <p className="text-sm text-zinc-600">{t("branch.documentsDeleteConfirm")}</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setDeleteId(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700"
            disabled={deleteMut.isPending}
            onClick={() => void confirmDelete()}
          >
            {deleteMut.isPending ? t("common.loading") : t("common.delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
