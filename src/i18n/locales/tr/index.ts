import type { Messages } from "../en";
import { apiErrors } from "./api-errors";
import { auth } from "./auth";
import { branch } from "./branch";
import { common } from "./common";
import { dashboard } from "./dashboard";
import { documents } from "./documents";
import { generalOverhead } from "./general-overhead";
import { guide } from "./guide";
import { insuranceTrack } from "./insurance-track";
import { lang } from "./lang";
import { nav } from "./nav";
import { pageHelp } from "./pageHelp";
import { permissionMeta } from "./permissionMeta";
import { profile } from "./profile";
import { personnel } from "./personnel";
import { products } from "./products";
import { reminders } from "./reminders";
import { reports } from "./reports";
import { users } from "./users";
import { userRoles } from "./userRoles";
import { search } from "./search";
import { settings } from "./settings";
import { shipments } from "./shipments";
import { suppliers } from "./suppliers";
import { vehicles } from "./vehicles";
import { toast } from "./toast";
import { warehouse } from "./warehouse";

export const tr = {
  nav,
  pageHelp,
  permissionMeta,
  lang,
  apiErrors,
  auth,
  common,
  dashboard,
  documents,
  guide,
  generalOverhead,
  insuranceTrack,
  personnel,
  profile,
  users,
  userRoles,
  settings,
  shipments,
  branch,
  warehouse,
  products,
  reminders,
  reports,
  search,
  suppliers,
  vehicles,
  toast,
} as unknown as Messages;
