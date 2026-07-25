"use client";

import {
  PERM,
  canOpenBranchesWorkspace,
  canSeeDailyBranchRegister,
  canSeeFinancialReports,
  canSeeShipmentsModule,
  canSeeUiModule,
  hasPermissionCode,
} from "@/lib/auth/permissions";
import { isDriverPortalRole, isPersonnelPortalRole } from "@/lib/auth/roles";
import type { AuthUser } from "@/lib/auth/types";

export type LegacyMenuItem = {
  id: string;
  labelKey: string;
  /** Shorter label for the mobile bottom dock (full `labelKey` stays in sidebar / tooltips). */
  dockLabelKey?: string;
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
  const showFinancialReports = canSeeFinancialReports(user);
  const showDailyBranchRegister = canSeeDailyBranchRegister(user);
  // finance-reporting grubu yalnızca showReports iken render edilir.
  const reportsGroupLanding = showFinancialReports ? "/reports/financial" : "/reports/position";
  const showPersonnelFull = !personnelPortal && canSeeUiModule(user, PERM.uiPersonnel);
  const showPersonnelAdvancesOnly = personnelPortal && canSeeUiModule(user, PERM.uiMyAdvances);
  const showBranchesNav = canOpenBranchesWorkspace(user);
  const showBranchesFull = canSeeUiModule(user, PERM.uiBranches);
  const showDocuments = showBranchesFull;
  const showGeneralOverhead =
    !personnelPortal && !driverPortal && canSeeUiModule(user, PERM.uiGeneralOverhead);
  const showInsurances = !personnelPortal && !driverPortal && canSeeUiModule(user, PERM.uiInsurances);
  const showWarehouseLink = driverPortal || canSeeUiModule(user, PERM.uiWarehouse);
  const showShipments = !personnelPortal && canSeeShipmentsModule(user);
  const showProducts = !driverPortal && canSeeUiModule(user, PERM.uiProducts);
  const showProcurement = !personnelPortal && !driverPortal && canSeeUiModule(user, PERM.uiSuppliers);
  const showContractors = !personnelPortal && !driverPortal && canSeeUiModule(user, PERM.uiContractors);
  const showPublicSite = !personnelPortal && !driverPortal && canSeeUiModule(user, PERM.uiPublicSite);
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

  if (showDocuments) {
    items.push({
      id: "documents-records",
      labelKey: "nav.groupDocumentsRecords",
      route: "/documents",
      icon: "documents",
      children: [{ id: "documents", labelKey: "nav.documents", route: "/documents", icon: "documents" }],
    });
  }

  if (showDailyBranchRegister) {
    items.push({
      id: "daily-branch-register-group",
      labelKey: "nav.dailyBranchRegister",
      route: "/daily-branch-register",
      icon: "reports",
      mobileVisible: true,
      children: [
        {
          id: "daily-branch-register",
          labelKey: "nav.dailyBranchRegister",
          route: "/daily-branch-register",
          icon: "reports",
        },
      ],
    });
  }

  if (showReports) {
    items.push({
      id: "finance-reporting",
      labelKey: "nav.groupFinanceReporting",
      dockLabelKey: "nav.dockFinanceShort",
      route: reportsGroupLanding,
      icon: "reports",
      mobileVisible: true,
      badgeKey: "notifications",
      children: [
        ...(showFinancialReports
          ? [
              {
                id: "reports-financial",
                labelKey: "reports.sidebarFinances",
                route: "/reports/financial",
                icon: "reports",
              },
            ]
          : []),
        { id: "reports-position", labelKey: "reports.tabCashPosition", route: "/reports/position", icon: "reports" },
        { id: "reports-personnel-held-cash", labelKey: "reports.sidebarPersonnelHeldCash", route: "/reports/personnel-held-cash", icon: "reports" },
        { id: "reports-patron-flow", labelKey: "reports.finNavCashFlow", route: "/reports/patron-flow", icon: "reports" },
        { id: "reports-stock", labelKey: "reports.tabStock", route: "/reports/stock", icon: "reports" },
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
  if (showContractors) {
    peopleChildren.push({
      id: "contractors",
      labelKey: "nav.contractors",
      route: "/contractors",
      icon: "personnel",
    });
  }
  if (peopleChildren.length) {
    items.push({
      id: "people-organization",
      labelKey: "nav.groupPeopleOrganization",
      dockLabelKey: "nav.dockPeopleShort",
      route: peopleChildren[0]!.route,
      icon: "personnel",
      mobileVisible: true,
      children: peopleChildren,
    });
  }

  const operationsChildren: LegacyMenuItem[] = [];
  if (showBranchesNav) {
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
    operationsChildren.push({ id: "vehicles", labelKey: "nav.vehicles", route: "/vehicles", icon: "vehicles" });
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

  if (showWarehouseLink || showShipments || showProducts) {
    items.push({
      id: "warehouse-products",
      labelKey: "nav.groupWarehouseProducts",
      dockLabelKey: "nav.dockWarehouseShort",
      route: showWarehouseLink ? "/warehouses" : showShipments ? "/shipments" : "/products",
      icon: "warehouse",
      mobileVisible: true,
      children: [
        // Depo (alt menü): fiziksel stok ve hareketler
        ...(showWarehouseLink
          ? [
              {
                id: "warehouse-sub",
                labelKey: "nav.subWarehouse",
                route: "/warehouses",
                icon: "warehouse",
                children: [
                  { id: "warehouses", labelKey: "nav.warehouse", route: "/warehouses", icon: "warehouse" },
                  {
                    id: "warehouse-global-movements",
                    labelKey: "nav.warehouseGlobalMovements",
                    route: "/warehouses/movements",
                    icon: "movements",
                  },
                ],
              },
            ]
          : []),
        // Sevkiyat: kendi workflow'u olan ayrı bir akış (tek satır)
        ...(showShipments
          ? [{ id: "shipments", labelKey: "nav.shipments", route: "/shipments", icon: "warehouse" }]
          : []),
        // Ürünler & Fiyat (alt menü): katalog + fiyat/maliyet analitiği
        ...(showProducts
          ? [
              {
                id: "products-sub",
                labelKey: "nav.subProducts",
                route: "/products",
                icon: "products",
                children: [
                  { id: "products", labelKey: "nav.products", route: "/products", icon: "products" },
                  { id: "product-categories", labelKey: "nav.productCategories", route: "/products/categories", icon: "categories" },
                  { id: "product-cost-history", labelKey: "nav.productCostHistory", route: "/products/cost-history", icon: "cost" },
                  { id: "product-sales-price-history", labelKey: "nav.productSalesPriceHistory", route: "/products/sales-price-history", icon: "cost" },
                ],
              },
            ]
          : []),
      ],
    });
  }

  // Muhasebe / Finansal — ayrı üst grup: OAS + Cari hesaplar + Tahsilatlar
  if (showProducts) {
    items.push({
      id: "accounting",
      labelKey: "nav.groupAccounting",
      route: "/products/order-account-statement/summary",
      icon: "invoices",
      mobileVisible: true,
      children: [
        {
          id: "counterparty-summary",
          labelKey: "reports.sidebarCounterpartySummary",
          route: "/products/order-account-statement/summary",
          icon: "reports",
        },
        {
          id: "all-receipts",
          labelKey: "reports.sidebarAllReceipts",
          route: "/products/order-account-statement/summary?tab=receipts",
          icon: "invoices",
        },
        {
          id: "order-account-statement",
          labelKey: "reports.sidebarOrderAccountStatement",
          route: "/products/order-account-statement",
          icon: "invoices",
        },
      ],
    });
  }

  if (showProcurement) {
    items.push({
      id: "procurement",
      labelKey: "nav.groupProcurement",
      route: "/suppliers",
      icon: "suppliers",
      children: [
        { id: "suppliers", labelKey: "nav.suppliers", route: "/suppliers", icon: "suppliers" },
        { id: "supplier-invoices", labelKey: "nav.supplierInvoices", route: "/suppliers/invoices", icon: "invoices" },
      ],
    });
  }

  if (showPublicSite) {
    items.push({
      id: "public-site",
      labelKey: "nav.publicSiteSection",
      route: "/public-site/branches",
      icon: "branch",
      children: [
        {
          id: "public-site-branches",
          labelKey: "nav.publicSiteBranches",
          route: "/public-site/branches",
          icon: "branch",
        },
        {
          id: "public-site-flavors",
          labelKey: "nav.publicSiteFlavors",
          route: "/public-site/flavors",
          icon: "box",
        },
        {
          id: "public-site-content",
          labelKey: "nav.publicSiteContent",
          route: "/public-site/content",
          icon: "branch",
        },
      ],
    });
  }

  if (isSystemAdmin) {
    items.push({
      id: "system",
      labelKey: "nav.groupSystemManagement",
      route: "/admin/settings",
      icon: "settings",
      children: [
        { id: "system-settings-home", labelKey: "nav.systemSettingsHome", route: "/admin/settings", icon: "settings" },
        { id: "system-users", labelKey: "nav.systemUsers", route: "/admin/users", icon: "users" },
        { id: "system-authz", labelKey: "nav.adminNavAuthorization", route: "/admin/settings/authorization", icon: "roles" },
        // Keep existing system entries; only grouping changes.
        { id: "system-notifications", labelKey: "nav.adminNavNotifications", route: "/admin/settings/notifications", icon: "notifications" },
        { id: "system-branding", labelKey: "nav.adminNavBranding", route: "/admin/settings/branding", icon: "branding" },
        { id: "system-tourism-policy", labelKey: "nav.adminNavTourismSeasonPolicy", route: "/admin/settings/tourism-season-closed-policy", icon: "settings" },
        { id: "system-document-definitions", labelKey: "nav.adminNavDocumentDefinitions", route: "/admin/settings/document-definitions", icon: "documents" },
      ],
    });
  }

  return items;
}
