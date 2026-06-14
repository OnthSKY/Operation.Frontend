"use client";

import { Button } from "@/shared/ui/Button";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { VehicleDocument, VehicleDocumentKind } from "@/types/vehicle-document";

/**
 * Detay overlay → Documents tab.
 * Liste + üst toolbar (yetkiliyse "Doküman ekle"). Yükleme + silme sheet'leri caller'da.
 */
export function VehicleDetailDocumentsTab({
  vehicleId,
  documents,
  pending,
  error,
  errorValue,
  openingId,
  canEdit,
  documentKindLabel,
  onOpenAddSheet,
  onOpenDocument,
  onAskDelete,
  t,
}: {
  vehicleId: number;
  documents: VehicleDocument[];
  pending: boolean;
  error: boolean;
  errorValue: unknown;
  /** Açılan dokümanın id'si (loading state için). */
  openingId: number | null;
  canEdit: boolean;
  documentKindLabel: (kind: VehicleDocumentKind) => string;
  onOpenAddSheet: () => void;
  onOpenDocument: (vehicleId: number, documentId: number) => void;
  onAskDelete: (documentId: number) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">{t("vehicles.vehicleDocuments")}</p>
        {canEdit ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 px-3 py-2 text-sm"
            onClick={onOpenAddSheet}
          >
            {t("vehicles.addVehicleDocument")}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600">{toErrorMessage(errorValue)}</p>
      ) : pending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("vehicles.documentsEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {documents.map((doc) => (
            <MobileListCard
              as="li"
              key={doc.id}
              className="flex flex-wrap items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-900">
                  {documentKindLabel(doc.kind)}
                </div>
                <div className="truncate text-sm text-zinc-600">
                  {doc.originalFileName ?? doc.contentType}
                </div>
                {doc.notes ? (
                  <div className="mt-1 text-sm text-zinc-500">{doc.notes}</div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10 px-3 py-2 text-sm"
                  disabled={openingId === doc.id}
                  onClick={() => void onOpenDocument(vehicleId, doc.id)}
                >
                  {openingId === doc.id
                    ? t("common.loading")
                    : t("documents.open")}
                </Button>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-10 px-3 py-2 text-sm"
                    onClick={() => onAskDelete(doc.id)}
                  >
                    {t("common.delete")}
                  </Button>
                ) : null}
              </div>
            </MobileListCard>
          ))}
        </ul>
      )}
    </div>
  );
}
