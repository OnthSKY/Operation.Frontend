/** Merkezî ünvan (personel görev ünvanı) tanımı. */
export type JobTitleDefinition = {
  id: number;
  code: string;
  nameTr: string;
  nameEn: string;
  sortOrder: number;
  /** Sistem üretimi ünvan (mevcut enum değerleri); elle silinemez. */
  isSystem: boolean;
  isActive: boolean;
};
