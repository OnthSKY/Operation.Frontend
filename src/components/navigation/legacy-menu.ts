"use client";

import { PERM, canSeeDailyBranchRegister, canSeeUiModule, hasPermissionCode } from "@/lib/auth/permissions";
import { isDriverPortalRole, isPersonnelPortalRole } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";

export type LegacyMenuItem = {
  id: string;
  labelKey: string;
  route: string;
  icon: string;
  children?: LegacyMenuItem[];
  mobileVisible?: boolean;
  badgeKey?: "notifications";
  featureFlag?: string;
};

export function buildLegacyMenu(user: AuthUser | null): LegacyMenuItem[] {
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const driverPortal = isDriverPortalRole(user?.role);

  const showHome = canSeeUiModule(user, PERM.uiDashboard);
  const showReports = canSeeUiModule(user, PERM.uiReports);
  const showDailyBranchRegister = canSeeDailyBranchRegister(user);
  const showPersonnelFull = !personnelPortal && canSeeUiModule(user, PERM.uiPersonnel);
  const showPersonnelAdvancesOnly = personnelPortal && canSeeUiModule(user, PERM.uiMyAdvances);
  const showBranches = canSeeUiModule(user, PERM.uiBranches);
  const showDocuments = showBranches;
  const showGeneralOverhead =
    !personnelPortal && !driverPortal && canSeeUiModule(user, PERM.uiGeneralOverhead);
  const showInsurances = !personnelPortal && !driverPortal && canSeeUiModule(user, PERM.uiInsurances);
  const showWarehouseLink = driverPortal || canSeeUiModule(user, PERM.uiWarehouse);
  const showProducts = !driverPortal && canSeeUiModule(user, PERM.uiProducts);
  const showProcurement = !personnelPortal && !driverPortal && canSeeUiModule(user, PERM.uiSuppliers);
  const showFleet = !personnelPortal && !driverPortal && canSeeUiModule(user, PERM.uiVehicles);
  const showMyFinancials = Boolean(driverPortal && user?.allowPersonnelSelfFinancials);
  const isSystemAdmin = hasPermissionCode(user, PERM.systemAdmin);

  const items: LegacyMenuItem[] = [];

  if (showHome) {
    items.push({
      id: "overview-group",
      labelKey: "nav.groupOverview",
      route: "/",
      icon: "dashboard",
      mobileVisible: true,
      children: [{ id: "home", labelKey: "nav.home", route: "/", icon: "dashboard" }],
    });
  }

  if (showReports || showDailyBranchRegister) {
    items.push({
      id: "finance-reporting",
      labelKey: "nav.groupFinanceReporting",
      route: "/reports/financial",
      icon: "reports",
      mobileVisible: true,
      badgeKey: "notifications",
      children: [
        ...(showReports
          ? [
              { id: "reports-financial", labelKey: "reports.sidebarFinances", route: "/reports/financial", icon: "reports" },
              { id: "reports-position", labelKey: "reports.tabCashPosition", route: "/reports/position", icon: "reports" },
              { id: "reports-patron-flow", labelKey: "reports.finNavCashFlow", route: "/reports/patron-flow", icon: "reports" },
              { id: "reports-branches", labelKey: "reports.navBranchComparison", route: "/reports/branches", icon: "reports" },
              { id: "reports-stock", labelKey: "reports.tabStock", route: "/reports/stock", icon: "reports" },
            ]
          : []),
        ...(showDailyBranchRegister
          ? [{ id: "daily-branch-register", labelKey: "nav.dailyBranchRegister", route: "/daily-branch-register", icon: "reports" }]
          : []),
      ],
    });
  }

  const peopleChildren: LegacyMenuItem[] = [];
  if (showPersonnelFull) {
    peopleChildren.push(
      { id: "personnel-list", labelKey: "nav.personnelList", route: "/personnel", icon: "personnel" },
      { id: "personnel-costs", labelKey: "nav.personnelCosts", route: "/personnel/costs", icon: "personnel" }
    );
  } else if (showPersonnelAdvancesOnly) {
    peopleChildren.push({
      id: "personnel-costs",
      labelKey: "nav.personnelCosts",
      route: "/personnel/costs",
      icon: "personnel",
    });
  }
  if (showMyFinancials) {
    peopleChildren.push({
      id: "my-financials",
      labelKey: "nav.myFinances",
      route: "/me/financials",
      icon: "personnel",
    });
  }
  if (peopleChildren.length) {
    items.push({
      id: "people-organization",
      labelKey: "nav.groupPeopleOrganization",
      route: peopleChildren[0]!.route,
      icon: "personnel",
      mobileVisible: true,
      children: peopleChildren,
    });
  }

  const operationsChildren: LegacyMenuItem[] = [];
  if (showBranches) {
    operationsChildren.push({ id: "branch-home", labelKey: "nav.branch", route: "/branches", icon: "branch" });
  }
  if (showGeneralOverhead) {
    operationsChildren.push({
      id: "general-overhead",
      labelKey: "nav.generalOverhead",
      route: "/general-overhead",
      icon: "branch",
    });
  }
  if (showInsurances) {
    operationsChildren.push({ id: "insurances", labelKey: "nav.insurances", route: "/insurances", icon: "personnel" });
  }
  if (showFleet) {
    operationsChildren.push({ id: "vehicles", labelKey: "nav.vehicles", route: "/vehicles", icon: "branch" });
  }
  if (operationsChildren.length) {
    items.push({
      id: "operations",
      labelKey: "nav.groupOperations",
      route: operationsChildren[0]!.route,
      icon: "branch",
      mobileVisible: true,
      children: operationsChildren,
    });
  }

  if (showWarehouseLink || showProducts) {
    items.push({
      id: "warehouse-products",
      labelKey: "nav.groupWarehouseProducts",
      route: showWarehouseLink ? "/warehouses" : "/products",
      icon: "branch",
      mobileVisible: true,
      children: [
        ...(showWarehouseLink
          ? [{ id: "warehouses", labelKey: "nav.warehouse", route: "/warehouses", icon: "branch" }]
          : []),
        ...(showProducts
          ? [
              { id: "products", labelKey: "nav.products", route: "/products", icon: "branch" },
              { id: "product-categories", labelKey: "nav.productCategories", route: "/products/categories", icon: "branch" },
              { id: "product-cost-history", labelKey: "nav.productCostHistory", route: "/products/cost-history", icon: "reports" },
              { id: "order-account-statement", labelKey: "reports.sidebarOrderAccountStatement", route: "/products/order-account-statement", icon: "reports" },
            ]
          : []),
      ],
    });
  }

  if (showDocuments) {
    items.push({
      id: "documents-records",
      labelKey: "nav.groupDocumentsRecords",
      route: "/documents",
      icon: "reports",
      children: [{ id: "documents", labelKey: "nav.documents", route: "/documents", icon: "reports" }],
    });
  }

  if (showProcurement) {
    items.push({
      id: "procurement",
      labelKey: "nav.groupProcurement",
      route: "/suppliers",
      icon: "branch",
      children: [
        { id: "suppliers", labelKey: "nav.suppliers", route: "/suppliers", icon: "branch" },
        { id: "supplier-invoices", labelKey: "nav.supplierInvoices", route: "/suppliers/invoices", icon: "branch" },
      ],
    });
  }

  if (isSystemAdmin) {
    items.push({
      id: "system",
      labelKey: "nav.groupSystemManagement",
      route: "/admin/settings",
      icon: "reports",
      children: [
        { id: "system-settings-home", labelKey: "nav.systemSettingsHome", route: "/admin/settings", icon: "reports" },
        { id: "system-users", labelKey: "nav.systemUsers", route: "/admin/users", icon: "personnel" },
        { id: "system-authz", labelKey: "nav.adminNavAuthorization", route: "/admin/settings/authorization", icon: "reports" },
        // Keep existing system entries; only grouping changes.
        { id: "system-notifications", labelKey: "nav.adminNavNotifications", route: "/admin/settings/notifications", icon: "reports" },
        { id: "system-branding", labelKey: "nav.adminNavBranding", route: "/admin/settings/branding", icon: "reports" },
        { id: "system-tourism-policy", labelKey: "nav.adminNavTourismSeasonPolicy", route: "/admin/settings/tourism-season-closed-policy", icon: "reports" },
      ],
    });
  }

  return items;
}
