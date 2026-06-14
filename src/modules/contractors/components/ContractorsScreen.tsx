"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Contractor } from "@/modules/contractors/api/contractors-api";
import {
  useContractors,
  useCreateContractor,
  useDeleteContractor,
  useUpdateContractor,
} from "@/modules/contractors/hooks/useContractorQueries";
import { useContractorDetailOverlay } from "@/shared/contractor-detail";
import {
  ContractorEntryDialog,
  type ContractorEntryMode,
} from "@/modules/contractors/components/ContractorEntryDialog";
import {
  BranchQuickActionsMenu,
  type QuickActionsMenuSection,
} from "@/modules/branch/components/BranchQuickActionsMenu";
import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass, EyeIcon, PencilIcon, PlusIcon } from "@/shared/ui/EyeIcon";
import { cn } from "@/lib/cn";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Switch } from "@/shared/ui/Switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { Tooltip } from "@/shared/ui/Tooltip";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";

export function ContractorsScreen() {
  const { t, locale } = useI18n();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: contractors = [], isPending, isError, error } = useContractors(includeDeleted);
  const createC = useCreateContractor();
  const updateC = useUpdateContractor();
  const deleteC = useDeleteContractor();

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editC, setEditC] = useState<Contractor | null>(null);
  const { openContractorDetail } = useContractorDetailOverlay();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derin-link: /contractors?openContractor=ID → detayı (shared overlay) aç, param'ı temizle.
  useEffect(() => {
    const raw = searchParams.get("openContractor");
    if (!raw) return;
    const id = Number.parseInt(raw, 10);
    if (Number.isFinite(id) && id > 0) openContractorDetail(id);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("openContractor");
    const qs = params.toString();
    router.replace(qs ? `/contractors?${qs}` : "/contractors");
  }, [searchParams, router, openContractorDetail]);

  // Derin-link: /contractors?new=1 → add modal'ını otomatik aç.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setModal("add");
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("new");
    const qs = params.toString();
    router.replace(qs ? `/contractors?${qs}` : "/contractors");
  }, [searchParams, router]);

  // Hızlı işlem: contractorId null → kişi seçici (üst butonlar); dolu → o satırın kişisi ön-seçili.
  const [quickEntry, setQuickEntry] = useState<{ mode: ContractorEntryMode; contractorId: number | null } | null>(null);
  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fNationalId, setFNationalId] = useState("");
  const [fNotes, setFNotes] = useState("");

  const isFormDirty =
    modal === "add"
      ? [fName.trim(), fPhone.trim(), fNationalId.trim(), fNotes.trim()].some(Boolean)
      : editC != null &&
        (fName !== editC.displayName ||
          fPhone !== (editC.phone ?? "") ||
          fNationalId !== (editC.nationalId ?? "") ||
          fNotes !== (editC.notes ?? ""));

  const closeModal = () => setModal(null);
  const requestCloseModal = useDirtyGuard({
    isDirty: isFormDirty,
    isBlocked: createC.isPending || updateC.isPending,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose: closeModal,
  });

  const openAdd = () => {
    setEditC(null);
    setFName("");
    setFPhone("");
    setFNationalId("");
    setFNotes("");
    setModal("add");
  };

  const openEdit = (c: Contractor) => {
    setEditC(c);
    setFName(c.displayName);
    setFPhone(c.phone ?? "");
    setFNationalId(c.nationalId ?? "");
    setFNotes(c.notes ?? "");
    setModal("edit");
  };

  const save = async () => {
    const displayName = fName.trim();
    if (!displayName) {
      notify.error(t("common.required"));
      return;
    }
    const body = {
      displayName,
      phone: fPhone.trim() || null,
      nationalId: fNationalId.trim() || null,
      notes: fNotes.trim() || null,
    };
    try {
      if (modal === "add") {
        await createC.mutateAsync(body);
        notify.success(t("contractors.toastCreated"));
      } else if (editC) {
        await updateC.mutateAsync({ id: editC.id, ...body });
        notify.success(t("contractors.toastUpdated"));
      }
      setModal(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onDelete = (c: Contractor) => {
    notifyConfirmToast({
      toastId: "contractor-delete-confirm",
      title: t("contractors.confirmDelete"),
      message: <p className="break-words font-medium text-zinc-900">{c.displayName}</p>,
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await deleteC.mutateAsync(c.id);
          notify.success(t("contractors.toastDeleted"));
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });
  };

  const money = (n: number) => formatLocaleAmount(n, locale, "TRY");

  // Hızlı işlem (liste sayfasından kişi seçerek iş/ödeme): yalnızca aktif kişiler seçilebilir.
  const activeContractors = contractors
    .filter((c) => !c.isDeleted)
    .map((c) => ({ id: c.id, displayName: c.displayName }));
  const hasActiveContractors = activeContractors.length > 0;

  // Hızlı işlem menüsü: tek buton → "İş ekle" / "Ödeme ekle"; dialog açılır, kişi içeride seçilir.
  const quickSections: QuickActionsMenuSection[] = [
    {
      storyTitle: t("contractors.quickMenuStory"),
      items: [
        {
          id: "work",
          label: t("contractors.addWork"),
          onSelect: () => setQuickEntry({ mode: "work", contractorId: null }),
        },
        {
          id: "payment",
          label: t("contractors.addPayment"),
          onSelect: () => setQuickEntry({ mode: "payment", contractorId: null }),
        },
      ],
    },
  ];

  return (
    <>
      <PageScreenScaffold
        className="w-full p-4 pb-8"
        intro={
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{t("contractors.title")}</h1>
            <p className="mt-1 text-sm text-zinc-500">{t("contractors.subtitle")}</p>
          </div>
        }
        main={
          <Card
            title={t("contractors.listSection")}
            headerActions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {hasActiveContractors ? (
                  <BranchQuickActionsMenu
                    menuId="contractors-quick"
                    triggerLabel={t("contractors.quickActions")}
                    sections={quickSections}
                  />
                ) : null}
                <Tooltip content={t("contractors.addContractor")} delayMs={200}>
                  <Button
                    type="button"
                    variant="primary"
                    className={TABLE_TOOLBAR_ICON_BTN}
                    onClick={openAdd}
                    aria-label={t("contractors.addContractor")}
                  >
                    <PlusIcon />
                  </Button>
                </Tooltip>
              </div>
            }
          >
            <div className="mb-4">
              <label className="flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3.5">
                <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-800">
                  {t("contractors.includeDeleted")}
                </span>
                <Switch
                  checked={includeDeleted}
                  onCheckedChange={setIncludeDeleted}
                  aria-label={t("contractors.includeDeleted")}
                />
              </label>
            </div>

            {isError ? (
              <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
            ) : isPending ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : contractors.length === 0 ? (
              <p className="text-sm text-zinc-600">{t("contractors.empty")}</p>
            ) : (
              <div className="-mx-1 px-1">
                <ul className="flex flex-col gap-2 md:hidden">
                  {contractors.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="min-w-0 break-words text-sm font-semibold text-zinc-900">
                              {c.displayName}
                            </span>
                            {c.isDeleted ? (
                              <StatusBadge tone="deleted">{t("contractors.deletedBadge")}</StatusBadge>
                            ) : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight text-zinc-500">
                            <span>
                              {t("contractors.totalWork")}:{" "}
                              <span className="font-medium tabular-nums text-zinc-700">{money(c.totalWork)}</span>
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                              {t("contractors.totalPaid")}:{" "}
                              <span className="font-medium tabular-nums text-zinc-700">{money(c.totalPaid)}</span>
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                            <span className="text-zinc-500">{t("contractors.balance")}:</span>
                            {c.balance > 0 ? (
                              <span className="font-semibold tabular-nums text-red-600">{money(c.balance)}</span>
                            ) : null}
                            <span
                              className={
                                c.balance > 0
                                  ? "inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700"
                                  : "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                              }
                            >
                              {c.balance > 0 ? t("contractors.hasDebt") : t("contractors.noDebt")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                        {!c.isDeleted ? (
                          <Tooltip content={t("common.delete")} delayMs={200}>
                            <button
                              type="button"
                              className={cn(
                                trashIconActionButtonClass,
                                "h-9 min-h-9 w-9 min-w-9 border-2 border-red-200 bg-white shadow-sm ring-1 ring-red-100/80 hover:border-red-300 hover:bg-red-50/90 active:bg-red-100"
                              )}
                              disabled={deleteC.isPending}
                              aria-label={t("common.delete")}
                              onClick={() => onDelete(c)}
                            >
                              <TrashIcon />
                            </button>
                          </Tooltip>
                        ) : (
                          <span />
                        )}
                        <div className="inline-flex items-center gap-1">
                          <Tooltip content={t("common.edit")} delayMs={200}>
                            <Button
                              type="button"
                              variant="secondary"
                              className={`${detailOpenIconButtonClass} h-9 min-h-9 w-9 min-w-9`}
                              aria-label={t("common.edit")}
                              onClick={() => openEdit(c)}
                            >
                              <PencilIcon />
                            </Button>
                          </Tooltip>
                          <Tooltip content={t("contractors.openDetail")} delayMs={200}>
                            <Button
                              type="button"
                              variant="secondary"
                              className={`${detailOpenIconButtonClass} h-9 min-h-9 w-9 min-w-9`}
                              aria-label={t("contractors.openDetail")}
                              onClick={() => openContractorDetail(c.id)}
                            >
                              <EyeIcon />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>{t("contractors.name")}</TableHeader>
                      <TableHeader className="text-right whitespace-nowrap">{t("contractors.totalWork")}</TableHeader>
                      <TableHeader className="text-right whitespace-nowrap">{t("contractors.totalPaid")}</TableHeader>
                      <TableHeader className="text-right whitespace-nowrap">{t("contractors.balance")}</TableHeader>
                      <TableHeader className="text-right whitespace-nowrap">{t("common.actions")}</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contractors.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell dataLabel={t("contractors.name")} className="font-medium text-zinc-900">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{c.displayName}</span>
                            {c.isDeleted ? (
                              <StatusBadge tone="deleted">{t("contractors.deletedBadge")}</StatusBadge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell dataLabel={t("contractors.totalWork")} className="text-right tabular-nums text-zinc-600">
                          {money(c.totalWork)}
                        </TableCell>
                        <TableCell dataLabel={t("contractors.totalPaid")} className="text-right tabular-nums text-zinc-600">
                          {money(c.totalPaid)}
                        </TableCell>
                        <TableCell dataLabel={t("contractors.balance")} className="text-right tabular-nums">
                          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                            {c.balance > 0 ? (
                              <span className="font-semibold text-red-600">
                                {money(c.balance)}
                              </span>
                            ) : null}
                            <span
                              className={
                                c.balance > 0
                                  ? "inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700"
                                  : "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                              }
                            >
                              {c.balance > 0 ? t("contractors.hasDebt") : t("contractors.noDebt")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell dataLabel="" className="text-right">
                          <div className="flex w-full items-center justify-between gap-2 sm:inline-flex sm:w-auto sm:justify-end sm:gap-1">
                            {!c.isDeleted ? (
                              <Tooltip content={t("common.delete")} delayMs={200}>
                                <button
                                  type="button"
                                  className={cn(
                                    trashIconActionButtonClass,
                                    "border-2 border-red-200 bg-white shadow-sm ring-1 ring-red-100/80 hover:border-red-300 hover:bg-red-50/90 active:bg-red-100 sm:border sm:shadow-none sm:ring-0"
                                  )}
                                  disabled={deleteC.isPending}
                                  aria-label={t("common.delete")}
                                  title={t("common.delete")}
                                  onClick={() => onDelete(c)}
                                >
                                  <TrashIcon />
                                </button>
                              </Tooltip>
                            ) : (
                              <span />
                            )}
                            <div className="inline-flex flex-wrap items-center justify-end gap-1">
                              <Tooltip content={t("common.edit")} delayMs={200}>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className={detailOpenIconButtonClass}
                                  aria-label={t("common.edit")}
                                  title={t("common.edit")}
                                  onClick={() => openEdit(c)}
                                >
                                  <PencilIcon />
                                </Button>
                              </Tooltip>
                              <Tooltip content={t("contractors.openDetail")} delayMs={200}>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className={detailOpenIconButtonClass}
                                  aria-label={t("contractors.openDetail")}
                                  title={t("contractors.openDetail")}
                                  onClick={() => openContractorDetail(c.id)}
                                >
                                  <EyeIcon />
                                </Button>
                              </Tooltip>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </Card>
        }
      />

      <ContractorEntryDialog
        open={quickEntry != null}
        mode={quickEntry?.mode ?? "work"}
        contractorId={quickEntry?.contractorId ?? null}
        contractors={activeContractors}
        onClose={() => setQuickEntry(null)}
      />

      <Modal
        open={modal != null}
        onClose={requestCloseModal}
        titleId="contractor-form-title"
        title={modal === "add" ? t("contractors.addContractor") : t("contractors.editContractor")}
        narrow
      >
        <ModalFormLayout
          className="mt-0"
          body={
            <FormSection>
              <Input
                label={t("contractors.name")}
                labelRequired
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                autoFocus
              />
              <Input label={t("contractors.phone")} value={fPhone} onChange={(e) => setFPhone(e.target.value)} />
              <Input
                label={t("contractors.nationalId")}
                value={fNationalId}
                onChange={(e) => setFNationalId(e.target.value)}
              />
              <Input label={t("contractors.notes")} value={fNotes} onChange={(e) => setFNotes(e.target.value)} />
            </FormSection>
          }
          footer={
            <>
              <Button type="button" variant="secondary" onClick={requestCloseModal}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => void save()}
                disabled={createC.isPending || updateC.isPending}
              >
                {t("common.save")}
              </Button>
            </>
          }
        />
      </Modal>
    </>
  );
}
