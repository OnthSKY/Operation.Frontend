"use client";

import { Modal } from "@/shared/ui/Modal";
import { useI18n } from "@/i18n/context";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { WarehouseOutboundShipmentMovementEditResponse } from "@/modules/warehouse/api/warehouses-api";

/**
 * Seçili sevkiyat hareket'inin (warehouse outbound shipment movement) salt-okunur özeti.
 * Açılma koşulu (`open && detail != null`) çağıran tarafça uygulanır; modal kendisi yalnızca
 * sunum yapar (SRP).
 */
type Props = {
  open: boolean;
  detail: WarehouseOutboundShipmentMovementEditResponse | null;
  /** Banner'da görünen depo id'si (kaynak grubundan). */
  warehouseId: number | null | undefined;
  onClose: () => void;
};

export function OasShipmentDetailModal({ open, detail, warehouseId, onClose }: Props) {
  const { t, locale } = useI18n();

  return (
    <Modal
      open={open && detail != null}
      onClose={onClose}
      titleId="order-account-shipment-detail-title"
      title={t("reports.orderAccountStatementShipmentDetailTitle")}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-lg"
    >
      {detail ? (
        <div className="mt-3 space-y-2 text-sm text-zinc-700">
          <p>
            <span className="font-semibold">
              {t("reports.orderAccountStatementShipmentDetailWarehouseId")}:
            </span>{" "}
            {warehouseId ?? "-"}
          </p>
          <p>
            <span className="font-semibold">
              {t("reports.orderAccountStatementShipmentDetailMovementId")}:
            </span>{" "}
            {detail.id}
          </p>
          <p>
            <span className="font-semibold">
              {t("reports.orderAccountStatementShipmentDetailBranch")}:
            </span>{" "}
            {detail.branchName}
          </p>
          <p>
            <span className="font-semibold">
              {t("reports.orderAccountStatementShipmentDetailProduct")}:
            </span>{" "}
            {detail.productName}
          </p>
          <p>
            <span className="font-semibold">
              {t("reports.orderAccountStatementShipmentDetailQuantity")}:
            </span>{" "}
            {formatLocaleAmount(detail.quantity, locale, "TRY")} {detail.unit ?? ""}
          </p>
          <p>
            <span className="font-semibold">
              {t("reports.orderAccountStatementShipmentDetailDate")}:
            </span>{" "}
            {detail.businessDate}
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
