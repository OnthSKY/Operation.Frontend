"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { usePersonnelHeldCashAutoFixMutation } from "@/modules/admin/hooks/usePersonnelHeldCashReconciliationQuery";
import type {
  HeldCashAutoFixBatchResponse,
  PersonnelHeldCashReconciliationRow,
} from "@/modules/admin/api/personnel-held-cash-reconciliation-api";
import { useEffect, useMemo, useState } from "react";

/**
 * Backend hata mesajları İngilizce throw ediliyor. Wizard farklı dil
 * kullanıcılarına anlaşılır mesaj vermeli — bilinen pattern'leri locale'e
 * çevir, bilinmeyenlerde raw mesajı (ya da generic fallback) göster.
 *
 * Backend'e error code dönüşü eklenirse buraya hızla taşınabilir.
 */
function localizeAutoFixError(
  raw: string | null | undefined,
  locale: string,
): string {
  const isTr = String(locale).toLowerCase().startsWith("tr");
  if (!raw) return isTr ? "Bilinmeyen hata" : "Unknown error";
  if (/calendar year is already closed/i.test(raw)) {
    return isTr
      ? "Bu personel için takvim yılı kapatılmış — düzeltme yazılamaz."
      : "Calendar year is closed for this personnel — fix can't be written.";
  }
  if (/insufficient/i.test(raw) || /yetersiz/i.test(raw)) {
    return isTr
      ? "Yetersiz bakiye / kaynak."
      : "Insufficient balance / source.";
  }
  if (/not found/i.test(raw) || /bulunamadı/i.test(raw)) {
    return isTr ? "Kayıt bulunamadı." : "Record not found.";
  }
  return raw;
}

type Props = {
  open: boolean;
  rows: PersonnelHeldCashReconciliationRow[];
  onClose: () => void;
  /**
   * Negatif satırların yanındaki "İncele" butonu → parent ekran drill-down modal'ını açar.
   * Yokken eski davranış (buton render edilmez) geriye uyumlu.
   */
  onOpenDrillDown?: (row: PersonnelHeldCashReconciliationRow) => void;
};

type Selection = Record<string, boolean>;
/** "Çalıştır" = gerçek POST; "Önizle" = sadece payload göster, yazma. */
type Mode = "execute" | "preview";

function rowKey(r: PersonnelHeldCashReconciliationRow): string {
  return `${r.personnelId}-${r.branchId}-${r.currencyCode}`;
}

