"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useDeleteVehicleDocument,
  useUploadVehicleDocument,
} from "@/modules/vehicles/hooks/useVehicleQueries";
import { fetchVehicleDocumentBlob } from "@/modules/vehicles/api/vehicle-documents-api";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { VehicleDocumentKind } from "@/types/vehicle-document";

export type VehicleDocumentPreviewMode = "image" | "pdf" | "other";

/**
 * Araç dokümanı yükle/önizleme/sil form durumu + mutation yönetimi.
 *  - Form state: docKind/docNotes/docFile/docFormError + docDeleteId + docFormOpen
 *  - Önizleme: blob URL memoize + cleanup
 *  - Upload + delete mutation'ları + indir (blob → anchor download)
 *  - Detay (`vehicleId`) değişince form temizlenir.
 */
export function useVehicleDocumentForm({
  vehicleId,
  active,
  t,
}: {
  /** Çalışılan aracın id'si (yoksa 0). */
  vehicleId: number;
  /** Detay overlay açıksa true. */
  active: boolean;
  t: (k: string) => string;
}) {
  const uploadMut = useUploadVehicleDocument(vehicleId);
  const deleteMut = useDeleteVehicleDocument(vehicleId);

  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<VehicleDocumentKind>("REGISTRATION");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  // Önizleme mode'u + blob URL
  const selectedType = file?.type?.toLowerCase() ?? "";
  const previewMode: VehicleDocumentPreviewMode = !file
    ? "other"
    : selectedType.startsWith("image/")
      ? "image"
      : selectedType === "application/pdf"
        ? "pdf"
        : "other";

  const previewUrl = useMemo(() => {
    if (!file || previewMode === "other") return null;
    return URL.createObjectURL(file);
  }, [file, previewMode]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Detay kapanınca form temizlensin
  useEffect(() => {
    if (!active) {
      setFormOpen(false);
      setDeleteId(null);
      setFile(null);
      setNotes("");
      setFormError(null);
    }
  }, [active]);

  /** Doc'u indir (blob → tarayıcı download). */
  const openDoc = useCallback(
    async (vId: number, documentId: number) => {
      setOpeningId(documentId);
      try {
        const { blob, contentType } = await fetchVehicleDocumentBlob(
          vId,
          documentId,
        );
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
        a.download = `vehicle-${vId}-doc-${documentId}.${ext}`;
        a.rel = "noopener";
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        notify.error(toErrorMessage(e));
      } finally {
        setOpeningId(null);
      }
    },
    [],
  );

  /** Upload submit — başarıda formu sıfırla; hata caller'da görünsün. */
  const submitUpload = useCallback(async () => {
    if (vehicleId <= 0) return;
    setFormError(null);
    if (!file || file.size <= 0) {
      setFormError(t("vehicles.documentsFileRequired"));
      return;
    }
    try {
      await uploadMut.mutateAsync({
        file,
        kind,
        notes: notes.trim() || null,
      });
      notify.success(t("common.saved"));
      setFormOpen(false);
      setFile(null);
      setNotes("");
      setKind("REGISTRATION");
    } catch (e) {
      setFormError(toErrorMessage(e));
    }
  }, [file, kind, notes, t, uploadMut, vehicleId]);

  /** Silmeyi onayla (caller modal'ı kapatıp bu çağrıyı yapar). */
  const confirmDelete = useCallback(async () => {
    if (deleteId == null || vehicleId <= 0) return;
    try {
      await deleteMut.mutateAsync(deleteId);
      notify.success(t("common.saved"));
      setDeleteId(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [deleteId, deleteMut, t, vehicleId]);

  return {
    formOpen,
    setFormOpen,
    kind,
    setKind,
    notes,
    setNotes,
    file,
    setFile,
    formError,
    setFormError,
    deleteId,
    setDeleteId,
    openingId,
    previewMode,
    previewUrl,
    openDoc,
    submitUpload,
    confirmDelete,
    uploadBusy: uploadMut.isPending,
    deleteBusy: deleteMut.isPending,
  };
}

export type VehicleDocumentFormState = ReturnType<
  typeof useVehicleDocumentForm
>;
