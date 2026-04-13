import type { AuthUser } from "@/lib/auth/types";
import { useI18n } from "@/i18n/context";
import { notify } from "@/shared/lib/notify";
import { fetchMyAudit, fetchTotpStatus } from "@/modules/account/api/account-api";
import { useCallback, useState } from "react";
import type { MyAuditLogItem, TotpStatusPayload } from "@/lib/auth/types";

export function useAccountRemoteData(user: AuthUser | null) {
  const { t } = useI18n();
  const [status, setStatus] = useState<TotpStatusPayload | null>(null);
  const [audit, setAudit] = useState<MyAuditLogItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let totpFailed = false;
    let auditFailed = false;
    try {
      setStatus(await fetchTotpStatus());
    } catch {
      totpFailed = true;
      setStatus(null);
    }
    try {
      setAudit(await fetchMyAudit(40));
    } catch {
      auditFailed = true;
      setAudit([]);
    }
    if (totpFailed && auditFailed) notify.error(t("profile.loadFailed"));
    else if (auditFailed) notify.error(t("profile.auditLoadFailed"));
    else if (totpFailed) notify.error(t("profile.loadFailed"));
    setLoading(false);
  }, [user, t]);

  const refreshTotp = useCallback(async () => {
    if (!user) return;
    try {
      setStatus(await fetchTotpStatus());
    } catch {
      notify.error(t("profile.loadFailed"));
      setStatus(null);
    }
  }, [user, t]);

  const refreshAudit = useCallback(async () => {
    if (!user) return;
    try {
      setAudit(await fetchMyAudit(40));
    } catch {
      notify.error(t("profile.auditLoadFailed"));
      setAudit([]);
    }
  }, [user, t]);

  return {
    status,
    audit,
    loading,
    refreshAll,
    refreshTotp,
    refreshAudit,
  };
}
