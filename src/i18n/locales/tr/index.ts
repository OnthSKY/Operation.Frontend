import type { Messages } from "../en";
import { branch } from "./branch";
import { common } from "./common";
import { dashboard } from "./dashboard";
import { lang } from "./lang";
import { nav } from "./nav";
import { personnel } from "./personnel";
import { search } from "./search";
import { toast } from "./toast";
import { warehouse } from "./warehouse";

export const tr = {
  nav,
  lang,
  common,
  dashboard,
  personnel,
  branch,
  warehouse,
  search,
  toast,
} as unknown as Messages;
