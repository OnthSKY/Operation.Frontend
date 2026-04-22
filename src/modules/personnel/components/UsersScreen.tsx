"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  useCreateUser,
  usePatchUserRole,
  usePatchUserSelfFinancials,
  useUsersList,
} from "@/modules/personnel/hooks/useUsersQueries";
import {
  defaultPersonnelListFilters,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Card } from "@/shared/components/Card";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { appUserAccountStatusTone, StatusBadge } from "@/shared/components/StatusBadge";
import { Button } from "@/shared/ui/Button";
import { Tooltip } from "@/shared/ui/Tooltip";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import type { AppUserRole, UserListItem } from "@/types/user";
import { cn } from "@/lib/cn";
import { ToolbarGlyphUserPlus } from "@/shared/ui/ToolbarGlyph";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useController, useForm } from "react-hook-form";

type FormValues = {
  username: string;
  password: string;
  passwordConfirm: string;
  fullName: string;
  role: AppUserRole;
  personnelId: string;
};

export function UsersScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isReady } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [pulseUserId, setPulseUserId] = useState<number | null>(null);
  const isAdminUser = user?.role === "ADMIN";
  const { data: rows = [], isLoading, isError, refetch } = useUsersList(
    Boolean(isReady && isAdminUser)
  );
  const { data: personnelListResult } = usePersonnelList(defaultPersonnelListFilters);
  const personnel = personnelListResult?.items ?? [];
  const createUser = useCreateUser();
  const patchSelfFin = usePatchUserSelfFinancials();
  const patchRole = usePatchUserRole();

  const personnelNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of personnel) {
      if (!p.isDeleted) m.set(p.id, personnelDisplayName(p));
    }
    return m;
  }, [personnel]);

  useEffect(() => {
    if (isReady && user && user.role !== "ADMIN") router.replace("/personnel");
  }, [isReady, user, router]);

  useEffect(() => {
    const raw = searchParams.get("openUser");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    setPulseUserId(id);
  }, [searchParams]);

  useEffect(() => {
    if (pulseUserId == null || rows.length === 0) return;
    if (!rows.some((r) => r.id === pulseUserId)) return;
    const el = document.getElementById(`global-user-row-${pulseUserId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setPulseUserId(null), 2800);
    return () => window.clearTimeout(timer);
  }, [pulseUserId, rows]);

  const personnelOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("users.personnelPlaceholder") },
      ...personnel
        .filter((p) => !p.isDeleted)
        .map((p) => ({
          value: String(p.id),
          label: personnelDisplayName(p),
        })),
    ],
    [personnel, t]
  );

  const roleOptions: SelectOption[] = useMemo(
    () => [
      { value: "STAFF", label: t("users.roleStaff") },
      { value: "ADMIN", label: t("users.roleAdmin") },
      { value: "PERSONNEL", label: t("users.rolePersonnel") },
      { value: "DRIVER", label: t("users.roleDriver") },
      { value: "VIEWER", label: t("users.roleViewer") },
      { value: "FINANCE", label: t("users.roleFinance") },
      { value: "PROCUREMENT", label: t("users.roleProcurement") },
    ],
    [t]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      username: "",
      password: "",
      passwordConfirm: "",
      fullName: "",
      role: "STAFF",
      personnelId: "",
    },
  });

  const { field: roleField } = useController({
    name: "role",
    control,
    defaultValue: "STAFF",
  });

  const { field: personnelField } = useController({
    name: "personnelId",
    control,
    defaultValue: "",
  });

  function personnelCell(r: UserListItem): string {
    if (r.personnelId == null) return t("users.personnelNone");
    return (
      personnelNameById.get(r.personnelId) ?? String(r.personnelId)
    );
  }

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  async function onRoleChange(r: UserListItem, nextRole: AppUserRole) {
    if (user && r.id === user.id) return;
    const cur = r.role.toUpperCase();
    if (cur === nextRole) return;
    try {
      await patchRole.mutateAsync({ userId: r.id, role: nextRole });
      notify.success(t("users.roleUpdated"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  async function onToggleSelfFin(r: UserListItem, allow: boolean) {
    try {
      await patchSelfFin.mutateAsync({
        userId: r.id,
        allowPersonnelSelfFinancials: allow,
      });
      notify.success(t("users.selfFinancialsUpdated"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    const pw = values.password;
    if (pw.length < 8) {
      notify.error(t("users.passwordTooShort"));
      return;
    }
    if (pw !== values.passwordConfirm) {
      notify.error(t("users.passwordMismatch"));
      return;
    }
    const pidRaw = values.personnelId.trim();
    let personnelId: number | null = null;
    if (pidRaw !== "") {
      const n = Number(pidRaw);
      if (Number.isNaN(n) || n <= 0 || !Number.isInteger(n)) {
        notify.error(t("users.personnelPickInvalid"));
        return;
      }
      personnelId = n;
    }

    if (values.role === "PERSONNEL" && personnelId == null) {
      notify.error(t("users.personnelRequiredForPortalRole"));
      return;
    }

    if (values.role === "DRIVER" && personnelId == null) {
      notify.error(t("users.personnelRequiredForDriverRole"));
      return;
    }

    try {
      await createUser.mutateAsync({
        username: values.username.trim(),
        password: pw,
        fullName: values.fullName.trim() || null,
        role: values.role,
        personnelId,
      });
      notify.success(t("toast.userCreated"));
      reset();
      setModalOpen(false);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  });
  const requestModalClose = () => {
    if (
      isDirty &&
      !createUser.isPending &&
      !window.confirm(t("common.modalConfirmOutsideCloseMessage"))
    ) {
      return;
    }
    setModalOpen(false);
    reset();
  };

  return (
    <>
      <PageScreenScaffold
        className="mx-auto w-full min-w-0 flex-1 app-page-max p-4 md:p-6"
        intro={
          <>
            <div className="min-w-0">
              <Link
                href="/admin/settings"
                className="text-sm font-medium text-violet-700 hover:text-violet-800"
              >
                ← {t("settings.backToSettings")}
              </Link>
              <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
                {t("users.title")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-500">{t("users.description")}</p>
            </div>
            <PageWhenToUseGuide
              guideTab="admin"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.users.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.users.step1") },
                { text: t("pageHelp.users.step2") },
                {
                  text: t("pageHelp.users.step3"),
                  link: {
                    href: "/admin/settings/authorization",
                    label: t("pageHelp.users.step3Link"),
                  },
                },
              ]}
            />
          </>
        }
        main={
          <Card
            className="overflow-hidden"
            title={t("common.pageSectionMain")}
            headerActions={
              <Tooltip content={t("users.addUser")} delayMs={200}>
                <Button
                  type="button"
                  variant="primary"
                  className={TABLE_TOOLBAR_ICON_BTN}
                  onClick={() => setModalOpen(true)}
                  aria-label={t("users.addUser")}
                >
                  <ToolbarGlyphUserPlus className="h-5 w-5" />
                </Button>
              </Tooltip>
            }
          >
        {isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            {t("common.loading")}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 p-8">
            <p className="text-sm text-red-600">{t("users.loadError")}</p>
            <Button type="button" variant="secondary" onClick={() => void refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            {t("users.empty")}
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3 p-3 lg:hidden">
              {rows.map((r) => (
                <li
                  key={r.id}
                  id={`global-user-row-${r.id}`}
                  className={cn(
                    "rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 shadow-sm transition-[box-shadow,ring] duration-500",
                    pulseUserId === r.id &&
                      "ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-50 shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-zinc-900">
                        {r.username}
                      </p>
                      <p className="mt-1 truncate text-sm text-zinc-600">
                        {r.fullName?.trim() || t("personnel.dash")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge tone={appUserAccountStatusTone(r.status)}>
                        {r.status.toUpperCase() === "ACTIVE"
                          ? t("users.statusActive")
                          : t("users.statusInactive")}
                      </StatusBadge>
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-2 border-t border-zinc-200/80 pt-3 text-sm">
                    <div className="flex flex-col gap-1">
                      <dt className="shrink-0 text-zinc-500">{t("users.tableRole")}</dt>
                      <dd
                        title={
                          user && r.id === user.id ? t("users.roleChangeSelfDisabled") : undefined
                        }
                      >
                        <Select
                          className="w-full min-w-0"
                          name={`user-role-${r.id}`}
                          options={roleOptions}
                          value={r.role.toUpperCase()}
                          disabled={
                            Boolean(user && r.id === user.id) ||
                            (patchRole.isPending && patchRole.variables?.userId === r.id)
                          }
                          onBlur={() => {}}
                          onChange={(e) =>
                            void onRoleChange(r, e.target.value as AppUserRole)
                          }
                        />
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="shrink-0 text-zinc-500">
                        {t("users.tablePersonnel")}
                      </dt>
                      <dd className="min-w-0 truncate text-right font-medium text-zinc-800">
                        {personnelCell(r)}
                      </dd>
                    </div>
                    {r.role.toUpperCase() === "DRIVER" ? (
                      <div className="flex flex-col gap-1 border-t border-zinc-200/60 pt-2">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="shrink-0 text-zinc-500">
                            {t("users.tableSelfFinancials")}
                          </dt>
                          <dd>
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-violet-600"
                              checked={Boolean(r.allowPersonnelSelfFinancials)}
                              disabled={
                                patchSelfFin.isPending &&
                                patchSelfFin.variables?.userId === r.id
                              }
                              onChange={(e) => void onToggleSelfFin(r, e.target.checked)}
                              aria-label={t("users.selfFinancialsHint")}
                            />
                          </dd>
                        </div>
                        <p className="text-xs text-zinc-500">{t("users.selfFinancialsHint")}</p>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block lg:overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-700">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableUser")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableName")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableRole")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableStatus")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tablePersonnel")}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-medium">
                      {t("users.tableSelfFinancials")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      id={`global-user-row-${r.id}`}
                      className={cn(
                        "hover:bg-zinc-50/80 transition-[box-shadow] duration-500",
                        pulseUserId === r.id &&
                          "bg-violet-50/50 shadow-[inset_0_0_0_2px_rgb(139_92_246)]"
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                        {r.username}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-600 lg:max-w-none">
                        {r.fullName?.trim() || t("personnel.dash")}
                      </td>
                      <td
                        className="max-w-[11rem] px-4 py-3"
                        title={
                          user && r.id === user.id ? t("users.roleChangeSelfDisabled") : undefined
                        }
                      >
                        <Select
                          className="w-full min-w-0"
                          name={`user-role-${r.id}`}
                          options={roleOptions}
                          value={r.role.toUpperCase()}
                          disabled={
                            Boolean(user && r.id === user.id) ||
                            (patchRole.isPending && patchRole.variables?.userId === r.id)
                          }
                          onBlur={() => {}}
                          onChange={(e) =>
                            void onRoleChange(r, e.target.value as AppUserRole)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={appUserAccountStatusTone(r.status)}>
                          {r.status.toUpperCase() === "ACTIVE"
                            ? t("users.statusActive")
                            : t("users.statusInactive")}
                        </StatusBadge>
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-zinc-600 lg:max-w-xs">
                        {personnelCell(r)}
                      </td>
                      <td className="px-4 py-3">
                        {r.role.toUpperCase() === "DRIVER" ? (
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-violet-600"
                            checked={Boolean(r.allowPersonnelSelfFinancials)}
                            disabled={
                              patchSelfFin.isPending &&
                              patchSelfFin.variables?.userId === r.id
                            }
                            onChange={(e) => void onToggleSelfFin(r, e.target.checked)}
                            title={t("users.selfFinancialsHint")}
                            aria-label={t("users.selfFinancialsHint")}
                          />
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
          </Card>
        }
      />

      <Modal
        open={modalOpen}
        onClose={requestModalClose}
        titleId="create-user-title"
        title={t("users.modalTitle")}
        description={t("users.modalHint")}
        closeButtonLabel={t("common.close")}
        className="w-full max-w-lg"
      >
        <form onSubmit={onSubmit}>
          <ModalFormLayout
            body={
              <FormSection>
                <Input
                  label={t("users.fieldUsername")}
                  labelRequired
                  required
                  autoComplete="username"
                  {...register("username", { required: t("common.required") })}
                  error={errors.username?.message}
                />
                <Input
                  label={t("users.fieldPassword")}
                  labelRequired
                  required
                  type="password"
                  autoComplete="new-password"
                  {...register("password", { required: t("common.required") })}
                  error={errors.password?.message}
                />
                <Input
                  label={t("users.fieldPasswordConfirm")}
                  labelRequired
                  required
                  type="password"
                  autoComplete="new-password"
                  {...register("passwordConfirm", { required: t("common.required") })}
                  error={errors.passwordConfirm?.message}
                />
                <Input
                  label={t("users.fieldFullName")}
                  autoComplete="name"
                  {...register("fullName")}
                  error={errors.fullName?.message}
                />
                <Select
                  label={t("users.fieldRole")}
                  options={roleOptions}
                  name={roleField.name}
                  value={String(roleField.value ?? "STAFF")}
                  onChange={(e) => roleField.onChange(e.target.value as AppUserRole)}
                  onBlur={roleField.onBlur}
                  ref={roleField.ref}
                />
                <Select
                  label={t("users.fieldPersonnel")}
                  options={personnelOptions}
                  name={personnelField.name}
                  value={String(personnelField.value ?? "")}
                  onChange={(e) => personnelField.onChange(e.target.value)}
                  onBlur={personnelField.onBlur}
                  ref={personnelField.ref}
                />
              </FormSection>
            }
            footer={
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-w-[120px]"
                  onClick={requestModalClose}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="min-w-[120px]"
                  disabled={createUser.isPending}
                >
                  {createUser.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </>
            }
          />
        </form>
      </Modal>
    </>
  );
}
