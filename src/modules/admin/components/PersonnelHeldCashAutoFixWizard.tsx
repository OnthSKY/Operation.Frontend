"use client";

import { cn } from "@/lib/cn";
import { usePersonnelHeldCashAutoFixMutation } from "@/modules/admin/hooks/usePersonnelHeldCashReconciliationQuery";
import type {
  HeldCashAutoFixBatchResponse,
  PersonnelHeldCashReconciliationRow,
} from "@/modules/admin/api/personnel-held-cash-reconciliation-api";
import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  rows: PersonnelHeldCashReconciliationRow[];
  onClose: () => void;
};

type Selection = Record<string, boolean>; // key = `${pid}-${bid}-${ccy}`

function rowKey(r: PersonnelHeldCashReconciliationRow): string {
  return `${r.personnelId}-${r.branchId}-${r.currencyCode}`;
}

function formatAmount(value: number, currency: string): string {
  const fmt = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${fmt.format(value)} ${currency}`;
}

export function PersonnelHeldCashAutoFixWizard({ open, rows, onClose }: Props) {
  // Düzeltilebilir satırlar: net bakiye > 0 (pozitif, devredilebilir)
  const fixableRows = useMemo(
    () => rows.filter((r) => r.netBalance > 0),
    [rows]
  );

  // Manuel inceleme gerektirenler: negatif bakiye
  const manualReviewRows = useMemo(
    () => rows.filter((r) => r.isNegative),
    [rows]
  );

  const [selection, setSelection] = useState<Selection>(() => {
    // Default: hepsi seçili
    const init: Selection = {};
    fixableRows.forEach((r) => {
      init[rowKey(r)] = true;
    });
    return init;
  });

  const [confirmStep, setConfirmStep] = useState(false);
  const [result, setResult] = useState<HeldCashAutoFixBatchResponse | null>(null);

  const mutation = usePersonnelHeldCashAutoFixMutation();

  if (!open) return null;

  const selectedRows = fixableRows.filter((r) => selection[rowKey(r)]);
  const totalByCurrency = selectedRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.currencyCode] = (acc[r.currencyCode] ?? 0) + r.netBalance;
    return acc;
  }, {});

  const toggleAll = (checked: boolean) => {
    const next: Selection = {};
    fixableRows.forEach((r) => {
      next[rowKey(r)] = checked;
    });
    setSelection(next);
  };

  const handleApply = async () => {
    const body = {
      transfers: selectedRows.map((r) => ({
        personnelId: r.personnelId,
        branchId: r.branchId,
        currencyCode: r.currencyCode,
        amount: r.netBalance,
      })),
    };
    try {
      const resp = await mutation.mutateAsync(body);
      setResult(resp);
    } catch (err) {
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
          errorMessage: (err as Error)?.message ?? "Bilinmeyen hata",
          createdTransactionId: null,
        })),
      });
    }
  };

  const handleClose = () => {
    setConfirmStep(false);
    setResult(null);
    onClose();
  };

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
          <h2 className="text-base font-semibold text-zinc-900">
            {result ? "Düzeltme Sonucu" : confirmStep ? "Son Onay" : "Düzeltme Sihirbazı"}
          </h2>
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
          {/* SONUÇ EKRANI */}
          {result ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm text-zinc-700">
                  <strong>{result.successCount}</strong> satır başarıyla işlendi,{" "}
                  <strong className="text-red-700">{result.failureCount}</strong> satır hata aldı
                  (toplam {result.requestedCount}).
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
                            x.currencyCode === r.currencyCode
                        );
                        return (
                          <tr key={idx} className={r.success ? "" : "bg-red-50"}>
                            <td className="px-3 py-2">{orig?.fullName ?? `#${r.personnelId}`}</td>
                            <td className="px-3 py-2">{orig?.branchName ?? `#${r.branchId}`}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatAmount(r.requestedAmount, r.currencyCode)}
                            </td>
                            <td className="px-3 py-2">
                              {r.success ? (
                                <span className="text-emerald-700">
                                  ✓ Başarılı (Tx #{r.createdTransactionId})
                                </span>
                              ) : (
                                <span className="text-red-700">✗ {r.errorMessage}</span>
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
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Dikkat:</strong> Aşağıdaki {selectedRows.length} satır için{" "}
                <code className="rounded bg-white/60 px-1 py-0.5 text-xs">OUT_POCKET_CLAIM_TO_PATRON</code>{" "}
                tipinde finansal kayıt oluşturulacak. Bu işlem audit log'a yazılır, geri almak için tek
                tek silmeniz gerekir.
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-900">Toplam patrona devredilecek:</h3>
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
                    Negatif bakiyeler otomatik düzeltilmiyor — sebep belirsiz (eksik IN kaydı veya
                    yanlış OUT). Aşağıdaki personelleri elle incelemen gerek:
                  </p>
                  <ul className="mt-2 ml-4 list-disc text-xs text-red-800">
                    {manualReviewRows.slice(0, 10).map((r) => (
                      <li key={rowKey(r)}>
                        <strong>{r.fullName}</strong> ({r.branchName}, {r.currencyCode}):{" "}
                        {formatAmount(r.netBalance, r.currencyCode)}
                      </li>
                    ))}
                    {manualReviewRows.length > 10 && (
                      <li>…ve {manualReviewRows.length - 10} satır daha</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                <strong>{fixableRows.length}</strong> satır otomatik düzeltilebilir (pozitif net
                bakiye). Bunları patrona devretmek için seç ve uygula.
              </div>

              {fixableRows.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
                  Düzeltilebilecek pozitif bakiyeli satır yok.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase text-zinc-600">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          <input
                            type="checkbox"
                            checked={selectedRows.length === fixableRows.length && fixableRows.length > 0}
                            onChange={(e) => toggleAll(e.target.checked)}
                          />
                        </th>
                        <th className="px-3 py-2 text-left">Personel</th>
                        <th className="px-3 py-2 text-left">Şube</th>
                        <th className="px-3 py-2 text-left">Para</th>
                        <th className="px-3 py-2 text-right">Net Bakiye</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {fixableRows.map((r) => {
                        const k = rowKey(r);
                        const checked = !!selection[k];
                        return (
                          <tr key={k} className={cn(checked && "bg-violet-50/40")}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                  setSelection((prev) => ({ ...prev, [k]: e.target.checked }))
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
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-3">
          {result ? (
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
                className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {mutation.isPending ? "Uygulanıyor…" : `Uygula (${selectedRows.length})`}
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
