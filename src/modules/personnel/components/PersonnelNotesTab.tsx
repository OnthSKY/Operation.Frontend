"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import {
  useCreatePersonnelNote,
  useDeletePersonnelNote,
  usePersonnelNotes,
  useUpdatePersonnelNote,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import type { PersonnelNote } from "@/types/personnel-note";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useState } from "react";

const FORM_TITLE_ID = "personnel-note-form-title";

type Props = { personnelId: number; active: boolean; readOnly?: boolean };

export function PersonnelNotesTab({ personnelId, active, readOnly = false }: Props) {
  const { t, locale } = useI18n();
  const { data = [], isPending, isError, error, refetch } = usePersonnelNotes(personnelId, active);

  const createMut = useCreatePersonnelNote(personnelId);
  const updateMut = useUpdatePersonnelNote(personnelId);
  const deleteMut = useDeletePersonnelNote(personnelId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PersonnelNote | null>(null);
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const openCreate = () => {
    setEditing(null);
    setBody("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (row: PersonnelNote) => {
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
      setFormError(t("personnel.notesBodyRequired"));
      return;
    }
    if (trimmed.length > 4000) {
      setFormError(t("personnel.notesBodyTooLong"));
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ noteId: editing.id, body: { body: trimmed } });
        notify.success(t("toast.personnelNoteUpdated"));
      } else {
        await createMut.mutateAsync({ body: trimmed });
        notify.success(t("toast.personnelNoteSaved"));
      }
      closeForm();
    } catch (e) {
      setFormError(toErrorMessage(e));
    }
  };

  const confirmDelete = async () => {
    if (deleteId == null) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      notify.success(t("toast.personnelNoteDeleted"));
      setDeleteId(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-zinc-600">
          {readOnly ? t("personnel.notesReadOnlyHint") : t("personnel.notesHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          {!readOnly ? (
            <Button type="button" className="min-h-11" onClick={openCreate}>
              {t("personnel.notesAdd")}
            </Button>
          ) : null}
        </div>
      </div>

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : isError ? (
        <div className="space-y-2">
          <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
          <Button type="button" variant="secondary" className="min-h-10" onClick={() => void refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("personnel.notesEmpty")}</p>
      ) : (
        <ol className="space-y-3">
          {data.map((row) => (
            <li
              key={row.id}
              className={cn(
                "rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-sm",
                "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
              )}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="whitespace-pre-wrap text-zinc-900">{row.body}</p>
                <p className="text-xs text-zinc-500">
                  {formatLocaleDateTime(row.createdAt, locale)}
                  {row.updatedAt !== row.createdAt
                    ? ` · ${formatLocaleDateTime(row.updatedAt, locale)}`
                    : null}
                </p>
              </div>
              {!readOnly ? (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="min-h-10" onClick={() => openEdit(row)}>
                    {t("personnel.notesEdit")}
                  </Button>
                  <Button type="button" variant="secondary" className="min-h-10" onClick={() => setDeleteId(row.id)}>
                    {t("personnel.notesDelete")}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        titleId={FORM_TITLE_ID}
        title={editing ? t("personnel.notesEditTitle") : t("personnel.notesAddTitle")}
        closeButtonLabel={t("common.close")}
        nested
        className="max-w-lg"
      >
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-zinc-700">{t("personnel.notesBodyLabel")}</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="min-h-[8rem] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            maxLength={4000}
            aria-invalid={Boolean(formError)}
          />
          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={createMut.isPending || updateMut.isPending}
              onClick={() => void submitForm()}
            >
              {editing ? t("common.save") : t("personnel.notesAdd")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        titleId="personnel-note-delete-title"
        title={t("personnel.notesDelete")}
        closeButtonLabel={t("common.close")}
        nested
        className="max-w-md"
      >
        <p className="text-sm text-zinc-800">{t("personnel.notesDeleteAsk")}</p>
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
            {t("personnel.notesDeleteConfirm")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
