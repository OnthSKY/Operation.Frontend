"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { PERM, hasPermissionCode } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { usePersonnelHeldCashReconciliationQuery } from "@/modules/admin/hooks/usePersonnelHeldCashReconciliationQuery";
import type { PersonnelHeldCashReconciliationRow } from "@/modules/admin/api/personnel-held-cash-reconciliation-api";
import { PersonnelHeldCashAutoFixWizard } from "@/modules/admin/components/PersonnelHeldCashAutoFixWizard";
import { PersonnelHeldCashDrillDownModal } from "@/modules/admin/components/PersonnelHeldCashDrillDownModal";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type FilterMode = "all" | "negativeOnly" | "claimOnly" | "affectedOnly";

function formatAmount(value: number, currency: string): string {
  const fmt = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${fmt.format(value)} ${currency}`;
}

function formatDelta(value: number, currency: string): string {
  if (value === 0) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatAmount(value, currency)}`;
}

export function PersonnelHeldCashReconciliationScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const isAdmin = hasPermissionCode(user, PERM.systemAdmin);

  useEffect(() => {
    if (isReady && user && !isAdmin) router.replace("/personnel");
  }, [isReady, user, isAdmin, router]);

  const query = usePersonnelHeldCashReconciliationQuery(Boolean(isAdmin));

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchText, setSearchText] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  // Deep link: ?openWizard=1 → veri geldikten sonra sihirbazı otomatik aç.
  // Yetki yoksa veya satır boşsa sessizce yoksay; URL'yi temizle ki refresh'te
  // tekrar açılmasın.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!isAdmin) return;
    if (!query.data) return;
    if (searchParams?.get("openWizard") !== "1") return;
    setWizardOpen(true);
    // URL'den param'ı kaldır (history replace ile, refetch tetiklenmez).
    const url = new URL(window.location.href);
    url.searchParams.delete("openWizard");
    router.replace(url.pathname + (url.search ? url.search : ""));
  }, [isAdmin, query.data, searchParams, router]);
  const [drillDown, setDrillDown] = useState<PersonnelHeldCashReconciliationRow | null>(null);

  const filteredRows = useMemo<PersonnelHeldCashReconciliationRow[]>(() => {
    const rows = query.data?.rows ?? [];
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (filterMode === "negativeOnly" && !r.isNegative) return false;
      if (filterMode === "claimOnly" && !r.hasClaimActivity) return false;
      if (filterMode === "affectedOnly" && r.difference === 0) return false;
      if (q.length > 0) {
        const hay = `${r.fullName} ${r.branchName} ${r.currencyCode}`.toLocaleLowerCase("tr-TR");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query.data, filterMode, searchText]);

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  const summary = query.data?.summary;
  const totalsByCurrency = summary ? Object.entries(summary.totalNetBalanceByCurrency) : [];
  const diffsByCurrency = summary ? Object.entries(summary.totalDifferenceByCurrency) : [];

  return (
    <PageScreenScaffold
      className={cn(
        "w-full min-w-0 flex-1 max-md:pt-2 md:pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
      )}
      intro={
        <div className="min-w-0">
          <h1 className="break-words text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:text-xl md:text-2xl">
            Personel Kasa Bakiyesi Doğrulama
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
            Tüm personellerin “personel zimmetindeki kasa parası” bakiyesinin bileşen bazında dökümü.
            Patron/personele cep alacağı devirleri dahil net bakiye gösterilir; eski (buglı) hesapla
            karşılaştırma yapılır.
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
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              disabled={!query.data || query.data.rows.length === 0}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              title="Pozitif bakiyeleri patrona devret + negatif bakiyeleri listele"
            >
              Düzeltme Sihirbazı
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
          {/* Özet kartları */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Toplam Net Bakiye</div>
              <div className="mt-2 space-y-1">
                {totalsByCurrency.length === 0 ? (
                  <div className="text-sm text-zinc-400">—</div>
                ) : (
                  totalsByCurrency.map(([ccy, amt]) => (
                    <div key={ccy} className="text-base font-semibold text-zinc-900">
                      {formatAmount(amt, ccy)}
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Negatif Bakiye</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-900">
                {summary?.negativeBalancePersonnelCount ?? 0}
                <span className="ml-1 text-sm font-normal text-zinc-500">personel</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {summary?.negativeBalanceRowCount ?? 0} satır
                {(summary?.negativeBalanceRowCount ?? 0) > 0 && (
                  <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-red-500 align-middle" />
                )}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Claim Aktivitesi</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-900">
                {summary?.claimActivityPersonnelCount ?? 0}
                <span className="ml-1 text-sm font-normal text-zinc-500">personel</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Patron/personele devir kaydı olanlar
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Fix’ten Etkilenen</div>
              <div className="mt-2 text-2xl font-semibold text-zinc-900">
                {summary?.affectedByFixRowCount ?? 0}
                <span className="ml-1 text-sm font-normal text-zinc-500">satır</span>
              </div>
              <div className="mt-1 space-y-0.5">
                {diffsByCurrency.length === 0 ? (
                  <div className="text-xs text-zinc-400">—</div>
                ) : (
                  diffsByCurrency.map(([ccy, amt]) => (
                    <div key={ccy} className="text-xs text-zinc-600">
                      Toplam fark: {formatDelta(amt, ccy)}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Filtreler */}
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Personel, şube veya para birimi ara…"
                className="min-w-[14rem] flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="all">Tümü</option>
                <option value="negativeOnly">Sadece negatif bakiye</option>
                <option value="claimOnly">Sadece claim aktif olanlar</option>
                <option value="affectedOnly">Sadece fix farkı olanlar</option>
              </select>
              <div className="ml-auto text-xs text-zinc-500">
                {filteredRows.length} / {query.data?.rows.length ?? 0} satır
              </div>
            </div>
          </Card>

          {/* Tablo */}
          {query.isLoading ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              Yükleniyor…
            </div>
          ) : query.isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Veri alınamadı: {(query.error as Error)?.message ?? "Bilinmeyen hata"}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
              Eşleşen kayıt yok.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Personel</th>
                    <th className="px-3 py-2 text-left">Şube</th>
                    <th className="px-3 py-2 text-left">Para</th>
                    <th className="px-3 py-2 text-right">Aldı (IN)</th>
                    <th className="px-3 py-2 text-right">Devraldı</th>
                    <th className="px-3 py-2 text-right">Harcadı</th>
                    <th className="px-3 py-2 text-right" title="Eski akış: OUT_POCKET_CLAIM_*">
                      Devretti (eski)
                    </th>
                    <th
                      className="px-3 py-2 text-right"
                      title="Yeni akış: handover settlement junction (patrona iade)"
                    >
                      Patrona iade
                    </th>
                    <th
                      className="px-3 py-2 text-right"
                      title="Zimmetteki kasadan yapılan tedarikçi ödemeleri (supplier_payments)"
                    >
                      Tedarikçi öd.
                    </th>
                    <th className="px-3 py-2 text-right">Yeni Net</th>
                    <th className="px-3 py-2 text-right">Eski (buglı)</th>
                    <th className="px-3 py-2 text-right">Fark</th>
                    <th className="px-3 py-2 text-left">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredRows.map((r, idx) => (
                    <tr
                      key={`${r.personnelId}-${r.branchId}-${r.currencyCode}-${idx}`}
                      onClick={() => setDrillDown(r)}
                      title="Hareket dökümünü gör"
                      className={cn(
                        "cursor-pointer hover:bg-violet-50/60",
                        r.isNegative && "bg-red-50/40",
                        r.difference !== 0 && !r.isNegative && "bg-amber-50/40"
                      )}
                    >
                      <td className="px-3 py-2 font-medium text-zinc-900">{r.fullName || `#${r.personnelId}`}</td>
                      <td className="px-3 py-2 text-zinc-700">{r.branchName}</td>
                      <td className="px-3 py-2 text-zinc-700">{r.currencyCode}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{formatAmount(r.inTotal, r.currencyCode)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                        {r.claimReceived > 0 ? `+${formatAmount(r.claimReceived, r.currencyCode)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                        {r.heldSpent > 0 ? `−${formatAmount(r.heldSpent, r.currencyCode)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                        {r.claimGiven > 0 ? `−${formatAmount(r.claimGiven, r.currencyCode)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                        {r.handoverSettled > 0
                          ? `−${formatAmount(r.handoverSettled, r.currencyCode)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                        {r.supplierPaid > 0
                          ? `−${formatAmount(r.supplierPaid, r.currencyCode)}`
                          : "—"}
                      </td>
                      <td className={cn(
                        "px-3 py-2 text-right font-semibold tabular-nums",
                        r.isNegative ? "text-red-700" : "text-zinc-900"
                      )}>
                        {formatAmount(r.netBalance, r.currencyCode)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-zinc-500">
                        {formatAmount(r.oldBalanceEstimate, r.currencyCode)}
                      </td>
                      <td className={cn(
                        "px-3 py-2 text-right tabular-nums font-medium",
                        r.difference < 0 ? "text-rose-700" : r.difference > 0 ? "text-emerald-700" : "text-zinc-400"
                      )}>
                        {formatDelta(r.difference, r.currencyCode)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          {r.isNegative && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              ⚠ negatif
                            </span>
                          )}
                          {r.hasClaimActivity && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                              claim aktif
                            </span>
                          )}
                          {r.difference !== 0 && !r.isNegative && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              fix etkiledi
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PersonnelHeldCashAutoFixWizard
            open={wizardOpen}
            rows={query.data?.rows ?? []}
            onClose={() => setWizardOpen(false)}
            onOpenDrillDown={(r) => {
              setWizardOpen(false);
              setDrillDown(r);
            }}
          />

          <PersonnelHeldCashDrillDownModal
            open={drillDown !== null}
            personnelId={drillDown?.personnelId ?? null}
            branchId={drillDown?.branchId ?? null}
            currency={drillDown?.currencyCode ?? null}
            personnelName={drillDown?.fullName}
            branchName={drillDown?.branchName}
            onClose={() => setDrillDown(null)}
          />
        </div>
      }
    />
  );
}
