export type GlobalSearchItemDef = {
  id: string;
  href: string;
  titleKey: string;
  subtitleKey: string;
  /** Lowercase TR+EN tokens for matching (in addition to translated title/subtitle). */
  match: string;
};

export const GLOBAL_SEARCH_ITEMS: GlobalSearchItemDef[] = [
  {
    id: "guide",
    href: "/guide",
    titleKey: "nav.guide",
    subtitleKey: "search.subGuide",
    match:
      "nasıl kullanırım kullanım kılavuzu yardım help guide walkthrough yönlendirme talimat kullanıcı",
  },
  {
    id: "home",
    href: "/",
    titleKey: "nav.home",
    subtitleKey: "search.subDashboard",
    match:
      "dashboard ana özet günlük snapshot income expense gelir gider net kasa özet ekran",
  },
  {
    id: "reports",
    href: "/reports/financial",
    titleKey: "nav.reports",
    subtitleKey: "search.subReports",
    match:
      "rapor reports finans financial stok stock dönem period özet kategori şube depo",
  },
  {
    id: "reports-branch-comparison",
    href: "/reports/branches",
    titleKey: "reports.navBranchComparison",
    subtitleKey: "search.subBranchComparison",
    match:
      "şube bazlı branch comparison karşılaştırma dönem period gelir gider net kasa register şubeler arası",
  },
  {
    id: "personnel",
    href: "/personnel",
    titleKey: "nav.personnel",
    subtitleKey: "search.subPersonnel",
    match:
      "personel personnel staff çalışan employee team ik hr insan kaynakları people liste",
  },
  {
    id: "advance",
    href: "/personnel#personnel-advance",
    titleKey: "personnel.advance",
    subtitleKey: "search.subAdvance",
    match: "avans advance ön ödeme prepaid payment borç loan maaş salary ödeme",
  },
  {
    id: "personnel-costs",
    href: "/personnel/costs",
    titleKey: "personnel.costsTitle",
    subtitleKey: "search.subPersonnelCosts",
    match:
      "personel maliyetleri personnel costs avans advances gider expenses maaş salary kasa register toplam combined özet",
  },
  {
    id: "admin-settings",
    href: "/admin/settings",
    titleKey: "nav.systemSettingsHome",
    subtitleKey: "search.subSystemSettings",
    match:
      "sistem ayarları system settings kullanıcılar users roller roles izin permissions yetki matrix matris yönetim administration",
  },
  {
    id: "admin-authorization",
    href: "/admin/settings/authorization",
    titleKey: "nav.adminNavAuthorization",
    subtitleKey: "search.subAuthorizationMatrix",
    match:
      "rol izin permission matrix matris yetki authorization rbac staff driver admin operations.staff system.admin warehouse.driver",
  },
  {
    id: "admin-notifications",
    href: "/admin/settings/notifications",
    titleKey: "settings.notificationsCardTitle",
    subtitleKey: "search.subOrgNotifications",
    match:
      "bildirim notifications hatırlatıcı reminder zil bell toast kurum organization sistem system admin operasyon operational z raporu gün sonu",
  },
  {
    id: "admin-tourism-season-policy",
    href: "/admin/settings/tourism-season-closed-policy",
    titleKey: "settings.tourismSeasonCardTitle",
    subtitleKey: "search.subTourismSeasonPolicy",
    match:
      "turizm tourism sezon season kapalı closed kasa register şube branch policy politika TOURISM_SEASON_CLOSED",
  },
  {
    id: "admin-users",
    href: "/admin/users",
    titleKey: "nav.systemUsers",
    subtitleKey: "search.subSystemUsers",
    match:
      "kullanıcılar users admin yönetici hesap account login giriş sistem system yönetimi administration",
  },
  {
    id: "branch",
    href: "/branches",
    titleKey: "nav.branch",
    subtitleKey: "search.subBranch",
    match: "şube branch mağaza store lokasyon location ofis outlet",
  },
  {
    id: "warehouse",
    href: "/warehouses",
    titleKey: "nav.warehouse",
    subtitleKey: "search.subWarehouse",
    match:
      "depo warehouse stok stock envanter inventory malzeme ürün goods storage",
  },
  {
    id: "products",
    href: "/products",
    titleKey: "nav.products",
    subtitleKey: "search.subProducts",
    match:
      "ürünler products katalog catalog liste list depo warehouse stok stock sku malzeme",
  },
  {
    id: "product-categories",
    href: "/products/categories",
    titleKey: "nav.productCategories",
    subtitleKey: "search.subProductCategories",
    match:
      "kategori categories ana alt sub parent hiyerarşi taxonomy sınıf class grup group ürün kategorileri",
  },
  {
    id: "suppliers",
    href: "/suppliers",
    titleKey: "nav.suppliers",
    subtitleKey: "search.subSuppliers",
    match:
      "tedarikçi supplier vendor alım purchase fatura invoice borç payable ödeme payment merkez depo",
  },
  {
    id: "supplier-invoices",
    href: "/suppliers/invoices",
    titleKey: "suppliers.invoicesPageTitle",
    subtitleKey: "search.subSupplierInvoices",
    match:
      "tedarikçi faturaları supplier invoices alım faturası purchase invoice liste list filtre filter ödenmiş ödenmemiş unpaid paid açık bakiye",
  },
  {
    id: "general-overhead",
    href: "/general-overhead",
    titleKey: "nav.generalOverhead",
    subtitleKey: "search.subGeneralOverhead",
    match:
      "genel gider overhead merkez muhasebe vergi paylaştır allocate şube branch patron maliyet cost dağıtım split ortak gider",
  },
  {
    id: "vehicles",
    href: "/vehicles",
    titleKey: "nav.vehicles",
    subtitleKey: "search.subVehicles",
    match:
      "araç vehicle fleet filo plaka plate şirket company sigorta insurance kasko trafik yakıt fuel bakım maintenance gider expense atama assignment şube branch personel driver",
  },
  {
    id: "insurances",
    href: "/insurances",
    titleKey: "nav.insurances",
    subtitleKey: "search.subInsurances",
    match:
      "sigorta insurance takip track sgk personel personnel araç vehicle şube branch poliçe policy kasko trafik bitiş expiry yenileme renewal kapsam coverage",
  },
  {
    id: "income",
    href: "/#dashboard-gelir",
    titleKey: "dashboard.income",
    subtitleKey: "search.subIncomeWidget",
    match: "gelir income revenue ciro kazanç earnings",
  },
  {
    id: "expense",
    href: "/#dashboard-gider",
    titleKey: "dashboard.expense",
    subtitleKey: "search.subExpenseWidget",
    match: "gider expense cost masraf harcama spending outlay",
  },
  {
    id: "net",
    href: "/#dashboard-net",
    titleKey: "dashboard.netCash",
    subtitleKey: "search.subNetWidget",
    match: "net nakit cash balance bakiye kalan",
  },
];
