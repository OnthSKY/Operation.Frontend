/** Merkezî belge türü tanımı domain'i (ana grup). */
export type DocumentDefinitionDomain =
  | "BRANCH"
  | "PERSONNEL"
  | "SUPPLIER"
  | "COMPANY"
  | "VEHICLE";

export type DocumentDefinition = {
  id: number;
  /** Ana grup (BRANCH/PERSONNEL/...); bilinmeyen değerler string olarak taşınır. */
  domain: string;
  /** Alt grup (opsiyonel). */
  category: string | null;
  code: string;
  nameTr: string;
  nameEn: string;
  sortOrder: number;
  /** Sistem üretimi tür (ör. sevkiyat irsaliyesi); elle yüklenemez. */
  isSystem: boolean;
  isActive: boolean;
};
