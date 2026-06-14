import type { AuthUser } from "@/lib/auth/types";

/** Sunucu `permissions` tablosu ile aynı kodlar (matris). */
export const PERM = {
  systemAdmin: "system.admin",
  adminUserPermissionOverrides: "admin.users.permission_overrides",
  adminUserDataScopes: "admin.users.data_scopes",
  /** "Yerine geç" yetkisi — system.admin de joker kapsar. */
  adminImpersonateUsers: "admin.users.impersonate",
  operationsStaff: "operations.staff",
  warehouseDriver: "warehouse.driver",
  uiDashboard: "ui.dashboard",
  uiReports: "ui.reports",
  /** Finans analiz hubı (`/reports/financial`) ve ilgili API; `ui.reports` stok/kasa özeti vb. için ayrı kalır. */
  uiReportsFinancial: "ui.reports.financial",
  uiDailyBranchRegister: "ui.daily_branch_register",
  /** Şube gün sonu kasiyeri: atanmış şubelerde bugünkü kasa + delegeli avans; tam `ui.branches` değil. */
  uiBranchDayClerk: "ui.branch_day_clerk",
  uiPersonnel: "ui.personnel",
  uiMyAdvances: "ui.my_advances",
  uiBranches: "ui.branches",
  uiGeneralOverhead: "ui.general_overhead",
  uiInsurances: "ui.insurances",
  uiWarehouse: "ui.warehouse",
  uiShipments: "ui.shipments",
  /** Sevkiyat modülü kısıtlı: yalnızca sorumlu şubeler. Liste/oluştur backend'de scope'lanır. */
  uiShipmentsOwnBranch: "ui.shipments.own_branch",
  shipmentCreate: "shipment.create",
  shipmentStart: "shipment.start",
  shipmentApprove: "shipment.approve",
  shipmentWarehousePrepare: "shipment.warehouse.prepare",
  shipmentAssignDriver: "shipment.assign.driver",
  shipmentDispatch: "shipment.dispatch",
  shipmentComplete: "shipment.complete",
  shipmentAdminLifecycle: "shipment.admin.lifecycle",
  uiProducts: "ui.products",
  uiSuppliers: "ui.suppliers",
  uiVehicles: "ui.vehicles",
  /** Dış çalışan / taşeron modülü (iş kaydı, ödemeler, bakiye). */
  uiContractors: "ui.contractors",
  /** Vitrin (public site) yönetimi modülü görünürlüğü. */
  uiPublicSite: "ui.public_site",
  /** Vitrin profili + site içeriği yazma. */
  publicSiteWrite: "public_site.write",
  /** Birden fazla şubeyi listeleyebilir; yokluğu = yalnız PersonnelBranchId'ye sınırlı (PERSONNEL). */
  branchCrossBranchView: "branch.cross_branch.view",
  /** Şube finansal toplamlarını (kasa/gelir/gider) görebilir; yokluğu = HideFinancialTotals (PERSONNEL). */
  branchFinancialsView: "branch.financials.view",
  /** Şube tam detay (mali + özlük + stok). Seed'de branch.financials.view ile birlikte verilir. */
  branchAllDataView: "branch.all_data.view",
  /** Başkalarının depo kayıtlarını görebilir; yokluğu = yalnız kendi kayıtları (DRIVER). */
  warehouseCrossUserView: "warehouse.cross_user.view",

  // ---------- Faz B: ince-grenli yazma kabiliyetleri ----------
  /** Şube kasa/gelir/gider satırı yazma. */
  branchOperationsWrite: "branch.operations.write",
  /** Şube stok hareketi yazma. */
  branchStockWrite: "branch.stock.write",
  /** Şube kaydını silme / ters çevirme / yeniden açma. */
  branchDeleteOrReverse: "branch.delete_or_reverse",
  /** Tek tek düşüm/kullanım girişi (OUT, consumption ledger). */
  branchStockConsume: "branch.stock.consume",
  /** Toplu kalan/sayım girişi; sistem bakiye diff'ini SNAPSHOT olarak yazar. */
  branchStockSnapshot: "branch.stock.snapshot",
  /** Fire/manuel düzeltme + consumption satır soft-delete/restore yetkisi. */
  branchStockAdjust: "branch.stock.adjust",
  /** Personel kartı yazma. */
  personnelWrite: "personnel.write",
  /** Bordro parametre seti + ödeme yazma. */
  personnelPayrollWrite: "personnel.payroll.write",
  /** Depo giriş/çıkış hareketi yazma (IN/OUT). */
  warehouseMovementWrite: "warehouse.movement.write",
  /** Depo → şube transfer yazma. */
  warehouseTransferWrite: "warehouse.transfer.write",
  /** Depo hareket/sevkiyat kaydını silme/ters çevirme (write'tan ayrı; DRIVER yazar ama silemez). */
  warehouseDeleteOrReverse: "warehouse.delete_or_reverse",

  // ---------- Risk 2: defense-in-depth master data write kodları ----------
  /** Şube kartı CRUD (master data). */
  branchMasterWrite: "branch.master.write",
  /** Ürün + kategori + maliyet geçmişi yazma. */
  productsWrite: "products.write",
  /** Tedarikçi kartı + fatura + ödeme + foto yazma. */
  suppliersWrite: "suppliers.write",
  /** Araç + sigorta + gider + bakım yazma. */
  vehiclesWrite: "vehicles.write",
  /** Personel avans yazma (delegated path ayrı). */
  advancesWrite: "advances.write",
  /** Outbound (satış) faturası + makbuz + müşteri hesabı yazma. */
  outboundInvoicesWrite: "outbound_invoices.write",
  /** Sigorta (şube + araç sigortası) yazma. */
  insurancesWrite: "insurances.write",
} as const;

