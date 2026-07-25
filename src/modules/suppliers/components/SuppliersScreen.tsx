"use client";

import type { Supplier } from "@/modules/suppliers/api/suppliers-api";
import { SupplierViewModal } from "@/modules/suppliers/components/SupplierViewModal";
import {
  supplierKeys,
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
} from "@/modules/suppliers/hooks/useSupplierQueries";
import { useQueryClient } from "@tanstack/react-query";
import { confirmUndoableDelete } from "@/shared/lib/confirm-undoable-delete";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { TableToolbarMoreMenu } from "@/shared/components/TableToolbarMoreMenu";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { FormSection, ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useRowVersionConflict } from "@/shared/hooks/useRowVersionConflict";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass, EyeIcon, PencilIcon, PlusIcon } from "@/shared/ui/EyeIcon";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Skeleton, SkeletonText } from "@/shared/ui/Skeleton";

/** Tedarikçi listesi yükleme placeholder'ı — 4 satır kart benzeri shimmer. */
function SkeletonTableRowsList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-zinc-100 p-3">
          <Skeleton className="mb-2 h-4 w-1/3" />
          <SkeletonText lines={1} />
        </div>
      ))}
    </div>
  );
}
import { Switch } from "@/shared/ui/Switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { Tooltip } from "@/shared/ui/Tooltip";
import { ToolbarGlyphCoinExpense, ToolbarGlyphReceipt } from "@/shared/ui/ToolbarGlyph";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function SuppliersScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: suppliers = [], isPending: supPending, isError: supErr, error: supError } =
    useSuppliers(includeDeleted);
  const createSup = useCreateSupplier();
  const updateSup = useUpdateSupplier();
  const handleRowVersionConflict = useRowVersionConflict({ invalidate: [["suppliers"]] });
  const deleteSup = useDeleteSupplier();
  const qc = useQueryClient();

  const [supplierModal, setSupplierModal] = useState<"add" | "edit" | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [viewInitialTab, setViewInitialTab] = useState<"general" | "payments" | "summary">("general");
  const searchParams = useSearchParams();

  // Derin-link: /suppliers?openSupplier=ID → liste yüklenince detayını aç, param'ı temizle.
  useEffect(() => {
    const raw = searchParams.get("openSupplier");
    if (!raw || suppliers.length === 0) return;
    const id = Number.parseInt(raw, 10);
    const match = Number.isFinite(id) ? suppliers.find((s) => s.id === id) : undefined;
    if (match) setViewSupplier(match);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("openSupplier");
    const qs = params.toString();
    router.replace(qs ? `/suppliers?${qs}` : "/suppliers");
  }, [searchParams, suppliers, router]);

  const [sfName, setSfName] = useState("");
  const [sfTax, setSfTax] = useState("");
  const [sfPhone, setSfPhone] = useState("");
  const [sfEmail, setSfEmail] = useState("");
  const [sfNotes, setSfNotes] = useState("");
  const [sfTerms, setSfTerms] = useState("");
  const [sfCur, setSfCur] = useState("TRY");
  const isSupplierFormDirty =
    supplierModal === "add"
      ? [
          sfName.trim(),
          sfTax.trim(),
          sfPhone.trim(),
          sfEmail.trim(),
          sfNotes.trim(),
          sfTerms.trim(),
          sfCur.trim() !== "TRY",
        ].some(Boolean)
      : editSupplier != null &&
        (sfName !== editSupplier.name ||
          sfTax !== (editSupplier.taxId ?? "") ||
          sfPhone !== (editSupplier.phone ?? "") ||
          sfEmail !== (editSupplier.email ?? "") ||
          sfNotes !== (editSupplier.notes ?? "") ||
          sfTerms !==
            (editSupplier.defaultPaymentTermsDays != null ? String(editSupplier.defaultPaymentTermsDays) : "") ||
          sfCur !== (editSupplier.currencyCode || "TRY"));

  const closeSupplierModal = () => setSupplierModal(null);
  const requestCloseSupplierModal = useDirtyGuard({
    isDirty: isSupplierFormDirty,
    isBlocked: createSup.isPending || updateSup.isPending,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose: closeSupplierModal,
  });

  const openAddSupplier = () => {
    setEditSupplier(null);
    setSfName("");
    setSfTax("");
    setSfPhone("");
    setSfEmail("");
    setSfNotes("");
    setSfTerms("");
    setSfCur("TRY");
    setSupplierModal("add");
  };

  const openEditSupplier = (s: Supplier) => {
    setEditSupplier(s);
    setSfName(s.name);
    setSfTax(s.taxId ?? "");
    setSfPhone(s.phone ?? "");
    setSfEmail(s.email ?? "");
    setSfNotes(s.notes ?? "");
    setSfTerms(s.defaultPaymentTermsDays != null ? String(s.defaultPaymentTermsDays) : "");
    setSfCur(s.currencyCode || "TRY");
    setSupplierModal("edit");
  };

  const saveSupplier = async () => {
    const name = sfName.trim();
    if (!name) {
      notify.error(t("common.required"));
      return;
    }
    const terms = sfTerms.trim() ? parseInt(sfTerms, 10) : null;
    const body = {
      name,
      taxId: sfTax.trim() || null,
      phone: sfPhone.trim() || null,
      email: sfEmail.trim() || null,
      notes: sfNotes.trim() || null,
      defaultPaymentTermsDays: terms != null && Number.isFinite(terms) ? terms : null,
      currencyCode: sfCur.trim() || "TRY",
    };
    try {
      if (supplierModal === "add") {
        await createSup.mutateAsync(body);
        notify.success(t("toast.supplierCreated"));
      } else if (editSupplier) {
        await updateSup.mutateAsync({
          id: editSupplier.id,
          ...body,
          rowVersion: editSupplier.rowVersion,
        });
        notify.success(t("toast.supplierUpdated"));
      }
      setSupplierModal(null);
    } catch (e) {
      if (handleRowVersionConflict(e)) return;
      notify.error(toErrorMessage(e));
    }
  };

  const supplierMoreItems = useMemo(
    () => [
      {
        id: "invoices",
        label: t("suppliers.invoicesPageTitle"),
        onSelect: () => router.push("/suppliers/invoices"),
      },
    ],
    [t, router]
  );

  const onDeleteSupplier = (s: Supplier) => {
    notifyConfirmToast({
      toastId: "supplier-delete-confirm",
      title: t("suppliers.confirmDeleteSupplier"),
      message: <p className="break-words font-medium text-zinc-900">{s.name}</p>,
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: () => {
        // 5sn'lik geri-alma penceresi — yanlış silmeyi kurtarır
        confirmUndoableDelete<{ id: number }>({
          qc,
          queryKeyPrefix: supplierKeys.all,
          targetId: s.id,
          deleteFn: () => deleteSup.mutateAsync(s.id),
          successMessage: t("toast.supplierDeleted"),
        });
      },
    });
  };

  return (
    <>
      <PageScreenScaffold
        className="w-full p-4 pb-8"
        intro={
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{t("suppliers.title")}</h1>
              <p className="mt-1 text-sm text-zinc-500">{t("suppliers.subtitle")}</p>
            </div>
            <PageWhenToUseGuide
              guideTab="suppliers"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.suppliers.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.suppliers.step1") },
                {
                  text: t("pageHelp.suppliers.step2"),
                  link: { href: "/suppliers/invoices", label: t("pageHelp.suppliers.step2Link") },
                },
                {
                  text: t("pageHelp.suppliers.step3"),
                  link: { href: "/general-overhead", label: t("pageHelp.suppliers.step3Link") },
                },
              ]}
            />
          </>
        }
        main={
          <Card
            title={t("suppliers.suppliersSection")}
            headerActions={
              <>
                <TableToolbarMoreMenu menuId="suppliers-toolbar-more" items={supplierMoreItems} />
                <Tooltip content={t("suppliers.addSupplier")} delayMs={200}>
                  <Button
                    type="button"
                    variant="primary"
                    className={TABLE_TOOLBAR_ICON_BTN}
                    onClick={openAddSupplier}
                    aria-label={t("suppliers.addSupplier")}
                  >
                    <PlusIcon />
                  </Button>
                </Tooltip>
              </>
            }
          >
        <div className="mb-4">
          <label
            className={cn(
              "flex min-h-[3.25rem] cursor-pointer gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-3.5 active:bg-zinc-100/80 sm:min-h-0 sm:items-center sm:px-4 sm:py-3.5"
            )}
          >
            <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-800">
              {t("suppliers.includeDeleted")}
            </span>
            <Switch
              checked={includeDeleted}
              onCheckedChange={setIncludeDeleted}
              className="self-start sm:self-center"
              aria-label={t("suppliers.includeDeleted")}
            />
          </label>
        </div>
        {supErr ? (
          <p className="text-sm text-red-600">{toErrorMessage(supError)}</p>
        ) : supPending ? (
          <SkeletonTableRowsList />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon="🏢"
            title={t("suppliers.noSuppliers")}
            description="Tedarikçi ekleyerek fatura ve ödeme takibini başlatın."
            action={{ label: "Tedarikçi ekle", onClick: () => setSupplierModal("add") }}
          />
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-[1%] whitespace-nowrap">{t("common.actions")}</TableHeader>
                  <TableHeader>{t("suppliers.name")}</TableHeader>
                  <TableHeader>{t("suppliers.currency")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell dataLabel={t("common.actions")} className="align-middle">
                      <div className="inline-flex flex-nowrap items-center gap-1 whitespace-nowrap">
                        {!s.isDeleted ? (
                          <Tooltip content={t("common.delete")} delayMs={200}>
                            <button
                              type="button"
                              className={trashIconActionButtonClass}
                              disabled={deleteSup.isPending}
                              aria-label={t("common.delete")}
                              title={t("common.delete")}
                              onClick={() => onDeleteSupplier(s)}
                            >
                              <TrashIcon />
                            </button>
                          </Tooltip>
                        ) : null}
                        <Tooltip content={t("common.edit")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className={detailOpenIconButtonClass}
                            aria-label={t("common.edit")}
                            title={t("common.edit")}
                            onClick={() => openEditSupplier(s)}
                          >
                            <PencilIcon />
                          </Button>
                        </Tooltip>
                        <Tooltip content={t("suppliers.viewSupplier")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className={detailOpenIconButtonClass}
                            aria-label={t("suppliers.viewSupplier")}
                            title={t("suppliers.viewSupplier")}
                            onClick={() => {
                              setViewInitialTab("general");
                              setViewSupplier(s);
                            }}
                          >
                            <EyeIcon />
                          </Button>
                        </Tooltip>
                        {!s.isDeleted ? (
                          <Tooltip content={locale === "tr" ? "Para öde" : "Pay"} delayMs={200}>
                            <Button
                              type="button"
                              variant="secondary"
                              className={detailOpenIconButtonClass}
                              aria-label={locale === "tr" ? "Para öde" : "Pay"}
                              title={locale === "tr" ? "Para öde" : "Pay"}
                              onClick={() => {
                                setViewInitialTab("payments");
                                setViewSupplier(s);
                              }}
                            >
                              <ToolbarGlyphCoinExpense className="h-5 w-5" />
                            </Button>
                          </Tooltip>
                        ) : null}
                        {!s.isDeleted ? (
                          <Tooltip content={t("suppliers.writeInvoice")} delayMs={200}>
                            <Button
                              type="button"
                              variant="secondary"
                              className={detailOpenIconButtonClass}
                              aria-label={t("suppliers.writeInvoice")}
                              title={t("suppliers.writeInvoice")}
                              onClick={() =>
                                router.push(`/suppliers/invoices?supplierId=${s.id}&newInvoice=1`)
                              }
                            >
                              <ToolbarGlyphReceipt className="h-5 w-5" />
                            </Button>
                          </Tooltip>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.name")} className="font-medium text-zinc-900">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{s.name}</span>
                        {s.isDeleted ? (
                          <StatusBadge tone="deleted">{t("suppliers.viewDeletedBadge")}</StatusBadge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell dataLabel={t("suppliers.currency")} className="text-zinc-600">
                      {s.currencyCode}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
          </Card>
        }
      />

      <SupplierViewModal
        open={viewSupplier != null}
        supplierId={viewSupplier?.id ?? null}
        fallback={viewSupplier}
        initialTab={viewInitialTab}
        onClose={() => setViewSupplier(null)}
      />

      <Modal
        open={supplierModal != null}
        onClose={requestCloseSupplierModal}
        titleId="supplier-form-title"
        title={supplierModal === "add" ? t("suppliers.addSupplier") : t("suppliers.editSupplier")}
        narrow
      >
        <ModalFormLayout
          className="mt-0"
          body={
            <FormSection>
              <Input
                label={t("suppliers.name")}
                labelRequired
                value={sfName}
                onChange={(e) => setSfName(e.target.value)}
                autoFocus
              />
              <Input label={t("suppliers.taxId")} value={sfTax} onChange={(e) => setSfTax(e.target.value)} />
              <Input label={t("suppliers.phone")} value={sfPhone} onChange={(e) => setSfPhone(e.target.value)} />
              <Input label={t("suppliers.email")} value={sfEmail} onChange={(e) => setSfEmail(e.target.value)} />
              <Input label={t("suppliers.notes")} value={sfNotes} onChange={(e) => setSfNotes(e.target.value)} />
              <Input
                label={t("suppliers.paymentTermsDays")}
                value={sfTerms}
                onChange={(e) => setSfTerms(e.target.value)}
              />
              <Input label={t("suppliers.currency")} value={sfCur} onChange={(e) => setSfCur(e.target.value)} />
            </FormSection>
          }
          footer={
            <>
              <Button type="button" variant="secondary" onClick={requestCloseSupplierModal}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={() => void saveSupplier()} disabled={createSup.isPending || updateSup.isPending}>
                {t("common.save")}
              </Button>
            </>
          }
        />
      </Modal>
    </>
  );
}
