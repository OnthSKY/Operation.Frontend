import type { Messages } from "../en";
import { apiErrors } from "./api-errors";
import { auth } from "./auth";
import { branch } from "./branch";
import { common } from "./common";
import { dashboard } from "./dashboard";
import { generalOverhead } from "./general-overhead";
import { guide } from "./guide";
import { insuranceTrack } from "./insurance-track";
import { lang } from "./lang";
import { nav } from "./nav";
import { profile } from "./profile";
import { personnel } from "./personnel";
import { products } from "./products";
import { reminders } from "./reminders";
import { reports } from "./reports";
import { users } from "./users";
import { search } from "./search";
import { settings } from "./settings";
import { suppliers } from "./suppliers";
import { vehicles } from "./vehicles";
import { toast } from "./toast";
import { warehouse } from "./warehouse";

export const tr = {
  nav,
  lang,
  apiErrors,
  auth,
  common,
  dashboard,
  guide,
  generalOverhead,
  insuranceTrack,
  personnel,
  profile,
  users,
  settings,
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
