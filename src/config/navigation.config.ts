export type NavigationItem = {
  id: string;
  label: string;
  title: string;
  route: string;
  icon: "dashboard" | "branch" | "reports" | "personnel";
  mobileVisible: boolean;
  order: number;
  permission?: string;
  roles?: string[];
  badgeCount?: number;
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Dashboard",
    route: "/",
    icon: "dashboard",
    mobileVisible: true,
    order: 1,
    permission: "ui.dashboard",
  },
  {
    id: "branch",
    label: "Branch",
    title: "Sube Yonetimi",
    route: "/branches",
    icon: "branch",
    mobileVisible: true,
    order: 2,
    permission: "ui.branches",
  },
  {
    id: "reports",
    label: "Reports",
    title: "Raporlar",
    route: "/reports",
    icon: "reports",
    mobileVisible: true,
    order: 3,
    permission: "ui.reports",
  },
  {
    id: "personnel",
    label: "Personnel",
    title: "Personel",
    route: "/personnel",
    icon: "personnel",
    mobileVisible: true,
    order: 4,
    permission: "ui.personnel",
  },
];
