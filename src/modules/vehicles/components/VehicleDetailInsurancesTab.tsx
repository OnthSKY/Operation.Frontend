"use client";

import type { Locale } from "@/i18n/messages";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { MobileListCard } from "@/shared/components/MobileListCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { cn } from "@/lib/cn";
import type { VehicleInsurance } from "@/types/vehicle";

/**
 * Detay overlay → Insurances tab.
 *  - Mobil: kompakt kart; üstte tür + kalan gün rozeti, altta etiketli mini-grid
 *    (Şirket / Poliçe / Başlangıç / Bitiş / Tutar), en altta düzenle/sil.
 *  - Masaüstü: tek tablo (tür + şirket + poliçe + başl/bitiş + tutar + aksiyonlar).
 */
export function VehicleDetailInsurancesTab({
  insurances,
  canEdit,
  locale,
  onAddInsurance,
  onEditInsurance,
  onDeleteInsurance,
  t,
}: {
  insurances: VehicleInsurance[];
  canEdit: boolean;
  locale: Locale;
  onAddInsurance: () => void;
  onEditInsurance: (x: VehicleInsurance) => void;
  onDeleteInsurance: (insuranceId: number) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {canEdit ? (
        <Button
          type="button"
          className="w-full !min-h-11 self-stretch px-3 text-sm sm:w-auto sm:!min-h-9 sm:self-start"
          onClick={onAddInsurance}
        >
          {t("vehicles.addInsurance")}
        </Button>
      ) : null}
      {insurances.length === 0 ? (
        <EmptyState
          icon="📋"
          title={t("vehicles.emptyInsurances")}
          description="Aracın sigorta poliçelerini ekleyerek bitiş tarihlerini takip edin."
          compact
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2 md:hidden">
            {insurances.map((x) => (
              <InsuranceMobileCard
                key={x.id}
                row={x}
                canEdit={canEdit}
                locale={locale}
                onEdit={onEditInsurance}
                onDelete={onDeleteInsurance}
                t={t}
              />
            ))}
          </ul>
          <div className="-mx-1 hidden min-w-0 overflow-x-auto rounded-lg sm:mx-0 md:block">
            <Table className="min-w-[44rem] text-sm sm:min-w-0 sm:text-[0.9rem]">
              <TableHead>
                <TableRow>
                  <TableHeader>{t("vehicles.insuranceType")}</TableHeader>
                  <TableHeader>{t("vehicles.provider")}</TableHeader>
                  <TableHeader>{t("vehicles.policyNumber")}</TableHeader>
                  <TableHeader>{t("vehicles.startDate")}</TableHeader>
                  <TableHeader>{t("vehicles.endDate")}</TableHeader>
                  <TableHeader className="text-right">
                    {t("vehicles.amount")}
                  </TableHeader>
                  <TableHeader className="w-[1%]" />
                </TableRow>
              </TableHead>
              <TableBody>
                {insurances.map((x) => {
                  const tone = remainingTone(x.endDate);
                  return (
                    <TableRow key={x.id}>
                      <TableCell className="font-medium text-zinc-900">
                        {x.insuranceType}
                      </TableCell>
                      <TableCell>{x.provider ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-zinc-700">
                        {x.policyNumber ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-zinc-600">
                        {x.startDate.slice(0, 10)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={cn("inline-flex items-center gap-1.5", tone.text)}>
                          <span
                            className={cn(
                              "inline-block h-1.5 w-1.5 rounded-full",
                              tone.dot,
                            )}
                            aria-hidden
                          />
                          {x.endDate.slice(0, 10)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {x.amount != null
                          ? formatLocaleAmount(x.amount, locale)
                          : "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        {canEdit ? (
                          <div className="flex min-w-[7rem] items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              className="!min-h-9 px-2 text-sm"
                              onClick={() => onEditInsurance(x)}
                            >
                              {t("common.edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="!min-h-9 px-2 text-sm text-red-700 hover:bg-red-50"
                              onClick={() => onDeleteInsurance(x.id)}
                            >
                              {t("vehicles.delete")}
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function InsuranceMobileCard({
  row,
  canEdit,
  locale,
  onEdit,
  onDelete,
  t,
}: {
  row: VehicleInsurance;
  canEdit: boolean;
  locale: Locale;
  onEdit: (x: VehicleInsurance) => void;
  onDelete: (insuranceId: number) => void;
  t: (k: string) => string;
}) {
  const tone = remainingTone(row.endDate);
  const remaining = (loc: Locale) => remainingDaysLabel(row.endDate, loc);
  return (
    <MobileListCard as="li" className="flex flex-col gap-2.5 bg-white p-3">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
          {row.insuranceType}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
            tone.bg,
            tone.text,
          )}
        >
          {remaining(locale)}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <Field label={t("vehicles.provider")} value={row.provider ?? "—"} />
        <Field
          label={t("vehicles.policyNumber")}
          value={row.policyNumber ?? "—"}
          mono
        />
        <Field
          label={t("vehicles.startDate")}
          value={row.startDate.slice(0, 10)}
        />
        <Field
          label={t("vehicles.endDate")}
          value={row.endDate.slice(0, 10)}
          tone={tone.text}
        />
        <Field
          label={t("vehicles.amount")}
          value={row.amount != null ? formatLocaleAmount(row.amount, locale) : "—"}
          colSpan
          numeric
        />
      </dl>
      {canEdit ? (
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
          <Button
            type="button"
            variant="ghost"
            className="!min-h-10 flex-1 px-2 text-xs font-medium"
            onClick={() => onEdit(row)}
          >
            {t("common.edit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="!min-h-10 flex-1 px-2 text-xs font-medium text-red-700 hover:bg-red-50"
            onClick={() => onDelete(row.id)}
          >
            {t("vehicles.delete")}
          </Button>
        </div>
      ) : null}
    </MobileListCard>
  );
}

function Field({
  label,
  value,
  colSpan,
  mono,
  numeric,
  tone,
}: {
  label: string;
  value: string;
  colSpan?: boolean;
  mono?: boolean;
  numeric?: boolean;
  tone?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", colSpan && "col-span-2")}>
      <dt className="text-[0.6rem] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd
        className={cn(
          "truncate text-zinc-800",
          mono && "font-mono text-[0.7rem]",
          numeric && "tabular-nums font-medium",
          tone,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

type Tone = { text: string; bg: string; dot: string };

function remainingTone(endDate: string): Tone {
  const days = daysUntil(endDate);
  if (days == null) return { text: "text-zinc-500", bg: "bg-zinc-100", dot: "bg-zinc-400" };
  if (days < 0) return { text: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" };
  if (days <= 30) return { text: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" };
  return { text: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" };
}

function remainingDaysLabel(endDate: string, locale: Locale): string {
  const days = daysUntil(endDate);
  const tr = locale === "tr";
  if (days == null) return "—";
  if (days < 0) return tr ? "Süresi geçti" : "Expired";
  if (days === 0) return tr ? "Son gün" : "Last day";
  return tr ? `${days} gün kaldı` : `${days} days left`;
}

function daysUntil(iso: string): number | null {
  const end = new Date(iso.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  return Math.round(diffMs / 86_400_000);
}
