"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { canSeeFinancialReports, canSeeUiModule, PERM } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { Checkbox } from "@/shared/ui/Checkbox";
import { ModernSelect } from "@/shared/ui/ModernSelect";
import { usePersonnelHeldCashReportQuery } from "@/modules/reports/hooks/usePersonnelHeldCashReportQuery";
import type {
  PersonnelHeldCashReportDetailRow,
  PersonnelHeldCashReportPerBranchRow,
  PersonnelHeldCashReportPerPersonRow,
} from "@/modules/reports/api/personnel-held-cash-report-api";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "personnel" | "branch" | "detail";

function formatAmount(value: number, currency: string): string {
  const fmt = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${fmt.format(value)} ${currency}`;
}

export function PersonnelHeldCashReportScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();

  const canView = useMemo(() => {
    if (!user) return false;
    return canSeeFinancialReports(user) || canSeeUiModule(user, PERM.uiReports);
  }, [user]);

  useEffect(() => {
    if (isReady && user && !canView) router.replace("/");
  }, [isReady, user, canView, router]);

  const query = usePersonnelHeldCashReportQuery(Boolean(canView));

  const [viewMode, setViewMode] = useState<ViewMode>("personnel");
  const [searchText, setSearchText] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
  const [hideZero, setHideZero] = useState(true);

  const availableCurrencies = useMemo<string[]>(() => {
    const set = new Set<string>();
    query.data?.currencyTotals.forEach((c) => set.add(c.currencyCode));
    return Array.from(set).sort();
  }, [query.data]);

  const filteredPerPerson = useMemo<PersonnelHeldCashReportPerPersonRow[]>(() => {
    const rows = query.data?.perPersonnel ?? [];
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (currencyFilter !== "ALL" && r.currencyCode !== currencyFilter) return false;
      if (hideZero && r.remaining === 0) return false;
      if (q.length > 0 && !r.fullName.toLocaleLowerCase("tr-TR").includes(q)) return false;
      return true;
    });
  }, [query.data, searchText, currencyFilter, hideZero]);

  const filteredPerBranch = useMemo<PersonnelHeldCashReportPerBranchRow[]>(() => {
    const rows = query.data?.perBranch ?? [];
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (currencyFilter !== "ALL" && r.currencyCode !== currencyFilter) return false;
      if (hideZero && r.remaining === 0) return false;
      if (q.length > 0 && !r.branchName.toLocaleLowerCase("tr-TR").includes(q)) return false;
      return true;
    });
  }, [query.data, searchText, currencyFilter, hideZero]);

  const filteredDetail = useMemo<PersonnelHeldCashReportDetailRow[]>(() => {
    const rows = query.data?.detail ?? [];
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (currencyFilter !== "ALL" && r.currencyCode !== currencyFilter) return false;
      if (hideZero && r.remaining === 0) return false;
      if (q.length > 0) {
        const hay = `${r.fullName} ${r.branchName}`.toLocaleLowerCase("tr-TR");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query.data, searchText, currencyFilter, hideZero]);

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  const currencyTotals = query.data?.currencyTotals ?? [];

  return (
    <PageScreenScaffold
      className={cn(
        "w-full min-w-0 flex-1 max-md:pt-2 md:pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
      )}
      intro={
        <div className="min-w-0">
          <h1 className="break-words text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:text-xl md:text-2xl">
            Personel Cebindeki Kasa Paraları
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
            Her personelde tutulan kasa nakdi: kimde ne var, ne almış, ne harcamış, başkasına ne
            devretmiş, net ne kalmış. Şube veya personel bazında özet, detay kırılım ve para birimi
            grand-total dökümü içerir.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => query.refetch()}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              disabled={query.isFetching}
            >
              {query.isFetching ? "Yenileniyor…" : "Yenile"}
            </button>
            {query.data && (
              <span className="text-xs text-zinc-500">
                Son hesaplama: {new Date(query.data.generatedAt).toLocaleString("tr-TR")}
              </span>
            )}
          </div>
        </div>
      }
      main={
        <div className="space-y-4">
          {/* GRAND TOTALS — para birimi bazında */}
          {currencyTotals.length === 0 && !query.isLoading ? (
            <Card className="p-6 text-center text-sm text-zinc-500">
              Personelde tutulan kasa nakdi kaydı yok.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currencyTotals.map((c) => (
                <Card key={c.currencyCode} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-zinc-500">
                      {c.currencyCode}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {c.personnelCount} personel · {c.branchCount} şube
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-zinc-900">
                    {formatAmount(c.totalRemaining, c.currencyCode)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">net bakiye (personel cebinde duran)</div>

                  <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <div className="text-zinc-500">Verilen toplam</div>
                    <div className="text-right tabular-nums text-zinc-700">
                      {formatAmount(c.totalReceived + c.totalTransferredIn, c.currencyCode)}
                    </div>
                    <div className="text-zinc-500">Harcanan</div>
                    <div className="text-right tabular-nums text-zinc-700">
                      −{formatAmount(c.totalSpent, c.currencyCode)}
                    </div>
                    <div className="text-zinc-500">Patrona/devir</div>
                    <div className="text-right tabular-nums text-zinc-700">
                      −{formatAmount(c.totalTransferredOut, c.currencyCode)}
                    </div>
                  </div>

                  {c.topHolder && (
                    <div className="mt-3 rounded-md bg-violet-50 px-3 py-2 text-xs">
                      <span className="text-violet-700">En çok elinde tutan:</span>{" "}
                      <span className="font-semibold text-violet-900">{c.topHolder.fullName}</span>{" "}
                      <span className="text-violet-700">·</span>{" "}
                      <span className="font-semibold tabular-nums text-violet-900">
                        {formatAmount(c.topHolder.amount, c.currencyCode)}
                      </span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* FİLTRELER */}
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={viewMode === "branch" ? "Şube ara…" : "Personel veya şube ara…"}
                className="min-w-[14rem] flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <div className="w-full sm:w-auto sm:min-w-[12rem]">
                <ModernSelect
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  aria-label="Para birimi filtresi"
                >
                  <option value="ALL">Tüm para birimleri</option>
                  {availableCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </ModernSelect>
              </div>
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-700">
                <Checkbox checked={hideZero} onCheckedChange={setHideZero} />
                <span>Sıfır bakiyeyi gizle</span>
              </label>
              <div className="ml-auto inline-flex rounded-lg border border-zinc-300 bg-white">
                {(
                  [
                    { v: "personnel", l: "Personele Göre" },
                    { v: "branch", l: "Şubeye Göre" },
                    { v: "detail", l: "Detay" },
                  ] as { v: ViewMode; l: string }[]
                ).map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setViewMode(v)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium first:rounded-l-lg last:rounded-r-lg",
                      viewMode === v ? "bg-violet-600 text-white" : "text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* TABLO */}
          {query.isLoading ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              Yükleniyor…
            </div>
          ) : query.isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Rapor alınamadı: {(query.error as Error)?.message ?? "Bilinmeyen hata"}
            </div>
          ) : viewMode === "personnel" ? (
            <PerPersonnelTable rows={filteredPerPerson} totalCount={query.data?.perPersonnel.length ?? 0} />
          ) : viewMode === "branch" ? (
            <PerBranchTable rows={filteredPerBranch} totalCount={query.data?.perBranch.length ?? 0} />
          ) : (
            <DetailTable rows={filteredDetail} totalCount={query.data?.detail.length ?? 0} />
          )}
        </div>
      }
    />
  );
}

function PerPersonnelTable({
  rows,
  totalCount,
}: {
  rows: PersonnelHeldCashReportPerPersonRow[];
  totalCount: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        Eşleşen personel yok.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500">
        {rows.length} / {totalCount} personel
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left">Personel</th>
            <th className="px-3 py-2 text-left">Para</th>
            <th className="px-3 py-2 text-right">Şube</th>
            <th className="px-3 py-2 text-right">Verilen (alındı + devraldı)</th>
            <th className="px-3 py-2 text-right">Harcadı</th>
            <th className="px-3 py-2 text-right">Devretti</th>
            <th className="px-3 py-2 text-right">Kalan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <tr key={`${r.personnelId}-${r.currencyCode}`}>
              <td className="px-3 py-2 font-medium text-zinc-900">{r.fullName}</td>
              <td className="px-3 py-2 text-zinc-700">{r.currencyCode}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-500">{r.branchCount}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                {formatAmount(r.received + r.transferredIn, r.currencyCode)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                {r.spent > 0 ? `−${formatAmount(r.spent, r.currencyCode)}` : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                {r.transferredOut > 0 ? `−${formatAmount(r.transferredOut, r.currencyCode)}` : "—"}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-semibold tabular-nums",
                  r.remaining < 0 ? "text-red-700" : "text-zinc-900"
                )}
              >
                {formatAmount(r.remaining, r.currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PerBranchTable({
  rows,
  totalCount,
}: {
  rows: PersonnelHeldCashReportPerBranchRow[];
  totalCount: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        Eşleşen şube yok.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500">
        {rows.length} / {totalCount} satır
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left">Şube</th>
            <th className="px-3 py-2 text-left">Para</th>
            <th className="px-3 py-2 text-right">Personel</th>
            <th className="px-3 py-2 text-right">Verilen (alındı + devraldı)</th>
            <th className="px-3 py-2 text-right">Harcandı</th>
            <th className="px-3 py-2 text-right">Devredildi</th>
            <th className="px-3 py-2 text-right">Kalan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <tr key={`${r.branchId}-${r.currencyCode}`}>
              <td className="px-3 py-2 font-medium text-zinc-900">{r.branchName}</td>
              <td className="px-3 py-2 text-zinc-700">{r.currencyCode}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-500">{r.personnelCount}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                {formatAmount(r.received + r.transferredIn, r.currencyCode)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                {r.spent > 0 ? `−${formatAmount(r.spent, r.currencyCode)}` : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                {r.transferredOut > 0 ? `−${formatAmount(r.transferredOut, r.currencyCode)}` : "—"}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-semibold tabular-nums",
                  r.remaining < 0 ? "text-red-700" : "text-zinc-900"
                )}
              >
                {formatAmount(r.remaining, r.currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailTable({
  rows,
  totalCount,
}: {
  rows: PersonnelHeldCashReportDetailRow[];
  totalCount: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        Eşleşen kayıt yok.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500">
        {rows.length} / {totalCount} satır (personel × şube × para)
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left">Personel</th>
            <th className="px-3 py-2 text-left">Şube</th>
            <th className="px-3 py-2 text-left">Para</th>
            <th className="px-3 py-2 text-right">Aldı</th>
            <th className="px-3 py-2 text-right">Devraldı</th>
            <th className="px-3 py-2 text-right">Harcadı</th>
            <th className="px-3 py-2 text-right">Devretti</th>
            <th className="px-3 py-2 text-right">Kalan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r, idx) => (
            <tr key={`${r.personnelId}-${r.branchId}-${r.currencyCode}-${idx}`}>
              <td className="px-3 py-2 font-medium text-zinc-900">{r.fullName}</td>
              <td className="px-3 py-2 text-zinc-700">{r.branchName}</td>
              <td className="px-3 py-2 text-zinc-700">{r.currencyCode}</td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                {formatAmount(r.received, r.currencyCode)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                {r.transferredIn > 0 ? `+${formatAmount(r.transferredIn, r.currencyCode)}` : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                {r.spent > 0 ? `−${formatAmount(r.spent, r.currencyCode)}` : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                {r.transferredOut > 0 ? `−${formatAmount(r.transferredOut, r.currencyCode)}` : "—"}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-semibold tabular-nums",
                  r.remaining < 0 ? "text-red-700" : "text-zinc-900"
                )}
              >
                {formatAmount(r.remaining, r.currencyCode)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