/** <c>system.admin</c> bile açıkça verilmeden kapsamaz: kullanıcı override'lı kodlar. */
const EXPLICIT_GRANT_ONLY = new Set<string>([PERM.adminUserDataScopes]);

const UI_PREFIX = "ui.";

function norm(c: string): string {
  return String(c ?? "").trim().toLowerCase();
}

/** Literal kontrol — verilen kullanıcı setinde tam o kod var mı (joker uygulamaz). */
/**
 * "Yerine geç" yetkisi: system.admin (süper joker) ya da açık impersonate izni.
 * Backend AuthPolicies.AdminImpersonate ile birebir eşleşir.
 */
export function canImpersonateUsers(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined
): boolean {
  return (
    hasPermissionCode(user, PERM.systemAdmin) ||
    hasPermissionCode(user, PERM.adminImpersonateUsers)
  );
}

export function hasPermissionCode(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined,
  code: string
): boolean {
  const want = norm(code);
  const codes = user?.permissionCodes;
  if (!codes?.length) return false;
  return codes.some((c) => norm(c) === want);
}

/**
 * Backend <c>PermissionGrantResolver</c>'ın aynısı. Bunu kullan:
 *  - <c>system.admin</c> = <see cref="EXPLICIT_GRANT_ONLY"/> hariç tüm kodları kapsar.
 *  - <c>operations.staff</c> = yalnızca <c>ui.*</c> prefix'li kodları kapsar (least-privilege).
 * Davranışsal kabiliyet kontrolleri için <c>hasPermissionCode</c> yerine bunu çağır.
 */
export function hasEffectivePermission(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined,
  code: string
): boolean {
  const codes = user?.permissionCodes;
  if (!codes?.length) return false;
  const want = norm(code);
  const set = new Set(codes.map((c) => norm(c)));

  if (set.has(want)) return true;
  if (EXPLICIT_GRANT_ONLY.has(want)) return false;
  if (set.has(PERM.systemAdmin)) return true;
  if (want.startsWith(UI_PREFIX) && set.has(PERM.operationsStaff)) return true;
  return false;
}

/** Kullanıcılar → kullanıcıya özel izin satırları modalı. */
export function canManageUserPermissionOverrides(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined
): boolean {
  return (
    hasPermissionCode(user, PERM.systemAdmin) ||
    hasPermissionCode(user, PERM.adminUserPermissionOverrides)
  );
}

/**
 * Kullanıcılar → veri kapsamları.
 * Önce kullanıcı izin override yetkisi gerekir; ayrıca `admin.users.data_scopes` açıkça verilmelidir.
 */
export function canManageUserDataScopes(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined
): boolean {
  return (
    canManageUserPermissionOverrides(user) &&
    hasPermissionCode(user, PERM.adminUserDataScopes)
  );
}

/** Kapsam düğmesi tooltip / toast için hangi engel geçerli. */
export type UserDataScopesBlockReason = "none" | "need_permission_overrides" | "need_data_scopes";

export function getUserDataScopesBlockReason(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined
): UserDataScopesBlockReason {
  if (!canManageUserPermissionOverrides(user)) return "need_permission_overrides";
  if (!hasPermissionCode(user, PERM.adminUserDataScopes)) return "need_data_scopes";
  return "none";
}

// =============================
// Capability helpers (backend AccessPolicies yansıması)
// =============================

/** Kullanıcı birden fazla şubeyi listeleyebilir/üzerinde işlem yapabilir mi (cross-branch). */
export function canViewAllBranches(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchCrossBranchView);
}

