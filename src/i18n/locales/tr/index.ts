import type { Messages } from "../en";
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
import { users } from "./users";
import { search } from "./search";
import { toast } from "./toast";
import { warehouse } from "./warehouse";

export const tr = {
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
} as unknown as Messages;
