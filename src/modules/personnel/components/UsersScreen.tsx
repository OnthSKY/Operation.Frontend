"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  useCreateUser,
  useUsersList,
} from "@/modules/personnel/hooks/useUsersQueries";
import { usePersonnelList } from "@/modules/personnel/hooks/usePersonnelQueries";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Card } from "@/shared/components/Card";
import { Button } from "@/shared/ui/Button";
import { Tooltip } from "@/shared/ui/Tooltip";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import type { AppUserRole, UserListItem } from "@/types/user";
import { useRouter } from "next/navigation";
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

const iconStroke = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24" as const,
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function UserStatusIcon({
  status,
  activeLabel,
  inactiveLabel,
}: {
  status: string;
  activeLabel: string;
  inactiveLabel: string;
}) {
  const isActive = status.toUpperCase() === "ACTIVE";
  const label = isActive ? activeLabel : inactiveLabel;
  return (
    <Tooltip content={label} delayMs={200}>
      <span
        className="inline-flex shrink-0 items-center justify-center"
        aria-label={label}
        role="img"
      >
        {isActive ? (
          <svg {...iconStroke} className="text-emerald-600">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l2.5 2.5L16 10" />
          </svg>
        ) : (
          <svg {...iconStroke} className="text-zinc-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        )}
      </span>
    </Tooltip>
  );
}

function UserRoleIcon({
  role,
  adminLabel,
  staffLabel,
  personnelLabel,
}: {
  role: string;
  adminLabel: string;
  staffLabel: string;
  personnelLabel: string;
}) {
  const u = role.toUpperCase();
  const isAdmin = u === "ADMIN";
  const isPersonnelPortal = u === "PERSONNEL";
  const label = isAdmin ? adminLabel : isPersonnelPortal ? personnelLabel : staffLabel;
  return (
    <Tooltip content={label} delayMs={200}>
      <span
        className="inline-flex shrink-0 items-center justify-center"
        aria-label={label}
        role="img"
      >
        {isAdmin ? (
          <svg {...iconStroke} className="text-violet-600">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        ) : isPersonnelPortal ? (
          <svg {...iconStroke} className="text-amber-600">
            <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
            <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
          </svg>
        ) : (
          <svg {...iconStroke} className="text-sky-600">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </span>
    </Tooltip>
  );
}

export function UsersScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const isAdminUser = user?.role === "ADMIN";
  const { data: rows = [], isLoading, isError, refetch } = useUsersList(
    Boolean(isReady && isAdminUser)
  );
  const { data: personnel = [] } = usePersonnelList();
  const createUser = useCreateUser();

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
    ],
    [t]
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
            {t("users.title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            {t("users.description")}
          </p>
        </div>
        <Button
          type="button"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => setModalOpen(true)}
        >
          {t("users.addUser")}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
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
            <ul className="flex flex-col gap-3 p-3 md:hidden">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 shadow-sm"
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
                      <UserRoleIcon
                        role={r.role}
                        adminLabel={t("users.roleAdmin")}
                        staffLabel={t("users.roleStaff")}
                        personnelLabel={t("users.rolePersonnel")}
                      />
                      <UserStatusIcon
                        status={r.status}
                        activeLabel={t("users.statusActive")}
                        inactiveLabel={t("users.statusInactive")}
                      />
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-2 border-t border-zinc-200/80 pt-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="shrink-0 text-zinc-500">
                        {t("users.tablePersonnel")}
                      </dt>
                      <dd className="min-w-0 truncate text-right font-medium text-zinc-800">
                        {personnelCell(r)}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden md:block md:overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/80">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                        {r.username}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-600 lg:max-w-none">
                        {r.fullName?.trim() || t("personnel.dash")}
                      </td>
                      <td className="px-4 py-3">
                        <UserRoleIcon
                          role={r.role}
                          adminLabel={t("users.roleAdmin")}
                          staffLabel={t("users.roleStaff")}
                          personnelLabel={t("users.rolePersonnel")}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <UserStatusIcon
                          status={r.status}
                          activeLabel={t("users.statusActive")}
                          inactiveLabel={t("users.statusInactive")}
                        />
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-zinc-600 lg:max-w-xs">
                        {personnelCell(r)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          reset();
        }}
        titleId="create-user-title"
        title={t("users.modalTitle")}
        description={t("users.modalHint")}
        closeButtonLabel={t("common.close")}
      >
        <form className="mt-4 flex flex-col gap-4" onSubmit={onSubmit}>
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
          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="sm:min-w-[120px]"
              onClick={() => {
                setModalOpen(false);
                reset();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="sm:min-w-[120px]"
              disabled={createUser.isPending}
            >
              {createUser.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