/** Kullanıcı şube finansal toplamlarını (kasa, gelir, gider) görebilir mi. */
export function canSeeBranchFinancials(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchFinancialsView);
}

/** Kullanıcı başkalarının oluşturduğu depo kayıtlarını görebilir mi (cross-user). */
export function canSeeOtherUsersWarehouseRecords(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.warehouseCrossUserView);
}

/** Genel gider yönetimine erişimi var mı (modül izni ya da staff jokeri). */
export function canManageGeneralOverhead(user: AuthUser | null | undefined): boolean {
  return (
    hasEffectivePermission(user, PERM.uiGeneralOverhead) ||
    hasEffectivePermission(user, PERM.operationsStaff)
  );
}

/** Kullanıcı şube tam detay görünümünü (mali + özlük + stok) görebilir mi. */
export function canSeeBranchAllData(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchAllDataView);
}

// =============================
// Faz B: ince-grenli yazma capability'leri (backend AccessPolicies.EnsureX yansıması)
// =============================
// Her capability backend'deki tek bir permission code'u sorgular. Eksiklik → backend 403,
// frontend tarafı bu helper'larla edit/delete butonlarını önceden gizler (kullanıcıya 403 göstermemek için).

/** Şube kasa/gelir/gider satırı yazabilir mi. */
export function canWriteBranchOperations(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchOperationsWrite);
}

/** Şube stok hareketi yazabilir mi (şube ↔ depo, vb.). */
export function canWriteBranchStock(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchStockWrite);
}

/** Şube kayıtlarını silebilir/ters çevirebilir mi. */
export function canDeleteOrReverseBranchRecords(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchDeleteOrReverse);
}

/** Şube stok kullanım/tüketim satırı girebilir mi (OUT). */
export function canConsumeBranchStock(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchStockConsume);
}

/** Şube stok sayımı (snapshot) girebilir mi; sistem diff'i otomatik yazar. */
export function canSnapshotBranchStock(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchStockSnapshot);
}

/** Şube stok manuel düzeltme + consumption satırını soft-delete/restore edebilir mi. */
export function canAdjustBranchStock(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchStockAdjust);
}

/** "Kullanım & Kalan" alt-sekmesinin görünebilmesi için herhangi biri yeterli. */
export function canSeeBranchStockConsumption(user: AuthUser | null | undefined): boolean {
  return (
    canConsumeBranchStock(user) ||
    canSnapshotBranchStock(user) ||
    canAdjustBranchStock(user)
  );
}

/** Personel kartı oluşturup/güncelleyebilir mi. */
export function canWritePersonnel(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.personnelWrite);
}

/** Bordro parametre seti veya ödeme yazabilir mi. */
export function canWritePersonnelPayroll(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.personnelPayrollWrite);
}

/** Depo giriş/çıkış hareket kaydı yazabilir mi. */
export function canWriteWarehouseMovement(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.warehouseMovementWrite);
}

/** Depo → şube transfer kaydı yazabilir mi. */
export function canWriteWarehouseTransfer(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.warehouseTransferWrite);
}

/** Depo hareket/sevkiyat kaydını silebilir/ters çevirebilir mi (write'tan ayrı; DRIVER yazar ama silemez). */
export function canDeleteOrReverseWarehouseRecords(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.warehouseDeleteOrReverse);
}

// =============================
// Risk 2: master data write capability'leri
// =============================

/** Şube kartı CRUD yapabilir mi (master data). */
export function canWriteBranchMaster(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.branchMasterWrite);
}

/** Ürün/kategori/maliyet geçmişi yazabilir mi. */
export function canWriteProducts(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.productsWrite);
}

/** Tedarikçi kartı + fatura + ödeme yazabilir mi. */
export function canWriteSuppliers(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.suppliersWrite);
}

/** Araç + sigorta + gider + bakım yazabilir mi. */
export function canWriteVehicles(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.vehiclesWrite);
}

/** Personel avans yazabilir mi (delegated path ayrı). */
export function canWriteAdvances(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.advancesWrite);
}

/** Outbound (satış) faturası yazabilir mi. */
export function canWriteOutboundInvoices(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.outboundInvoicesWrite);
}

/** Sigorta takip kaydı yazabilir mi (şube + araç). */
export function canWriteInsurances(user: AuthUser | null | undefined): boolean {
  return hasEffectivePermission(user, PERM.insurancesWrite);
}

// =============================
// Mevcut helper'lar
// =============================

