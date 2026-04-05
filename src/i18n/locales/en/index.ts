import { auth } from "./auth";
import { branch } from "./branch";
import { common } from "./common";
import { dashboard } from "./dashboard";
import { lang } from "./lang";
import { nav } from "./nav";
import { personnel } from "./personnel";
import { products } from "./products";
import { search } from "./search";
import { toast } from "./toast";
import { warehouse } from "./warehouse";

export const en = {
  nav,
  lang,
  auth,
  common,
  dashboard,
  personnel,
  branch,
  warehouse,
  products,
  search,
  toast,
} as const;

export type Messages = typeof en;
