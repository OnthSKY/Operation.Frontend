import { ApiError } from "@/lib/api/base-api";
import { useI18n } from "@/i18n/context";
import { notify } from "@/shared/lib/notify";
import {
  postTotpDisable,
  postTotpSetupCancel,
  postTotpSetupConfirm,
  postTotpSetupStart,
} from "@/modules/account/api/account-api";
import { useCallback, useState, type FormEvent } from "react";

type Params = {
  refreshTotp: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

export function useTotpSetupActions({ refreshTotp, refreshMe }: Params) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const startSetup = useCallback(async () => {
    setBusy(true);
    try {
      await postTotpSetupStart();
      await refreshTotp();
      setConfirmCode("");
      notify.success(t("profile.setupStarted"));
    } catch (e) {
      notify.error(e instanceof ApiError ? e.message : t("toast.loadFailed"));
    } finally {
      setBusy(false);
    }
  }, [refreshTotp, t]);

  const confirmSetup = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setBusy(true);
      try {
        await postTotpSetupConfirm(confirmCode);
        await refreshTotp();
        await refreshMe();
        setConfirmCode("");
        notify.success(t("profile.confirmed"));
      } catch (e) {
        notify.error(e instanceof ApiError ? e.message : t("toast.loadFailed"));
      } finally {
        setBusy(false);
      }
    },
    [confirmCode, refreshMe, refreshTotp, t]
  );

  const cancelSetup = useCallback(async () => {
    setBusy(true);
    try {
      await postTotpSetupCancel();
      await refreshTotp();
      setConfirmCode("");
    } catch {
      notify.error(t("toast.loadFailed"));
    } finally {
      setBusy(false);
    }
  }, [refreshTotp, t]);

  const disableTotp = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setBusy(true);
      try {
        await postTotpDisable(disablePassword, disableCode);
        setDisablePassword("");
        setDisableCode("");
        await refreshTotp();
        await refreshMe();
        notify.success(t("profile.disabled"));
      } catch (e) {
        notify.error(e instanceof ApiError ? e.message : t("toast.loadFailed"));
      } finally {
        setBusy(false);
      }
    },
    [disableCode, disablePassword, refreshMe, refreshTotp, t]
  );

  return {
    busy,
    confirmCode,
    setConfirmCode,
    disablePassword,
    setDisablePassword,
    disableCode,
    setDisableCode,
    startSetup,
    confirmSetup,
    cancelSetup,
    disableTotp,
  };
}
