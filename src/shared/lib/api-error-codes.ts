/** API `errorCode` when register / kasa akışı turizm sezonu kapalı olduğu için engellenir. */
export const API_ERROR_CODE_TOURISM_SEASON_CLOSED_FOR_REGISTER =
  "TOURISM_SEASON_CLOSED_FOR_REGISTER" as const;

export const API_ERROR_CODE_GENERAL_OVERHEAD_REVERSE_REQUIRES_ACKNOWLEDGEMENT =
  "GENERAL_OVERHEAD_REVERSE_REQUIRES_ACKNOWLEDGEMENT" as const;

/** Depo sevkiyatı onaylı bir sevkiyat talebinden üretilmiş; elle düzenlenemez/silinemez. */
export const API_ERROR_CODE_SHIPMENT_FROM_REQUEST_NOT_EDITABLE =
  "SHIPMENT_FROM_REQUEST_NOT_EDITABLE" as const;

/** Depo sevkiyatının faturası oluşturulmuş; düzenleme/silme için önce fatura silinmeli. */
export const API_ERROR_CODE_SHIPMENT_INVOICED_NOT_EDITABLE =
  "SHIPMENT_INVOICED_NOT_EDITABLE" as const;

/** Sevkiyat grubunun zaten faturası var; yeni fatura eklemeden önce mevcut silinmeli. */
export const API_ERROR_CODE_SHIPMENT_GROUP_ALREADY_INVOICED =
  "SHIPMENT_GROUP_ALREADY_INVOICED" as const;