function formatAmount(value: number, currency: string): string {
  const fmt = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${fmt.format(value)} ${currency}`;
}

function normalize(s: string): string {
  return s.toLocaleLowerCase("tr-TR").trim();
}

export function PersonnelHeldCashAutoFixWizard({
  open,
  rows,
  onClose,
  onOpenDrillDown,
}: Props) {
  const { locale } = useI18n();
  const fixableRows = useMemo(() => rows.filter((r) => r.netBalance > 0), [rows]);
  const manualReviewRows = useMemo(() => rows.filter((r) => r.isNegative), [rows]);

  // Filtreler — büyük listelerde aranmak için.
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("ALL");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");

  const availableBranches = useMemo(() => {
    const m = new Map<number, string>();
    fixableRows.forEach((r) => m.set(r.branchId, r.branchName || `#${r.branchId}`));
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
  }, [fixableRows]);

  const availableCurrencies = useMemo(() => {
    const s = new Set<string>();
    fixableRows.forEach((r) => s.add(r.currencyCode));
    return Array.from(s).sort();
  }, [fixableRows]);

  const filteredFixable = useMemo(() => {
    const q = normalize(search);
    return fixableRows.filter((r) => {
      if (branchFilter !== "ALL" && String(r.branchId) !== branchFilter) return false;
      if (currencyFilter !== "ALL" && r.currencyCode !== currencyFilter) return false;
      if (q.length > 0) {
        const hay = `${r.fullName} ${r.branchName} ${r.currencyCode}`;
        if (!normalize(hay).includes(q)) return false;
      }
      return true;
    });
  }, [fixableRows, branchFilter, currencyFilter, search]);

  // Default: tümü seçili — wizard açıldığında / rows değişince yeniden init.
  const [selection, setSelection] = useState<Selection>({});
  useEffect(() => {
    if (!open) return;
    const init: Selection = {};
    fixableRows.forEach((r) => {
      init[rowKey(r)] = true;
    });
    setSelection(init);
  }, [open, fixableRows]);

  const [confirmStep, setConfirmStep] = useState(false);
  const [mode, setMode] = useState<Mode>("execute");
  const [result, setResult] = useState<HeldCashAutoFixBatchResponse | null>(null);
  /** Preview modunda gönderilmeyen ama göstermek istediğimiz payload. */
  const [previewPayload, setPreviewPayload] = useState<unknown | null>(null);

  const mutation = usePersonnelHeldCashAutoFixMutation();

  if (!open) return null;

  // Seçili olan = aktif filtrede + tüm fixable arasında (filtre seçimi gizlemez,
  // sadece UI'da görünmez yapar; gönderime hâlâ dahildir).
  const selectedRows = fixableRows.filter((r) => selection[rowKey(r)]);
  const selectedInFilter = filteredFixable.filter((r) => selection[rowKey(r)]);
  const totalByCurrency = selectedRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.currencyCode] = (acc[r.currencyCode] ?? 0) + r.netBalance;
    return acc;
  }, {});

  const toggleAllInFilter = (checked: boolean) => {
    setSelection((prev) => {
      const next = { ...prev };
      filteredFixable.forEach((r) => {
        next[rowKey(r)] = checked;
      });
      return next;
    });
  };

  const buildPayload = () => ({
    transfers: selectedRows.map((r) => ({
      personnelId: r.personnelId,
      branchId: r.branchId,
      currencyCode: r.currencyCode,
      amount: r.netBalance,
    })),
  });

  const handleApply = async () => {
    const body = buildPayload();
    if (mode === "preview") {
      // Hiç POST yok — payload'u göster, kullanıcı doğrula.
      setPreviewPayload(body);
      return;
    }
    try {
      const resp = await mutation.mutateAsync(body);
      setResult(resp);
    } catch (err) {
      const raw = (err as Error)?.message ?? null;
      setResult({
        requestedCount: body.transfers.length,
        successCount: 0,
        failureCount: body.transfers.length,
        results: body.transfers.map((t) => ({
          personnelId: t.personnelId,
          branchId: t.branchId,
          currencyCode: t.currencyCode,
          requestedAmount: t.amount,
          success: false,
          // Raw'ı sakla — UI render'da localizeAutoFixError ile dile çevrilir.
          errorMessage: raw,
          createdTransactionId: null,
        })),
      });
    }
  };

  const handleClose = () => {
    setConfirmStep(false);
    setResult(null);
    setPreviewPayload(null);
    setSearch("");
    setBranchFilter("ALL");
    setCurrencyFilter("ALL");
    onClose();
  };

  const headerTitle = result
    ? "Düzeltme Sonucu"
    : previewPayload
      ? "Önizleme (hiçbir kayıt oluşturulmadı)"
      : confirmStep
        ? mode === "preview"
          ? "Önizleme Onayı"
          : "Son Onay"
        : "Düzeltme Sihirbazı";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <h2 className="text-base font-semibold text-zinc-900">{headerTitle}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[calc(90vh-9rem)] overflow-y-auto p-5">
          {/* ÖNİZLEME ÇIKTI EKRANI */}
          {previewPayload ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                <strong>Önizleme modu:</strong> Aşağıdaki istek <em>gönderilmedi</em>.
                Hiçbir branch_transactions kaydı oluşturulmadı. Bu, gerçek "Çalıştır"
                modunda backend'e iletilecek payload'dır.
              </div>
              <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed">
                {JSON.stringify(previewPayload, null, 2)}
              </pre>
            </div>
          ) : result ? (
            /* SONUÇ EKRANI */
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm text-zinc-700">
                  <strong>{result.successCount}</strong> satır başarıyla işlendi,{" "}
                  <strong className="text-red-700">{result.failureCount}</strong> satır
                  hata aldı (toplam {result.requestedCount}).
                </div>
              </div>
              {result.results.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Personel</th>
                        <th className="px-3 py-2 text-left">Şube</th>
                        <th className="px-3 py-2 text-right">Tutar</th>
                        <th className="px-3 py-2 text-left">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {result.results.map((r, idx) => {
                        const orig = rows.find(
                          (x) =>
                            x.personnelId === r.personnelId &&
                            x.branchId === r.branchId &&
                            x.currencyCode === r.currencyCode,
                        );
                        return (
                          <tr key={idx} className={r.success ? "" : "bg-red-50"}>
                            <td className="px-3 py-2">
                              {orig?.fullName ?? `#${r.personnelId}`}
                            </td>
                            <td className="px-3 py-2">
                              {orig?.branchName ?? `#${r.branchId}`}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatAmount(r.requestedAmount, r.currencyCode)}
                            </td>
                            <td className="px-3 py-2">
                              {r.success ? (
                                <span className="text-emerald-700">
                                  ✓ Başarılı (Tx #{r.createdTransactionId})
                                </span>
                              ) : (
                                <span className="text-red-700">
                                  ✗ {localizeAutoFixError(r.errorMessage, locale)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : confirmStep ? (
            /* ONAY EKRANI */
            <div className="space-y-4">
              {mode === "execute" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p>
                    <strong>Dikkat:</strong> Aşağıdaki {selectedRows.length} satır
                    için bugün tarihli{" "}
                    <code className="rounded bg-white/60 px-1 py-0.5 text-xs">
                      OUT_POCKET_CLAIM_TO_PATRON
                    </code>{" "}
                    finansal kayıt oluşturulacak. Audit log'a yazılır; geri almak
                    için tek tek silmek gerek.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed">
                    <strong>Bu eski hareketleri düzeltmez</strong> — her satırın net
                    bakiyesi kadar <em>yeni</em> bir patrona devir yazar. Personelin
                    cebinde gerçekten nakit varsa, bu işlem bakiyeyi 0'a çekerken
                    nakit kayboluyor görünür.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  <strong>Önizleme modu:</strong> Bu adımda{" "}
                  <strong>hiçbir kayıt oluşturulmaz</strong>. "Uygula" backend'e
                  gönderilecek JSON payload'u gösterir; gerçekten yazmak için modu
                  değiştir.
                </div>
              )}

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Toplam patrona devredilecek:
                </h3>
                <ul className="ml-4 list-disc text-sm text-zinc-700">
                  {Object.entries(totalByCurrency).map(([ccy, amt]) => (
                    <li key={ccy}>
                      <strong>{formatAmount(amt, ccy)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Personel</th>
                      <th className="px-3 py-2 text-left">Şube</th>
                      <th className="px-3 py-2 text-right">Devredilecek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {selectedRows.map((r) => (
                      <tr key={rowKey(r)}>
                        <td className="px-3 py-2">{r.fullName}</td>
                        <td className="px-3 py-2">{r.branchName}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-rose-700">
                          −{formatAmount(r.netBalance, r.currencyCode)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* SEÇİM EKRANI */
            <div className="space-y-4">
              {manualReviewRows.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="text-sm font-semibold text-red-900">
                    ⚠ Manuel inceleme gereken {manualReviewRows.length} satır var
                  </div>
                  <p className="mt-1 text-xs text-red-800">
                    Negatif bakiyeler otomatik düzeltilmiyor — sebep belirsiz (eksik
                    IN kaydı veya yanlış OUT). Drill-down ile incele:
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-red-900">
                    {manualReviewRows.slice(0, 10).map((r) => (
                      <li
                        key={rowKey(r)}
                        className="flex items-center justify-between gap-2 rounded bg-white/60 px-2 py-1"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          <strong>{r.fullName}</strong>
                          <span className="text-red-700/80">
                            {" "}
                            · {r.branchName} ·{" "}
                            {formatAmount(r.netBalance, r.currencyCode)}
                          </span>
                        </span>
                        {onOpenDrillDown ? (
                          <button
                            type="button"
                            onClick={() => onOpenDrillDown(r)}
                            className="shrink-0 rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs font-medium text-red-800 hover:bg-red-50"
                          >
                            İncele →
                          </button>
                        ) : null}
                      </li>
                    ))}
                    {manualReviewRows.length > 10 && (
                      <li className="px-2 text-red-700/80">
                        …ve {manualReviewRows.length - 10} satır daha
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* MOD TOGGLE */}
              <div
                role="tablist"
                aria-label="Çalıştırma modu"
                className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs"
              >
                {(["execute", "preview"] as Mode[]).map((m) => {
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setMode(m)}
                      className={cn(
                        "rounded-md px-3 py-1 font-medium transition-colors",
                        active
                          ? m === "execute"
                            ? "bg-violet-600 text-white"
                            : "bg-sky-600 text-white"
                          : "text-zinc-600 hover:text-zinc-900",
                      )}
                    >
                      {m === "execute" ? "Çalıştır (yazar)" : "Önizle (yazmaz)"}
                    </button>
                  );
                })}
              </div>

              {/* Wizard'ın ne yaptığı çoğu kullanıcıya net değil — açıkça yaz.
                  "Eski yanlışı geri dönüp düzeltmiyor; bugün için patrona devir
                  tx'i yazıyor." Toplu kullanım öncesi admin doğrulamalı. */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700">
                <p className="font-semibold text-zinc-900">Bu sihirbaz ne yapar?</p>
                <p className="mt-1">
                  Seçili her satır için bugün tarihli bir{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-[11px] text-zinc-800 ring-1 ring-zinc-200">
                    OUT_POCKET_CLAIM_TO_PATRON
                  </code>{" "}
                  hareketi yazılır. Personelin cep bakiyesi anında <strong>0</strong>{" "}
                  olur; eski yazışım <em>geri dönüp düzeltilmez</em> (REVERSAL yok,
                  attribution değişmez).
                </p>
                <p className="mt-2">
                  <strong>Çalıştırmadan önce doğrula:</strong> bu pozitif bakiye
                  patron parayı zaten geri almış ama yazılmamış mı (sık), yoksa
                  personel cebinde nakit gerçekten duruyor mu (nadir)? İkincisinde
                  wizard veri yanlışlığı yaratır.
                </p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                <strong>{fixableRows.length}</strong> satır otomatik düzeltilebilir
                (pozitif net bakiye). {selectedRows.length} seçili.
              </div>

              {fixableRows.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
                  Düzeltilebilecek pozitif bakiyeli satır yok.
                </div>
              ) : (
                <>
                  {/* FİLTRELER — büyük listelerde arama + grup filtreleme */}
                  <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center">
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Ara: ad, şube, para birimi…"
                      className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    {availableBranches.length > 1 ? (
                      <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      >
                        <option value="ALL">Tüm şubeler</option>
                        {availableBranches.map((b) => (
                          <option key={b.id} value={String(b.id)}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {availableCurrencies.length > 1 ? (
                      <select
                        value={currencyFilter}
                        onChange={(e) => setCurrencyFilter(e.target.value)}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                      >
                        <option value="ALL">Tüm para</option>
                        {availableCurrencies.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>

                  {/* SEÇİM TABLOSU */}
                  <div className="overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
                        <tr>
                          <th className="px-3 py-2 text-left">
                            <input
                              type="checkbox"
                              aria-label="Filtredeki satırların tümünü seç"
                              checked={
                                filteredFixable.length > 0 &&
                                selectedInFilter.length === filteredFixable.length
                              }
                              ref={(el) => {
                                if (el)
                                  el.indeterminate =
                                    selectedInFilter.length > 0 &&
                                    selectedInFilter.length < filteredFixable.length;
                              }}
                              onChange={(e) => toggleAllInFilter(e.target.checked)}
                            />
                          </th>
                          <th className="px-3 py-2 text-left">Personel</th>
                          <th className="px-3 py-2 text-left">Şube</th>
                          <th className="px-3 py-2 text-left">Para</th>
                          <th className="px-3 py-2 text-right">Net Bakiye</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filteredFixable.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-3 py-6 text-center text-xs text-zinc-500"
                            >
                              Filtreyle eşleşen satır yok.
                            </td>
                          </tr>
                        ) : (
                          filteredFixable.map((r) => {
                            const k = rowKey(r);
                            const checked = !!selection[k];
                            return (
                              <tr
                                key={k}
                                className={cn(checked && "bg-violet-50/40")}
                              >
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      setSelection((prev) => ({
                                        ...prev,
                                        [k]: e.target.checked,
                                      }))
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 font-medium">{r.fullName}</td>
                                <td className="px-3 py-2">{r.branchName}</td>
                                <td className="px-3 py-2">{r.currencyCode}</td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold text-zinc-900">
                                  {formatAmount(r.netBalance, r.currencyCode)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Filtre yalnız gösterimi etkiler — toplam seçim ({selectedRows.length}{" "}
                    satır) tüm fixable üzerinden hesaplanır.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-3">
          {result || previewPayload ? (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              Kapat
            </button>
          ) : confirmStep ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmStep(false)}
                disabled={mutation.isPending}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={mutation.isPending}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60",
                  mode === "execute"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-sky-600 hover:bg-sky-700",
                )}
              >
                {mode === "preview"
                  ? "Payload Oluştur"
                  : mutation.isPending
                    ? "Uygulanıyor…"
                    : `Uygula (${selectedRows.length})`}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => setConfirmStep(true)}
                disabled={selectedRows.length === 0}
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                Devam ({selectedRows.length} seçili)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
