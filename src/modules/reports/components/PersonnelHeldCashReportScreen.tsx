"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  canSeeFinancialReports,
  canSeeUiModule,
  hasPermissionCode,
  PERM,
} from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { Checkbox } from "@/shared/ui/Checkbox";
import { ModernSelect } from "@/shared/ui/ModernSelect";
import { usePersonnelHeldCashReportQuery } from "@/modules/reports/hooks/usePersonnelHeldCashReportQuery";
import { DataTable, type DataTableColumn } from "@/shared/tables";
import type {
  PersonnelHeldCashReportDetailRow,
  PersonnelHeldCashReportPerBranchRow,
  PersonnelHeldCashReportPerPersonRow,
} from "@/modules/reports/api/personnel-held-cash-report-api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const ADMIN_RECONCILIATION_HREF = "/admin/personnel-held-cash-reconciliation";

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

  // Admin reconciliation ekranı negatif bakiyeleri inceleme + toplu düzeltme
  // sunuyor; sadece SystemAdmin görür. Görmeyenlere CTA gizli.
  const isAdmin = hasPermissionCode(user, PERM.systemAdmin);

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

  // Para birimi başına en çok eksiği olan personel — backend topHolder'ı yalnız
  // pozitifleri verir; negatif risk burada kayboluyordu. perPersonnel zaten
  // remaining desc; sondan başa tarayıp ilk negatif olanı yakalıyoruz.
  const topDeficitorByCurrency = useMemo(() => {
    const out = new Map<
      string,
      { personnelId: number; fullName: string; amount: number }
    >();
    const rows = query.data?.perPersonnel ?? [];
    for (const r of rows) {
      if (r.remaining >= -0.005) continue;
      const existing = out.get(r.currencyCode);
      if (!existing || r.remaining < existing.amount) {
        out.set(r.currencyCode, {
          personnelId: r.personnelId,
          fullName: r.fullName,
          amount: r.remaining,
        });
      }
    }
    return out;
  }, [query.data]);

  // Negatif bakiye özeti: hangi para biriminde kaç personel × ne kadar açık.
  // Detail satırından (personel × şube × para) hesaplanır; aynı personel iki şubede
  // ayrı negatif tutabilir → personel sayısı için distinct kullanılır.
  const negativeSummary = useMemo(() => {
    const rows = query.data?.detail ?? [];
    const byCcy = new Map<
      string,
      { totalDeficit: number; personnelIds: Set<number> }
    >();
    for (const r of rows) {
      if (r.remaining >= -0.005) continue;
      let entry = byCcy.get(r.currencyCode);
      if (!entry) {
        entry = { totalDeficit: 0, personnelIds: new Set() };
        byCcy.set(r.currencyCode, entry);
      }
      entry.totalDeficit += r.remaining;
      entry.personnelIds.add(r.personnelId);
    }
    return Array.from(byCcy.entries())
      .map(([currencyCode, e]) => ({
        currencyCode,
        totalDeficit: e.totalDeficit,
        personnelCount: e.personnelIds.size,
      }))
      .sort((a, b) => a.totalDeficit - b.totalDeficit); // en negatif başta
  }, [query.data]);
  const hasNegative = negativeSummary.length > 0;

  const filteredPerPerson = useMemo<PersonnelHeldCashReportPerPersonRow[]>(() => {
    const rows = query.data?.perPersonnel ?? [];
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (currencyFilter !== "ALL" && r.currencyCode !== currencyFilter) return false;
      if (hideZero && Math.abs(r.remaining) < 0.005) return false;
      if (q.length > 0 && !r.fullName.toLocaleLowerCase("tr-TR").includes(q)) return false;
      return true;
    });
  }, [query.data, searchText, currencyFilter, hideZero]);

  const filteredPerBranch = useMemo<PersonnelHeldCashReportPerBranchRow[]>(() => {
    const rows = query.data?.perBranch ?? [];
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (currencyFilter !== "ALL" && r.currencyCode !== currencyFilter) return false;
      if (hideZero && Math.abs(r.remaining) < 0.005) return false;
      if (q.length > 0 && !r.branchName.toLocaleLowerCase("tr-TR").includes(q)) return false;
      return true;
    });
  }, [query.data, searchText, currencyFilter, hideZero]);

  const filteredDetail = useMemo<PersonnelHeldCashReportDetailRow[]>(() => {
    const rows = query.data?.detail ?? [];
    const q = searchText.trim().toLocaleLowerCase("tr-TR");
    return rows.filter((r) => {
      if (currencyFilter !== "ALL" && r.currencyCode !== currencyFilter) return false;
      if (hideZero && Math.abs(r.remaining) < 0.005) return false;
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
            {/* Yönetim ekranı drill-down + toplu düzeltme sihirbazını barındırır.
                Burada duplike etmiyoruz — admin değilse buton hiç render olmuyor. */}
            {isAdmin ? (
              <Link
                href={ADMIN_RECONCILIATION_HREF}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-800"
                title="Drill-down ve toplu düzeltme sihirbazı (admin)"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Bakiyeleri yönet
              </Link>
            ) : null}
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
          {/* NEGATİF BAKİYE ÖZETİ — finansal riskin "en görünür" yeri.
              Backend zaten detail satırında negatif remaining çıkarıyor; biz para
              birimi bazında özetleyip kırmızı banner gösteriyoruz. Admin'e doğrudan
              Yönetim ekranına atlayan CTA bırakıyoruz (drill-down + auto-fix orada).
              Personele yüklemiş gibi bakiyeden çıkmış ama sayıya yansımayan açıklar
              burada birden fazla şubeye dağılmışsa "X personel" distinct sayılır. */}
          {hasNegative ? (
            <Card className="border-rose-300 bg-rose-50/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 shrink-0 text-rose-700"
                    >
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <h2 className="text-sm font-semibold text-rose-900">
                      Negatif bakiye uyarısı
                    </h2>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-rose-900/80">
                    Bazı personeller veri tutarsızlığı veya geçmiş bug sonucu negatif
                    bakiyeli görünüyor (hesaben fazla harcama). Detay ve toplu
                    düzeltme için yönetim ekranına gidin.
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {negativeSummary.map((n) => (
                      <li
                        key={n.currencyCode}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs ring-1 ring-rose-200"
                      >
                        <span className="font-semibold text-rose-900 tabular-nums">
                          {formatAmount(n.totalDeficit, n.currencyCode)}
                        </span>
                        <span className="text-rose-700">·</span>
                        <span className="text-rose-700">
                          {n.personnelCount} personel
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {isAdmin ? (
                  <Link
                    href={ADMIN_RECONCILIATION_HREF}
                    className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 sm:w-auto"
                  >
                    Yönetim ekranını aç
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                ) : null}
              </div>
            </Card>
          ) : null}

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
                    <div
                      className="text-zinc-500"
                      title="Eski akış: OUT_POCKET_CLAIM_* (patron/personele direkt devir tx)"
                    >
                      Devir (eski)
                    </div>
                    <div className="text-right tabular-nums text-zinc-700">
                      −{formatAmount(c.totalTransferredOut, c.currencyCode)}
                    </div>
                    <div
                      className="text-zinc-500"
                      title="Yeni akış: handover settlement junction üzerinden patrona iade"
                    >
                      Patrona iade (yeni)
                    </div>
                    <div className="text-right tabular-nums text-zinc-700">
                      −{formatAmount(c.totalSettledToPatron, c.currencyCode)}
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
                  {(() => {
                    const deficit = topDeficitorByCurrency.get(c.currencyCode);
                    if (!deficit) return null;
                    return (
                      <div className="mt-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs">
                        <span className="text-rose-700">En çok eksiği olan:</span>{" "}
                        <span className="font-semibold text-rose-900">
                          {deficit.fullName}
                        </span>{" "}
                        <span className="text-rose-700">·</span>{" "}
                        <span className="font-semibold tabular-nums text-rose-900">
                          {formatAmount(deficit.amount, c.currencyCode)}
                        </span>
                      </div>
                    );
                  })()}
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
                placeholder={
                  viewMode === "branch"
                    ? "Şube ara…"
                    : viewMode === "detail"
                      ? "Personel veya şube ara…"
                      : "Personel ara…"
                }
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
            <PerPersonnelTable
              rows={filteredPerPerson}
              totalCount={query.data?.perPersonnel.length ?? 0}
              hideZero={hideZero}
              onDisableHideZero={() => setHideZero(false)}
            />
          ) : viewMode === "branch" ? (
            <PerBranchTable
              rows={filteredPerBranch}
              totalCount={query.data?.perBranch.length ?? 0}
              hideZero={hideZero}
              onDisableHideZero={() => setHideZero(false)}
            />
          ) : (
            <DetailTable
              rows={filteredDetail}
              totalCount={query.data?.detail.length ?? 0}
              hideZero={hideZero}
              onDisableHideZero={() => setHideZero(false)}
            />
          )}
        </div>
      }
    />
  );
}

function CountStrip({ shown, total, unit }: { shown: number; total: number; unit: string }) {
  return (
    <div className="text-xs text-zinc-500">
      {shown} / {total} {unit}
    </div>
  );
}

function EmptyRows({
  message,
  hideZero,
  onDisableHideZero,
}: {
  message: string;
  /** hideZero açıkken küçük bir CTA göster — boşluğun sebebi muhtemelen budur. */
  hideZero?: boolean;
  onDisableHideZero?: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
      <p>{message}</p>
      {hideZero && onDisableHideZero ? (
        <button
          type="button"
          onClick={onDisableHideZero}
          className="mt-2 inline-flex items-center gap-1 rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100"
        >
          “Sıfır bakiyeyi gizle” açık — kapatmayı dene
        </button>
      ) : null}
    </div>
  );
}

const perPersonnelColumns: DataTableColumn<PersonnelHeldCashReportPerPersonRow>[] = [
  {
    id: "fullName",
    header: "Personel",
    tdClassName: "font-medium text-zinc-900",
    cell: (r) => r.fullName,
  },
  {
    id: "currencyCode",
    header: "Para",
    tdClassName: "text-zinc-700",
    cell: (r) => r.currencyCode,
  },
  {
    id: "branchCount",
    header: "Şube",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-zinc-500",
    cell: (r) => r.branchCount,
  },
  {
    id: "given",
    header: "Verilen (alındı + devraldı)",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-zinc-700",
    cell: (r) => formatAmount(r.received + r.transferredIn, r.currencyCode),
  },
  {
    id: "spent",
    header: "Harcadı",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-zinc-700",
    cell: (r) => (r.spent > 0 ? `−${formatAmount(r.spent, r.currencyCode)}` : "—"),
  },
  {
    id: "transferredOut",
    header: "Devretti",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-rose-700",
    cell: (r) =>
      r.transferredOut > 0 ? `−${formatAmount(r.transferredOut, r.currencyCode)}` : "—",
  },
  {
    id: "settledToPatron",
    header: "Patrona iade",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-rose-700",
    cell: (r) =>
      r.settledToPatron > 0
        ? `−${formatAmount(r.settledToPatron, r.currencyCode)}`
        : "—",
  },
  {
    id: "remaining",
    header: "Kalan",
    thClassName: "text-right",
    tdClassName: "text-right font-semibold tabular-nums",
    cell: (r) => (
      <span className={cn(r.remaining < 0 ? "text-red-700" : "text-zinc-900")}>
        {formatAmount(r.remaining, r.currencyCode)}
      </span>
    ),
  },
];

function PerPersonnelTable({
  rows,
  totalCount,
  hideZero,
  onDisableHideZero,
}: {
  rows: PersonnelHeldCashReportPerPersonRow[];
  totalCount: number;
  hideZero: boolean;
  onDisableHideZero: () => void;
}) {
  return (
    <div className="space-y-2">
      <CountStrip shown={rows.length} total={totalCount} unit="personel" />
      <DataTable
        columns={perPersonnelColumns}
        rows={rows}
        getRowKey={(r) => `${r.personnelId}-${r.currencyCode}`}
        emptyMessage={
          <EmptyRows
            message="Eşleşen personel yok."
            hideZero={hideZero}
            onDisableHideZero={onDisableHideZero}
          />
        }
      />
    </div>
  );
}

const perBranchColumns: DataTableColumn<PersonnelHeldCashReportPerBranchRow>[] = [
  {
    id: "branchName",
    header: "Şube",
    tdClassName: "font-medium text-zinc-900",
    cell: (r) => r.branchName,
  },
  {
    id: "currencyCode",
    header: "Para",
    tdClassName: "text-zinc-700",
    cell: (r) => r.currencyCode,
  },
  {
    id: "personnelCount",
    header: "Personel",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-zinc-500",
    cell: (r) => r.personnelCount,
  },
  {
    id: "given",
    header: "Verilen (alındı + devraldı)",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-zinc-700",
    cell: (r) => formatAmount(r.received + r.transferredIn, r.currencyCode),
  },
  {
    id: "spent",
    header: "Harcandı",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-zinc-700",
    cell: (r) => (r.spent > 0 ? `−${formatAmount(r.spent, r.currencyCode)}` : "—"),
  },
  {
    id: "transferredOut",
    header: "Devredildi",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-rose-700",
    cell: (r) =>
      r.transferredOut > 0 ? `−${formatAmount(r.transferredOut, r.currencyCode)}` : "—",
  },
  {
    id: "settledToPatron",
    header: "Patrona iade",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-rose-700",
    cell: (r) =>
      r.settledToPatron > 0
        ? `−${formatAmount(r.settledToPatron, r.currencyCode)}`
        : "—",
  },
  {
    id: "remaining",
    header: "Kalan",
    thClassName: "text-right",
    tdClassName: "text-right font-semibold tabular-nums",
    cell: (r) => (
      <span className={cn(r.remaining < 0 ? "text-red-700" : "text-zinc-900")}>
        {formatAmount(r.remaining, r.currencyCode)}
      </span>
    ),
  },
];

function PerBranchTable({
  rows,
  totalCount,
  hideZero,
  onDisableHideZero,
}: {
  rows: PersonnelHeldCashReportPerBranchRow[];
  totalCount: number;
  hideZero: boolean;
  onDisableHideZero: () => void;
}) {
  return (
    <div className="space-y-2">
      <CountStrip shown={rows.length} total={totalCount} unit="kayıt" />
      <DataTable
        columns={perBranchColumns}
        rows={rows}
        getRowKey={(r) => `${r.branchId}-${r.currencyCode}`}
        emptyMessage={
          <EmptyRows
            message="Eşleşen şube yok."
            hideZero={hideZero}
            onDisableHideZero={onDisableHideZero}
          />
        }
      />
    </div>
  );
}

const detailColumns: DataTableColumn<PersonnelHeldCashReportDetailRow>[] = [
  {
    id: "fullName",
    header: "Personel",
    tdClassName: "font-medium text-zinc-900",
    cell: (r) => r.fullName,
  },
  {
    id: "branchName",
    header: "Şube",
    tdClassName: "text-zinc-700",
    cell: (r) => r.branchName,
  },
  {
    id: "currencyCode",
    header: "Para",
    tdClassName: "text-zinc-700",
    cell: (r) => r.currencyCode,
  },
  {
    id: "received",
    header: "Aldı",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-zinc-700",
    cell: (r) => formatAmount(r.received, r.currencyCode),
  },
  {
    id: "transferredIn",
    header: "Devraldı",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-emerald-700",
    cell: (r) =>
      r.transferredIn > 0 ? `+${formatAmount(r.transferredIn, r.currencyCode)}` : "—",
  },
  {
    id: "spent",
    header: "Harcadı",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-zinc-700",
    cell: (r) => (r.spent > 0 ? `−${formatAmount(r.spent, r.currencyCode)}` : "—"),
  },
  {
    id: "transferredOut",
    header: "Devretti",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-rose-700",
    cell: (r) =>
      r.transferredOut > 0 ? `−${formatAmount(r.transferredOut, r.currencyCode)}` : "—",
  },
  {
    id: "settledToPatron",
    header: "Patrona iade",
    thClassName: "text-right",
    tdClassName: "text-right tabular-nums text-rose-700",
    cell: (r) =>
      r.settledToPatron > 0
        ? `−${formatAmount(r.settledToPatron, r.currencyCode)}`
        : "—",
  },
  {
    id: "remaining",
    header: "Kalan",
    thClassName: "text-right",
    tdClassName: "text-right font-semibold tabular-nums",
    cell: (r) => (
      <span className={cn(r.remaining < 0 ? "text-red-700" : "text-zinc-900")}>
        {formatAmount(r.remaining, r.currencyCode)}
      </span>
    ),
  },
];

function DetailTable({
  rows,
  totalCount,
  hideZero,
  onDisableHideZero,
}: {
  rows: PersonnelHeldCashReportDetailRow[];
  totalCount: number;
  hideZero: boolean;
  onDisableHideZero: () => void;
}) {
  return (
    <div className="space-y-2">
      <CountStrip shown={rows.length} total={totalCount} unit="kayıt" />
      <DataTable
        columns={detailColumns}
        rows={rows}
        getRowKey={(r) => `${r.personnelId}-${r.branchId}-${r.currencyCode}`}
        emptyMessage={
          <EmptyRows
            message="Eşleşen kayıt yok."
            hideZero={hideZero}
            onDisableHideZero={onDisableHideZero}
          />
        }
      />
    </div>
  );
}
