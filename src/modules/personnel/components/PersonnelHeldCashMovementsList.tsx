"use client";

import { cn } from "@/lib/cn";
import { usePersonnelHeldCashMovements } from "@/modules/personnel/hooks/usePersonnelQueries";
import type { PersonnelHeldCashMovement } from "@/modules/personnel/api/personnel-api";

type Props = {
  personnelId: number;
  open: boolean;
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
      return "Gün sonu (teslim alındı)";
    case "IN_REGISTER_SALE":
      return "Kasa satışı (teslim alındı)";
    case "IN_OTHER_REGISTER":
      return "Diğer kasa (teslim alındı)";
    default:
      return code;
  }
}

function MovementRows({ rows, currency }: { rows: PersonnelHeldCashMovement[]; currency: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
          <tr>
            <th className="px-3 py-2 text-left">Tarih</th>
            <th className="px-3 py-2 text-left">Tür</th>
            <th className="px-3 py-2 text-left">Karşı taraf</th>
            <th className="px-3 py-2 text-right">Giriş/Çıkış</th>
            <th className="px-3 py-2 text-right">Bakiye</th>
            <th className="px-3 py-2 text-left">Açıklama</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((m) => {
            const isIn = m.effectDirection === "IN";
            return (
              <tr key={m.transactionId} className={cn(m.runningBalance < 0 && "bg-red-50/50")}>
                <td className="px-3 py-2 whitespace-nowrap text-zinc-700">
                  {new Date(m.transactionDate).toLocaleDateString("tr-TR")}
                </td>
                <td className="px-3 py-2 text-zinc-800">{classificationLabel(m.classificationCode)}</td>
                <td className="px-3 py-2 text-zinc-600">{m.counterpartyName ?? "—"}</td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums font-medium",
                    isIn ? "text-emerald-700" : "text-rose-700"
                  )}
                >
                  {isIn ? "+" : "−"}
                  {formatAmount(m.amount, currency)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right tabular-nums font-semibold",
                    m.runningBalance < 0 ? "text-red-700" : "text-zinc-900"
                  )}
                >
                  {formatAmount(m.runningBalance, currency)}
                </td>
                <td className="max-w-[16rem] truncate px-3 py-2 text-zinc-500" title={m.description ?? ""}>
                  {m.description ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PersonnelHeldCashMovementsList({ personnelId, open }: Props) {
  const query = usePersonnelHeldCashMovements(personnelId, open);

  const groups = query.data?.groups ?? [];

  return (
    <section className="rounded-2xl border border-sky-200/80 bg-white shadow-sm">
      <div className="border-b border-sky-200/60 bg-sky-50/50 px-3 py-2.5 sm:px-4">
        <h3 className="text-sm font-semibold text-sky-950">Hareketler (banka ekstresi)</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-sky-900/70">
          Personelin tuttuğu kasa nakdinin tüm hareketleri: teslim alma, harcama, patrona/personele devir.
          Her satırdan sonra kalan bakiye (running balance) gösterilir; şube ve para birimi bazında ayrılır.
        </p>
      </div>

      <div className="p-3 sm:p-4">
        {query.isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-zinc-100" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Hareketler alınamadı: {(query.error as Error)?.message ?? "Bilinmeyen hata"}
          </div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-zinc-500">Bu personel için kasa nakdi hareketi yok.</p>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div
                key={`${g.branchId}-${g.currencyCode}`}
                className="overflow-hidden rounded-xl border border-zinc-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
                  <span className="text-sm font-semibold text-zinc-800">
                    {g.branchName || `Şube #${g.branchId}`} · {g.currencyCode}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Kalan net:{" "}
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        g.netBalance < 0 ? "text-red-700" : "text-zinc-900"
                      )}
                    >
                      {formatAmount(g.netBalance, g.currencyCode)}
                    </span>
                  </span>
                </div>
                <MovementRows rows={g.movements} currency={g.currencyCode} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
