import { auth } from "./auth";
import { branch } from "./branch";
import { common } from "./common";
import { dashboard } from "./dashboard";
import { guide } from "./guide";
import { lang } from "./lang";
import { nav } from "./nav";
import { personnel } from "./personnel";
import { products } from "./products";
import { reports } from "./reports";
import { search } from "./search";
import { toast } from "./toast";
import { users } from "./users";
import { warehouse } from "./warehouse";

export const en = {
  nav,
  lang,
  auth,
  common,
  dashboard,
  guide,
  personnel,
  users,
  branch,
  warehouse,
  products,
  reports,
  search,
  toast,
} as const;

export type Messages = typeof en;
