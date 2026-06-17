"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/shared/ui/Modal";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Checkbox } from "@/shared/ui/Checkbox";
import { notify } from "@/shared/lib/notify";
import { slugify } from "@/modules/public-site/lib/slugify";
import { useCreateFlavor, useSelectableProducts } from "@/modules/public-site/hooks/usePublicSiteQueries";
import type { Flavor, UpsertFlavor } from "@/modules/public-site/api/public-site-api";

/** Yeni çeşitlere sırayla atanan, hoş duran varsayılan renk paleti (sonradan düzenlenebilir). */
const DEFAULT_COLORS = [
  "#e6d6bf",
  "#f4c7ab",
  "#cdb4db",
  "#b5e2c9",
  "#ffd6a5",
  "#bde0fe",
  "#f7c8d0",
  "#d8e2dc",
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Mevcut çeşitler — zaten eklenmiş ürünleri işaretlemek ve sıra numarası vermek için. */
  existing: Flavor[];
};

export function BulkAddFlavorsFromProducts({ open, onClose, existing }: Props) {
  const { data: products, isLoading } = useSelectableProducts();
  const create = useCreateFlavor();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // Zaten eklenmiş çeşitlerin slug'ları — ürünleri "Eklendi" diye işaretlemek için.
  const existingSlugs = useMemo(
    () => new Set(existing.map((f) => f.slug.toLowerCase())),
    [existing]
  );

  const rows = useMemo(() => {
    const all = (products ?? []).map((p) => ({
      ...p,
      slug: slugify(p.name),
    }));
    const q = query.trim().toLocaleLowerCase("tr");
    const filtered = q
      ? all.filter(
          (p) =>
            p.name.toLocaleLowerCase("tr").includes(q) ||
            (p.category ?? "").toLocaleLowerCase("tr").includes(q)
        )
      : all;
    return filtered.map((p) => ({ ...p, alreadyAdded: existingSlugs.has(p.slug) }));
  }, [products, query, existingSlugs]);

  // Yalnızca henüz eklenmemiş ürünler seçilebilir.
  const selectableRows = rows.filter((r) => !r.alreadyAdded);
  const allSelectableChecked =
    selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.id));

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      if (allSelectableChecked) {
        const next = new Set(prev);
        for (const r of selectableRows) next.delete(r.id);
        return next;
      }
      const next = new Set(prev);
      for (const r of selectableRows) next.add(r.id);
      return next;
    });

  const reset = () => {
    setQuery("");
    setSelected(new Set());
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  /** Verilen pick listesini sırayla ekle (paylaşılan iç akış). */
  const performAdd = async (picks: typeof products extends (infer U)[] | undefined ? U[] : never) => {
    if (!picks || picks.length === 0) {
      notify.error("Hiç ürün seçilmedi.");
      return;
    }
    setSaving(true);
    let baseOrder = existing.reduce((max, f) => Math.max(max, f.sortOrder), 0);
    let ok = 0;
    const failed: string[] = [];

    for (let i = 0; i < picks.length; i++) {
      const p = picks[i];
      baseOrder += 1;
      const body: UpsertFlavor = {
        slug: slugify(p.name),
        name: p.name,
        category: p.category?.trim() ? p.category : "Genel",
        color: DEFAULT_COLORS[(existing.length + i) % DEFAULT_COLORS.length],
        description: null,
        isSignature: false,
        image: null,
        isActive: true,
        sortOrder: baseOrder,
      };
      try {
        await create.mutateAsync(body);
        ok += 1;
      } catch {
        failed.push(p.name);
      }
    }

    setSaving(false);

    if (ok > 0) notify.success(`${ok} çeşit eklendi.`);
    if (failed.length > 0) {
      notify.error(
        `${failed.length} çeşit eklenemedi: ${failed.slice(0, 3).join(", ")}${
          failed.length > 3 ? "…" : ""
        }`
      );
    }
    if (failed.length === 0) {
      close();
    } else {
      setSelected(new Set((products ?? []).filter((p) => failed.includes(p.name)).map((p) => p.id)));
    }
  };

  const onAdd = async () => {
    const picks = (products ?? []).filter(
      (p) => selected.has(p.id) && !existingSlugs.has(slugify(p.name))
    );
    await performAdd(picks as never);
  };

  /** Hızlı seç: mevcut olmayan TÜM ürünleri otomatik seçer. Kullanıcı sonra "Seçilenleri ekle"yi tıklar. */
  const onQuickSelectAll = () => {
    const addable = (products ?? []).filter((p) => !existingSlugs.has(slugify(p.name)));
    if (addable.length === 0) {
      notify.info("Eklenecek yeni ürün yok — hepsi zaten vitrinde.");
      return;
    }
    // Arama filtresini temizle, tüm eklenebilir ürünleri seçili işaretle
    setQuery("");
    setSelected(new Set(addable.map((p) => p.id)));
    notify.success(`${addable.length} ürün seçildi. "Seçilenleri ekle" ile eklemeyi tamamlayın.`);
  };

  const selectedCount = selected.size;

  return (
    <Modal
      open={open}
      onClose={close}
      titleId="bulk-add-flavors-title"
      title="Üründen çeşit ekle"
      description="Ürün kataloğundan seçtiklerinizi tek seferde web vitrinine çeşit olarak ekleyin."
      wide
      wideFixedHeight
      wideFullScreenMobile
      closeButtonLabel="Kapat"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Arama + hızlı ekle + tümünü seç */}
        <div className="shrink-0 border-b border-zinc-100 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="min-w-0 flex-1">
              <Input
                type="search"
                placeholder="Ürün veya kategori ara…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Ürün ara"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={onQuickSelectAll}
              disabled={saving || isLoading || (products?.length ?? 0) === 0}
              className="shrink-0"
              title="Mevcut olmayan tüm ürünleri seçer (eklemek için onayla)"
            >
              ⚡ Hepsini seç
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleAll}
              disabled={selectableRows.length === 0 || saving}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40"
            >
              <Checkbox checked={allSelectableChecked} onCheckedChange={toggleAll} disabled={selectableRows.length === 0 || saving} />
              Görünenlerin tümünü seç
            </button>
            <span className="text-xs text-zinc-400">{selectableRows.length} eklenebilir ürün</span>
          </div>
        </div>

        {/* Ürün listesi */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
          {isLoading ? (
            <p className="text-sm text-zinc-400">Yükleniyor…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-zinc-400">
              {query.trim() ? "Aramaya uyan ürün yok." : "Eklenebilir ürün bulunamadı."}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => !p.alreadyAdded && !saving && toggle(p.id)}
                      disabled={p.alreadyAdded || saving}
                      aria-pressed={checked}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        p.alreadyAdded
                          ? "cursor-not-allowed border-zinc-100 bg-zinc-50"
                          : checked
                            ? "border-violet-400 bg-violet-50"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
                      ].join(" ")}
                    >
                      {p.alreadyAdded ? (
                        <span className="inline-flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
                          ✓
                        </span>
                      ) : (
                        <Checkbox checked={checked} onCheckedChange={() => toggle(p.id)} disabled={saving} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-800">{p.name}</span>
                        <span className="block truncate text-xs text-zinc-400">
                          {p.category ?? "Kategorisiz"}
                        </span>
                      </span>
                      {p.alreadyAdded ? (
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          Eklendi
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Alt aksiyon çubuğu */}
        <div className="shrink-0 border-t border-zinc-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-600">
              {selectedCount > 0 ? (
                <>
                  <span className="font-semibold text-zinc-900">{selectedCount}</span> ürün seçili
                </>
              ) : (
                "Eklemek için ürün seçin"
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={close} disabled={saving} className="flex-1 sm:flex-none">
                Vazgeç
              </Button>
              <Button onClick={onAdd} disabled={saving || selectedCount === 0} className="flex-1 sm:flex-none">
                {saving ? "Ekleniyor…" : `Seçilenleri ekle${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Eklenen çeşitlere otomatik renk ve kategori atanır; ad ve slug üründen gelir. Detayları
            listeden düzenleyebilirsiniz.
          </p>
        </div>
      </div>
    </Modal>
  );
}
