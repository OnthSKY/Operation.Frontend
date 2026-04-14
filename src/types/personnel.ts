/** Backend job_title (personnel). */
export type PersonnelJobTitle =
  | "GENERAL_MANAGER"
  | "BRANCH_SUPERVISOR"
  | "DRIVER"
  | "CRAFTSMAN"
  | "WAITER"
  | "COMMIS"
  | "CASHIER"
  | "BRANCH_INTERNAL_HELP";

/** Eski tip / yeni çipli kimlik (API: OLD / NEW). */
export type NationalIdCardGeneration = "OLD" | "NEW";

/** Backend: PersonnelResponse / CreatePersonnelRequest (camelCase). */
export type Personnel = {
  id: number;
  fullName: string;
  hireDate: string;
  /** Güncel açık dönem: `personnel_employment_terms.arrival_date` */
  seasonArrivalDate: string | null;
  /** Takvim yılı hesabı kapatılmış yıllar (API: yeni → eski); yoksa boş dizi */
  yearAccountClosedYears?: number[];
  jobTitle: PersonnelJobTitle;
  currencyCode: string;
  salary: number | null;
  branchId: number | null;
  /** İletişim telefonu (isteğe bağlı) */
  phone: string | null;
  /** Açık sigorta dönemi var mı (liste rozeti; güncel dönem özeti) */
  insuranceStarted: boolean;
  insuranceStartDate: string | null;
  insuranceEndDate: string | null;
  /** TC Kimlik (11 hane) */
  nationalId: string | null;
  birthDate: string | null;
  /** Kimlik kartı nesli; kayıtta yoksa null */
  nationalIdCardGeneration: NationalIdCardGeneration | null;
  hasNationalIdPhotoFront: boolean;
  hasNationalIdPhotoBack: boolean;
  /** Profil / tanıtım fotoğrafı yuvaları (en fazla 2). */
  hasProfilePhoto1: boolean;
  hasProfilePhoto2: boolean;
  /** GET göreli yol; dosya yoksa null (`NEXT_PUBLIC_API_BASE_URL` ile birleştirin). */
  profilePhoto1Url: string | null;
  profilePhoto2Url: string | null;
  /** Formda girilen planlanan / beyan sigorta başlangıcı (dönem tablosundan ayrı). */
  insuranceIntakeStartDate: string | null;
  insuranceAccountingNotified: boolean;
  isDeleted: boolean;
  /** Linked active `users.id` when a system account exists. */
  userId?: number | null;
  username?: string | null;
  /** Şoför: SRC var mı; diğer ünvanlarda null. */
  driverHasSrc: boolean | null;
  /** Şoför: psikoteknik var mı; diğer ünvanlarda null. */
  driverHasPsychotechnical: boolean | null;
};

export type CreatePersonnelUserAccountInput = {
  username: string;
  password: string;
};

export type CreatePersonnelInput = {
  fullName: string;
  hireDate: string;
  jobTitle: PersonnelJobTitle;
  salary?: number | null;
  branchId?: number | null;
  phone?: string | null;
  nationalId?: string | null;
  birthDate?: string | null;
  nationalIdCardGeneration?: NationalIdCardGeneration | null;
  insuranceIntakeStartDate?: string | null;
  insuranceAccountingNotified?: boolean;
  /** Bu sezona gelerek başladı: `personnel_employment_terms.arrival_date` */
  seasonArrivalDate?: string;
  userAccount?: CreatePersonnelUserAccountInput;
  /** Zorunlu: `jobTitle === "DRIVER"` iken */
  driverHasSrc?: boolean;
  driverHasPsychotechnical?: boolean;
};

export type UpdatePersonnelInput = CreatePersonnelInput & { id: number };

export type PersonnelInsurancePeriod = {
  id: number;
  personnelId: number;
  coverageStartDate: string;
  coverageEndDate: string | null;
  notes: string | null;
  /** Sigorta girişinin yapıldığı şube */
  registeredBranchId: number | null;
  registeredBranchName: string | null;
  createdAtUtc: string;
};

export type AddPersonnelInsurancePeriodInput = {
  coverageStartDate: string;
  /** Boş veya null = güncel açık dönem */
  coverageEndDate?: string | null;
  notes?: string | null;
  /** Hangi şube adına kayıt (zorunlu) */
  registeredBranchId: number;
};

/** Mevcut dönem satırında bitiş (çıkış) tarihi ve not güncellemesi. */
export type UpdatePersonnelInsurancePeriodInput = {
  coverageEndDate: string;
  notes?: string | null;
};
