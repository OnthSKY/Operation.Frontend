"use client";

import {
  useBranchDocuments,
  useDeleteBranchDocument,
  useUploadBranchDocument,
} from "@/modules/branch/hooks/useBranchQueries";
import { fetchBranchDocumentBlob } from "@/modules/branch/api/branch-documents-api";
import { useI18n } from "@/i18n/context";
import type { BranchDocumentKind } from "@/types/branch-document";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { useEffect, useMemo, useState, type FocusEventHandler } from "react";

const UPLOAD_MODAL_TITLE_ID = "branch-doc-upload-title";
const DELETE_MODAL_TITLE_ID = "branch-doc-delete-title";

const KIND_OPTIONS: { value: BranchDocumentKind; labelKey: string }[] = [
  { value: "TAX_BASE", labelKey: "branch.docKindTaxBase" },
  { value: "WORK_PERMIT", labelKey: "branch.docKindWorkPermit" },
  { value: "AGRICULTURE_CERT", labelKey: "branch.docKindAgricultureCert" },
  { value: "OTHER", labelKey: "branch.docKindOther" },
];

const NOOP_BLUR: FocusEventHandler<HTMLInputElement> = () => {};

type Props = { branchId: number; active: boolean; readOnly?: boolean };

export function BranchDetailDocumentsTab({ branchId, active, readOnly = false }: Props) {
  const { t, locale } = useI18n();
  const { data = [], isPending, isError, error, refetch } = useBranchDocuments(branchId, active);
  const uploadMut = useUploadBranchDocument(branchId);
  const deleteMut = useDeleteBranchDocument(branchId);

  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<BranchDocumentKind>("TAX_BASE");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

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

  const confirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      notify.success(t("toast.branchDocumentDeleted"));
      setDeleteId(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const openFile = async (documentId: number) => {
    setOpeningId(documentId);
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
      setOpeningId(null);
    }
  };

  const kindLabel = (k: BranchDocumentKind) => {
    const opt = KIND_OPTIONS.find((o) => o.value === k);
    return opt ? t(opt.labelKey) : k;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">{t("branch.documentsIntro")}</p>
        {!readOnly ? (
          <Button
            type="button"
            variant="primary"
            className="min-h-10 px-3 py-2 text-sm"
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
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branch.documentsEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {data.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-900">{kindLabel(row.kind)}</div>
                <div className="truncate text-sm text-zinc-600">
                  {row.originalFileName ?? row.contentType}
                </div>
                {row.notes ? (
                  <div className="mt-1 text-sm text-zinc-500">{row.notes}</div>
                ) : null}
                <div className="mt-1 text-xs text-zinc-400">
                  {formatLocaleDateTime(row.createdAt, locale)}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10 px-3 py-2 text-sm"
                  disabled={openingId === row.id}
                  onClick={() => void openFile(row.id)}
                >
                  {openingId === row.id ? t("common.loading") : t("branch.documentsOpen")}
                </Button>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-10 px-3 py-2 text-sm"
                    onClick={() => setDeleteId(row.id)}
                  >
                    {t("common.delete")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        titleId={UPLOAD_MODAL_TITLE_ID}
        title={t("branch.documentsUploadTitle")}
        closeButtonLabel={t("common.close")}
        nested
        className="max-w-lg"
      >
        <div className="space-y-3 p-1">
          <div>
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
          </div>
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
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={uploadMut.isPending}
              onClick={() => void submitUpload()}
            >
              {uploadMut.isPending ? t("common.loading") : t("branch.documentsUploadSubmit")}
            </Button>
          </div>
        </div>
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