/**
 * Menü / sayfa görünürlüğü. Backend resolver semantiği ile aynı: <c>hasEffectivePermission</c>
 * <c>system.admin</c> jokeri ve <c>operations.staff</c>'in <c>ui.*</c> jokerini uygular.
 * Legacy: kullanıcının hiç <c>permissionCodes</c>'u yoksa rol bazlı varsayılan menü gösterilir.
 */
export function canSeeUiModule(user: AuthUser | null | undefined, uiCode: string): boolean {
  if (!user) return false;
  const codes = user.permissionCodes ?? [];
  if (codes.length === 0) {
    const r = String(user.role ?? "").toUpperCase();
    if (r === "ADMIN" || r === "STAFF") return true;
    if (r === "PERSONNEL") return uiCode === PERM.uiBranches || uiCode === PERM.uiMyAdvances;
    if (r === "DRIVER") return uiCode === PERM.uiBranches || uiCode === PERM.uiWarehouse;
    if (r === "VIEWER")
      return (
        uiCode === PERM.uiDashboard ||
        uiCode === PERM.uiReports ||
        uiCode === PERM.uiDailyBranchRegister
      );
    if (r === "FINANCE")
      return (
        uiCode === PERM.uiDashboard ||
        uiCode === PERM.uiReports ||
        uiCode === PERM.uiDailyBranchRegister ||
        uiCode === PERM.uiPersonnel ||
        uiCode === PERM.uiMyAdvances ||
        uiCode === PERM.uiBranches ||
        uiCode === PERM.uiGeneralOverhead ||
        uiCode === PERM.uiProducts ||
        uiCode === PERM.uiSuppliers
      );
    if (r === "PROCUREMENT")
      return (
        uiCode === PERM.uiDashboard ||
        uiCode === PERM.uiReports ||
        uiCode === PERM.uiDailyBranchRegister ||
        uiCode === PERM.uiBranches ||
        uiCode === PERM.uiWarehouse ||
        uiCode === PERM.uiProducts ||
        uiCode === PERM.uiSuppliers
      );
    if (r === "BRANCH_DAY_REGISTER")
      return uiCode === PERM.uiBranchDayClerk || uiCode === PERM.uiDailyBranchRegister;
    return false;
  }
  return hasEffectivePermission(user, uiCode);
}

export function canSeeDailyBranchRegister(user: AuthUser | null | undefined): boolean {
  return (
    canSeeUiModule(user, PERM.uiDailyBranchRegister) || canSeeUiModule(user, PERM.uiBranches)
  );
}

/** Şube kartı / kasa ekranı: tam şube modülü veya gün sonu kasiyeri modu. */
export function canOpenBranchesWorkspace(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return (
    canSeeUiModule(user, PERM.uiBranches) || hasPermissionCode(user, PERM.uiBranchDayClerk)
  );
}

/**
 * Gelir/gider KPI, finans tabloları ve finans özeti API’leri (`/reports/financial`).
 * Backend resolver semantiği: system.admin joker + operations.staff ui.* jokeri.
 */
export function canSeeFinancialReports(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const codes = user.permissionCodes ?? [];
  if (codes.length === 0) {
    const r = String(user.role ?? "").toUpperCase();
    return r === "ADMIN" || r === "STAFF" || r === "FINANCE";
  }
  return hasEffectivePermission(user, PERM.uiReportsFinancial);
}

export function hasStaffOperationsNotifications(user: AuthUser | null | undefined): boolean {
  return hasPermissionCode(user, PERM.systemAdmin) || hasPermissionCode(user, PERM.operationsStaff);
}

/**
 * Sevkiyat menüsü/sayfa görünürlüğü: tam <c>ui.shipments</c> ya da sorumlu-şube kısıtlı
 * <c>ui.shipments.own_branch</c>. Resolver semantiği `hasEffectivePermission` üzerinden işler
 * (system.admin + operations.staff jokerleri dahil).
 */
export function canSeeShipmentsModule(user: AuthUser | null | undefined): boolean {
  return (
    hasEffectivePermission(user, PERM.uiShipments) ||
    hasEffectivePermission(user, PERM.uiShipmentsOwnBranch)
  );
}

/**
 * Sevkiyat onay/aksiyon bildirim rozeti hangi kullanıcıya gösterilsin:
 * modül perm'i olsun olmasın, kullanıcı bir sevkiyat akışında actor olarak atanmış olabilir
 * (bildirim deep-link senaryosu). Endpoint backend'de [Authorize] (kimlik doğrulanmış); yanıt
 * boş olabilir, polling pahalı değil. Burada sadece "bell'i mount edelim mi" kararı.
 */
export function shouldMountShipmentActionableBell(user: AuthUser | null | undefined): boolean {
  return Boolean(user);
}
