"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import {
  useBranchNotes,
  useCreateBranchNote,
  useDeleteBranchNote,
  useUpdateBranchNote,
} from "@/modules/branch/hooks/useBranchQueries";
import type { BranchNote } from "@/types/branch-note";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useState } from "react";

const FORM_TITLE_ID = "branch-note-form-title";

type Props = { branchId: number; active: boolean; readOnly?: boolean };

export function BranchNotesTab({ branchId, active, readOnly = false }: Props) {
  const { t, locale } = useI18n();
  const { data = [], isPending, isError, error, refetch } = useBranchNotes(branchId, active);

  const createMut = useCreateBranchNote(branchId);
  const updateMut = useUpdateBranchNote(branchId);
  const deleteMut = useDeleteBranchNote(branchId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BranchNote | null>(null);
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const openCreate = () => {
    setEditing(null);
    setBody("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (row: BranchNote) => {
    setEditing(row);
    setBody(row.body);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const submitForm = async () => {
    setFormError(null);
    const trimmed = body.trim();
    if (!trimmed) {
      setFormError(t("branch.notesBodyRequired"));
      return;
    }
    if (trimmed.length > 4000) {
      setFormError(t("branch.notesBodyTooLong"));
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ noteId: editing.id, body: { body: trimmed } });
        notify.success(t("toast.branchNoteUpdated"));
      } else {
        await createMut.mutateAsync({ body: trimmed });
        notify.success(t("toast.branchNoteSaved"));
      }
      closeForm();
    } catch (e) {
      setFormError(toErrorMessage(e));
    }
  };
  const isFormDirty =
    body.trim() !== (editing?.body?.trim() ?? "");
  const requestFormClose = useDirtyGuard({
    isDirty: isFormDirty,
    isBlocked: createMut.isPending || updateMut.isPending,
    confirmMessage: t("common.modalConfirmOutsideCloseMessage"),
    onClose: closeForm,
  });

  const confirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      notify.success(t("toast.branchNoteDeleted"));
      setDeleteId(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-zinc-600">{t("branch.notesHint")}</p>
        <div className="flex flex-wrap gap-2">
          {!readOnly ? (
            <Button type="button" className="min-h-11" onClick={openCreate}>
              {t("branch.notesAdd")}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="min-h-11" onClick={() => void refetch()}>
            {t("branch.filterApplyRefresh")}
          </Button>
        </div>
      </div>

      {readOnly ? (
        <p className="text-xs text-zinc-500">{t("branch.notesReadOnlyHint")}</p>
      ) : null}

      {isError ? <p className="text-sm text-red-600">{toErrorMessage(error)}</p> : null}
      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !data.length ? (
        <p className="text-sm text-zinc-600">{t("branch.notesEmpty")}</p>
      ) : (
        <ol className="list-decimal space-y-3 border-t border-zinc-100 pt-3 pl-5 sm:pl-6">
          {data.map((row) => (
            <li key={row.id} className="text-sm text-zinc-900">
              <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="whitespace-pre-wrap break-words">{row.body}</p>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <span className="text-xs text-zinc-500">
                    {formatLocaleDateTime(row.updatedAt || row.createdAt, locale)}
                  </span>
                  {!readOnly ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" className="min-h-9 text-xs" onClick={() => openEdit(row)}>
                        {t("branch.notesEdit")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className={cn("min-h-9 text-xs text-red-700 hover:bg-red-50")}
                        onClick={() => setDeleteId(row.id)}
                      >
                        {t("branch.notesDelete")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Modal
        open={formOpen}
        onClose={requestFormClose}
        titleId={FORM_TITLE_ID}
        title={editing ? t("branch.notesEditTitle") : t("branch.notesAddTitle")}
        closeButtonLabel={t("common.close")}
        nested
        className="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm();
          }}
        >
          <ModalFormLayout
            body={
              <FormSection>
                <label className="text-sm font-medium text-zinc-700">{t("branch.notesBodyLabel")}</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  className="min-h-[8rem] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  maxLength={4000}
                  aria-invalid={Boolean(formError)}
                />
                {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
              </FormSection>
            }
            footer={
              <>
                <Button type="button" variant="secondary" onClick={requestFormClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {editing ? t("common.save") : t("branch.notesAdd")}
                </Button>
              </>
            }
          />
        </form>
      </Modal>

      <Modal
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        titleId="branch-note-delete-title"
        title={t("branch.notesDelete")}
        closeButtonLabel={t("common.close")}
        nested
        className="max-w-md"
      >
        <p className="text-sm text-zinc-800">{t("branch.notesDeleteAsk")}</p>
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
            {t("branch.notesDeleteConfirm")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
