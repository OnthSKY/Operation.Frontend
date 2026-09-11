"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import {
  useBranchProductBalances,
  useReturnBranchToWarehouse,
} from "@/modules/branch/hooks/useBranchStockConsumptions";

type Row = { id: string; productId: string; quantity: string };

let rowSeq = 0;
const newRow = (): Row => ({ id: `r${(rowSeq += 1)}`, productId: "", quantity: "" });

type Props = {
  open: boolean;
  onClose: () => void;
  branchId: number;
  branchName?: string;
};

type BalanceInfo = {
  name: string;
  unit: string | null;
  balance: number;
  parentId: number | null;
  parentName: string | null;
};

/**
 * Onay özeti: satırları ürün bazında toplar, sonra ANA ÜRÜN altında gruplar. Ana ürünlü satırlar
 * ana ürün başlığı + toplam ile, altında alt ürün kırılımıyla gösterilir; ana ürünü olmayanlar tekil.
 * Örn:  • Dondurma: 2 / – Çikolatalı: 1 / – Sade: 1
 */
function buildReturnSummary(
  lines: { pid: number | null; qty: number }[],
  infoById: Map<number, BalanceInfo>
): string {
  const qtyByProduct = new Map<number, number>();
  for (const l of lines) {
    if (l.pid == null) continue;
    qtyByProduct.set(l.pid, (qtyByProduct.get(l.pid) ?? 0) + l.qty);
  }

  type Child = { name: string; qty: number; unit: string | null };
  type Group = { parentName: string; total: number; unit: string | null; unitUniform: boolean; children: Child[] };
  const groups = new Map<number, Group>();
  const standalone: Child[] = [];

  for (const [pid, qty] of qtyByProduct) {
    const info = infoById.get(pid);
    const name = info?.name ?? `#${pid}`;
    const unit = info?.unit ?? null;
    if (info?.parentId != null) {
      const g =
        groups.get(info.parentId) ??
        { parentName: info.parentName ?? name, total: 0, unit, unitUniform: true, children: [] };
      if (g.children.length > 0 && g.unit !== unit) g.unitUniform = false;
      g.total += qty;
      g.children.push({ name, qty, unit });
      groups.set(info.parentId, g);
    } else {
      standalone.push({ name, qty, unit });
    }
  }

  const fmt = (qty: number, unit: string | null) => `${qty}${unit ? ` ${unit}` : ""}`;
  const parts: string[] = [];
  for (const g of groups.values()) {
    parts.push(`• ${g.parentName}: ${fmt(g.total, g.unitUniform ? g.unit : null)}`);
    for (const c of g.children) parts.push(`    – ${c.name}: ${fmt(c.qty, c.unit)}`);
  }
  for (const s of standalone) parts.push(`• ${s.name}: ${fmt(s.qty, s.unit)}`);
  return parts.join("\n");
}

/**
 * Doğrudan (anlık) Şube → Depo TOPLU iade. /branches hızlı işlemler menüsünden açılır.
 * Ürünler şubenin GERÇEK bakiyelerinden gelir (yalnız bakiye > 0). Tek istek, çok satır:
 * backend `receive-from-branch` çok-satırlıdır ve tümü tek atomik transaction'da işlenir.
 * Idempotency yaşam döngüsü tamamen useReturnBranchToWarehouse içindedir (tüm satırların imzası → tek anahtar).
 */
