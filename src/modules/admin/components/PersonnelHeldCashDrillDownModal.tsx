"use client";

import { cn } from "@/lib/cn";
import { usePersonnelHeldCashDrillDownQuery } from "@/modules/admin/hooks/usePersonnelHeldCashReconciliationQuery";
import { usePersonnelDetailOverlay } from "@/shared/personnel-detail";

type Props = {
  open: boolean;
  personnelId: number | null;
  branchId: number | null;
  currency: string | null;
  personnelName?: string;
  branchName?: string;
  onClose: () => void;
};

function formatAmount(value: number, currency: string): string {
  const fmt = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${fmt.format(value)} ${currency}`;
}

function classificationLabel(code: string): string {
  switch (code) {
    case "OUT_POCKET_CLAIM_TO_PATRON":
      return "Patrona devir";
    case "OUT_POCKET_CLAIM_TRANSFER":
      return "Personele devir";
    case "OUT_REGISTER_EXPENSE":
      return "Şube gideri";
    case "OUT_PER_ADVANCE":
      return "Avans";
    case "OUT_PER_SALARY":
      return "Maaş";
    case "OUT_PER_BONUS":
      return "Prim";
    case "OUT_OPS_INVOICE":
      return "Fatura";
    case "IN_DAY_CLOSE":
      return "Gün sonu (teslim)";
    default:
      return code;
  }
}

export function PersonnelHeldCashDrillDownModal({
  open,
  personnelId,
  branchId,
  currency,
  personnelName,
  branchName,
  onClose,
}: Props) {
  const query = usePersonnelHeldCashDrillDownQuery(personnelId, branchId, currency, open);
  const { openPersonnelDetail } = usePersonnelDetailOverlay();

  if (!open) return null;

  // Cep alacağı devir partneri → sadece personel detayını aç (işaretlenecek kayıt yok).
  const goToPersonnelDetail = (pid: number) => {
    onClose();
    openPersonnelDetail(pid);
  };

  // Avans / personel gideri / maaş → personel kartı "costs" sekmesi + ilgili kaydı işaretle.
  const goToPersonnelCosts = (
    pid: number,
    linkedAdvanceId: number | null,
    transactionId: number
  ) => {
    onClose();
    openPersonnelDetail(pid, {
      initialTab: "costs",
      focusAdvanceId: linkedAdvanceId,
      focusExpenseTransactionId: linkedAdvanceId ? null : transactionId,
    });
  };

  // Teslim alma / patrona devir / personele devir / şube gideri (held-cash hareketi) →
  // focus personelin "Kasa nakit" (cash physical) sekmesi + ilgili işlemi işaretle.
  const goToFocusCashPhysical = (transactionId: number) => {
    if (!personnelId) return;
    onClose();
    openPersonnelDetail(personnelId, {
      initialTab: "personnelCashPhysical",
      focusCashTransactionId: transactionId,
    });
  };

  const data = query.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-zinc-900">
              {data?.fullName || personnelName || `#${personnelId}`} — kasa hareketleri
            </h2>
            <p className="text-xs text-zinc-500">
              {data?.branchName || branchName} · {currency}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-5">
          {query.isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-500">Yükleniyor…</div>
          ) : query.isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Veri alınamadı: {(query.error as Error)?.message ?? "Bilinmeyen hata"}
            </div>
          ) : !data ? (
            <div className="p-8 text-center text-sm text-zinc-500">Veri yok.</div>
          ) : (
            <div className="space-y-4">
              {/* Özet */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <div className="text-[0.65rem] uppercase text-zinc-500">Aldı</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {formatAmount(data.totalReceived, data.currencyCode)}
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-[0.65rem] uppercase text-emerald-600">Devraldı</div>
                  <div className="text-sm font-semibold text-emerald-800">
                    {formatAmount(data.totalTransferredIn, data.currencyCode)}
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <div className="text-[0.65rem] uppercase text-zinc-500">Harcadı</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {formatAmount(data.totalSpent, data.currencyCode)}
                  </div>
                </div>
                <div className="rounded-lg bg-rose-50 p-3">
                  <div className="text-[0.65rem] uppercase text-rose-600">Devretti</div>
                  <div className="text-sm font-semibold text-rose-800">
                    {formatAmount(data.totalTransferredOut, data.currencyCode)}
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-lg p-3",
                    data.netBalance < 0 ? "bg-red-100" : "bg-violet-50"
                  )}
                >
                  <div
                    className={cn(
                      "text-[0.65rem] uppercase",
                      data.netBalance < 0 ? "text-red-700" : "text-violet-600"
                    )}
                  >
                    Net Kalan
                  </div>
                  <div
                    className={cn(
                      "text-sm font-bold",
                      data.netBalance < 0 ? "text-red-800" : "text-violet-900"
                    )}
                  >
                    {formatAmount(data.netBalance, data.currencyCode)}
                  </div>
                </div>
              </div>

              {data.netBalance < 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  ⚠ Negatif bakiye: bu personel sahip olduğundan fazla harcamış/devretmiş görünüyor.
                  Aşağıdaki kronolojik dökümde running balance’ın nerede eksiye düştüğüne bak — eksik bir
                  teslim (IN) kaydı veya fazladan bir gider/devir olabilir.
                </div>
              )}

              {/* Transaction listesi */}
              {data.transactions.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
                  Bu personel/şube/para için kayıt yok.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Tarih</th>
                        <th className="px-3 py-2 text-left">Tür</th>
                        <th className="px-3 py-2 text-left">Karşı taraf</th>
                        <th className="px-3 py-2 text-right">Etki</th>
                        <th className="px-3 py-2 text-right">Bakiye</th>
                        <th className="px-3 py-2 text-left">Açıklama</th>
                        <th className="px-3 py-2 text-right">Detay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.transactions.map((tx) => {
                        const isIn = tx.effectDirection === "IN";
                        const isClaim =
                          tx.classificationCode === "OUT_POCKET_CLAIM_TRANSFER" ||
                          tx.classificationCode === "OUT_POCKET_CLAIM_TO_PATRON";
                        // Avans/maaş/personel gideri: kişiye ait, costs sekmesinde işaretlenebilir.
                        const personnelCostTarget =
                          tx.counterpartyPersonnelId != null && !isClaim;
                        const handleRowClick = () => {
                          if (personnelCostTarget) {
                            goToPersonnelCosts(
                              tx.counterpartyPersonnelId!,
                              tx.linkedAdvanceId,
                              tx.transactionId
                            );
                          } else {
                            goToFocusCashPhysical(tx.transactionId);
                          }
                        };
                        return (
                          <tr
                            key={tx.transactionId}
                            onClick={handleRowClick}
                            title={
                              personnelCostTarget
                                ? "Personel kartı maliyetlerine git (ilgili kayıt işaretlenir)"
                                : "Personel kartı kasa nakit sekmesine git (ilgili işlem işaretlenir)"
                            }
                            className={cn(
                              "cursor-pointer hover:bg-violet-50/60",
                              tx.runningBalance < 0 && "bg-red-50/50"
                            )}
                          >
                            <td className="px-3 py-2 whitespace-nowrap text-zinc-700">
                              {new Date(tx.transactionDate).toLocaleDateString("tr-TR")}
                            </td>
                            <td className="px-3 py-2 text-zinc-800">{classificationLabel(tx.classificationCode)}</td>
                            <td className="px-3 py-2 text-zinc-600">
                              {tx.counterpartyPersonnelId ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (personnelCostTarget) {
                                      goToPersonnelCosts(
                                        tx.counterpartyPersonnelId!,
                                        tx.linkedAdvanceId,
                                        tx.transactionId
                                      );
                                    } else {
                                      goToPersonnelDetail(tx.counterpartyPersonnelId!);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded font-medium text-violet-700 underline-offset-2 hover:underline"
                                  title="Personel detayını aç"
                                >
                                  {tx.counterpartyName ?? `#${tx.counterpartyPersonnelId}`}
                                  <span aria-hidden className="text-[0.7rem]">↗</span>
                                </button>
                              ) : (
                                tx.counterpartyName ?? "—"
                              )}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right tabular-nums font-medium",
                                isIn ? "text-emerald-700" : "text-rose-700"
                              )}
                            >
                              {isIn ? "+" : "−"}
                              {formatAmount(tx.amount, data.currencyCode)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right tabular-nums font-semibold",
                                tx.runningBalance < 0 ? "text-red-700" : "text-zinc-900"
                              )}
                            >
                              {formatAmount(tx.runningBalance, data.currencyCode)}
                            </td>
                            <td className="max-w-[16rem] truncate px-3 py-2 text-zinc-500" title={tx.description ?? ""}>
                              {tx.description ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="text-violet-700" aria-hidden>
                                ↗
                              </span>
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

        <div className="flex items-center justify-end border-t border-zinc-200 bg-zinc-50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
