"use client";

import type { Supplier } from "@/modules/suppliers/api/suppliers-api";
import { SupplierViewModal } from "@/modules/suppliers/components/SupplierViewModal";
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
} from "@/modules/suppliers/hooks/useSupplierQueries";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { TableToolbarMoreMenu } from "@/shared/components/TableToolbarMoreMenu";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass, EyeIcon, PencilIcon, PlusIcon } from "@/shared/ui/EyeIcon";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Switch } from "@/shared/ui/Switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import { Tooltip } from "@/shared/ui/Tooltip";
import { ToolbarGlyphReceipt } from "@/shared/ui/ToolbarGlyph";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function SuppliersScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: suppliers = [], isPending: supPending, isError: supErr, error: supError } =
    useSuppliers(includeDeleted);
  const createSup = useCreateSupplier();
  const updateSup = useUpdateSupplier();
  const deleteSup = useDeleteSupplier();

  const [supplierModal, setSupplierModal] = useState<"add" | "edit" | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [sfName, setSfName] = useState("");
  const [sfTax, setSfTax] = useState("");
  const [sfPhone, setSfPhone] = useState("");
  const [sfEmail, setSfEmail] = useState("");
  const [sfNotes, setSfNotes] = useState("");
  const [sfTerms, setSfTerms] = useState("");
  const [sfCur, setSfCur] = useState("TRY");

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
        await updateSup.mutateAsync({ id: editSupplier.id, ...body });
        notify.success(t("toast.supplierUpdated"));
      }
      setSupplierModal(null);
    } catch (e) {
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
      onConfirm: async () => {
        try {
          await deleteSup.mutateAsync(s.id);
          notify.success(t("toast.supplierDeleted"));
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
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
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : suppliers.length === 0 ? (
          <p className="text-sm text-zinc-600">{t("suppliers.noSuppliers")}</p>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("suppliers.name")}</TableHeader>
                  <TableHeader>{t("suppliers.currency")}</TableHeader>
                  <TableHeader className="text-right whitespace-nowrap">{t("common.actions")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
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
                    <TableCell dataLabel={t("common.actions")} className="text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        <Tooltip content={t("suppliers.viewSupplier")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className={detailOpenIconButtonClass}
                            aria-label={t("suppliers.viewSupplier")}
                            title={t("suppliers.viewSupplier")}
                            onClick={() => setViewSupplier(s)}
                          >
                            <EyeIcon />
                          </Button>
                        </Tooltip>
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
                        {!s.isDeleted ? (
                          <>
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
                          </>
                        ) : null}
                      </div>
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
        onClose={() => setViewSupplier(null)}
      />

      <Modal
        open={supplierModal != null}
        onClose={() => setSupplierModal(null)}
        titleId="supplier-form-title"
        title={supplierModal === "add" ? t("suppliers.addSupplier") : t("suppliers.editSupplier")}
        narrow
      >
        <div className="flex flex-col gap-3 p-1">
          <Input label={t("suppliers.name")} labelRequired value={sfName} onChange={(e) => setSfName(e.target.value)} />
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
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSupplierModal(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void saveSupplier()} disabled={createSup.isPending || updateSup.isPending}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