export function BranchBulkReturnToWarehouseModal({ open, onClose, branchId, branchName }: Props) {
  const warehousesQ = useWarehousesList();
  const balancesQ = useBranchProductBalances(branchId, undefined, open);
  const returnMut = useReturnBranchToWarehouse(branchId);

  const [warehouseId, setWarehouseId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);

  const warehouseOptions = useMemo(
    () => (warehousesQ.data ?? []).map((w) => ({ value: String(w.id), label: w.name })),
    [warehousesQ.data]
  );

  const balances = useMemo(() => balancesQ.data ?? [], [balancesQ.data]);
  const balanceById = useMemo(() => {
    const m = new Map<
      number,
      {
        name: string;
        unit: string | null;
        balance: number;
        parentId: number | null;
        parentName: string | null;
      }
    >();
    for (const b of balances)
      m.set(b.productId, {
        name: b.productName,
        unit: b.productUnit,
        balance: b.balance,
        parentId: b.parentProductId,
        parentName: b.parentProductName,
      });
    return m;
  }, [balances]);
  const productOptions = useMemo(
    () =>
      balances
        .filter((b) => b.balance > 0)
        .map((b) => ({
          value: String(b.productId),
          label: `${b.productName}${b.productUnit ? ` (${b.productUnit})` : ""}`,
        })),
    [balances]
  );

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }
  function removeRow(id: string) {
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.id !== id)));
  }

  const parsed = rows.map((r) => {
    const pid = r.productId !== "" ? Number(r.productId) : null;
    const qty = Number(r.quantity.replace(",", "."));
    const filled = r.productId !== "" || r.quantity !== "";
    const valid = pid != null && Number.isFinite(qty) && qty > 0;
    return { row: r, pid, qty, filled, valid };
  });
  const validLines = parsed.filter((p) => p.valid);
  const anyInvalidFilled = parsed.some((p) => p.filled && !p.valid);

  const canSubmit =
    warehouseId !== "" && validLines.length > 0 && !anyInvalidFilled && !returnMut.isPending;

  async function doSubmit() {
    try {
      const lines = validLines.map((p) => ({ productId: p.pid!, quantity: p.qty }));
      await returnMut.mutateAsync({ warehouseId: Number(warehouseId), lines });
      notify.success("Depoya iade tamamlandı.");
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e) || "Depoya iade başarısız.");
    }
  }

  function submit() {
    if (!canSubmit) return;
    const whLabel = warehouseOptions.find((o) => o.value === warehouseId)?.label ?? "";
    const summary = buildReturnSummary(validLines, balanceById);
    notifyConfirmToast({
      toastId: "branch-bulk-return-confirm",
      title: "Depoya toplu iade",
      message: `${whLabel} deposuna iade edilecek:\n${summary}\n\nOnaylıyor musunuz?`,
      cancelLabel: "Vazgeç",
      confirmLabel: "Depoya İade",
      onConfirm: doSubmit,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="branch-bulk-return-title"
      title={
        <span className="flex flex-col">
          <span className="text-base font-semibold text-zinc-900">Depoya Toplu İade</span>
          {branchName ? <span className="text-xs font-normal text-zinc-500">{branchName}</span> : null}
        </span>
      }
      description="Seçilen ürünler şubeden düşülüp hedef depoya eklenir. Sevkiyat/onay adımı yoktur."
      narrow
    >
      <div className="mt-3 flex flex-col gap-4">
        <Select
          label="Hedef depo"
          labelRequired
          name="warehouseId"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          onBlur={() => {}}
          options={warehouseOptions}
          disabled={warehousesQ.isPending}
          ariaLabel="Hedef depo"
        />

        {balancesQ.isPending ? (
          <p className="text-sm text-zinc-500">Yükleniyor…</p>
        ) : productOptions.length === 0 ? (
          <p className="text-sm text-zinc-500">Bu şubede iade edilebilir stok yok.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((r) => {
              const pid = r.productId !== "" ? Number(r.productId) : null;
              const bal = pid != null ? balanceById.get(pid)?.balance ?? 0 : null;
              const qty = Number(r.quantity.replace(",", "."));
              const rowOver = bal != null && Number.isFinite(qty) && qty > bal;
              return (
                <div key={r.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Select
                      ariaLabel="Ürün"
                      name={`product-${r.id}`}
                      value={r.productId}
                      onChange={(e) => updateRow(r.id, { productId: e.target.value })}
                      onBlur={() => {}}
                      options={productOptions}
                    />
                    {bal != null ? (
                      <p className="mt-1 text-[11px] text-zinc-500">Bakiye: {bal}</p>
                    ) : null}
                  </div>
                  <div className="w-28 shrink-0">
                    <input
                      inputMode="decimal"
                      value={r.quantity}
                      onChange={(e) => updateRow(r.id, { quantity: e.target.value })}
                      placeholder="Miktar"
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                    {rowOver ? (
                      <p className="mt-1 text-[11px] text-amber-700">Bakiyeyi aşıyor</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    disabled={rows.length <= 1}
                    aria-label="Satırı kaldır"
                    className="mt-1 rounded-lg p-2 text-zinc-400 transition hover:text-rose-600 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-violet-700 transition hover:text-violet-800"
            >
              <Plus className="h-4 w-4" /> Satır ekle
            </button>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={returnMut.isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} busy={returnMut.isPending}>
            Depoya İade
          </Button>
        </div>
      </div>
    </Modal>
  );
}
