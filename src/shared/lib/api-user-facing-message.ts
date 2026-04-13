import { toErrorMessage } from "@/shared/lib/error-message";

export function apiUserFacingMessage(err: unknown, t: (key: string) => string): string {
  const m = toErrorMessage(err);
  if (m === "network") return t("common.networkError");
  if (m === "Invalid JSON response") return t("common.apiMalformed");
  return m;
}
