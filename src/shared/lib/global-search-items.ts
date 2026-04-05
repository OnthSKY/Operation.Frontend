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
    id: "home",
    href: "/",
    titleKey: "nav.home",
    subtitleKey: "search.subDashboard",
    match:
      "dashboard ana özet günlük snapshot income expense gelir gider net kasa özet ekran",
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
    id: "branch",
    href: "/branch",
    titleKey: "nav.branch",
    subtitleKey: "search.subBranch",
    match: "şube branch mağaza store lokasyon location ofis outlet",
  },
  {
    id: "warehouse",
    href: "/warehouse",
    titleKey: "nav.warehouse",
    subtitleKey: "search.subWarehouse",
    match:
      "depo warehouse stok stock envanter inventory malzeme ürün goods storage",
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
