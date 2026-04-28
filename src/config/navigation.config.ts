export type NavItem = {
  label: string;
  path: string;
  icon: string;
  mobile?: boolean;
  order?: number;
  isMore?: boolean;
  permission?: string;
  roles?: string[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Personeller",
    path: "/personnel",
    icon: "personnel",
    mobile: true,
    order: 1,
  },
  {
    label: "Şubeler",
    path: "/branches",
    icon: "branch",
    mobile: true,
    order: 2,
  },
  {
    label: "Depolar",
    path: "/warehouses",
    icon: "warehouse",
    mobile: true,
    order: 3,
  },
  {
    label: "More",
    path: "/more",
    icon: "menu",
    mobile: true,
    isMore: true,
    order: 5,
  },
  {
    label: "Dashboard",
    path: "/",
    icon: "home",
    mobile: false,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: "chart",
    mobile: false,
  },
  {
    label: "Products",
    path: "/products",
    icon: "box",
    mobile: false,
  },
  {
    label: "Warehouse",
    path: "/warehouse",
    icon: "warehouse",
    mobile: false,
  },
];
