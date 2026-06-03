"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/shared/components/Card";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Pencil } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Select } from "@/shared/ui/Select";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { RevalidateSiteButton } from "@/modules/public-site/components/RevalidateSiteButton";
import { BulkAddFlavorsFromProducts } from "@/modules/public-site/components/BulkAddFlavorsFromProducts";
import { slugify } from "@/modules/public-site/lib/slugify";

const editIconActionButtonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 active:bg-zinc-200 disabled:pointer-events-none disabled:opacity-40";
import {
  useCreateFlavor,
  useDeleteFlavor,
  useDeleteFlavorImage,
  useFlavors,
  useSelectableProducts,
  useUpdateFlavor,
  useUploadFlavorImage,
} from "@/modules/public-site/hooks/usePublicSiteQueries";
import { flavorImageUrl, type Flavor, type UpsertFlavor } from "@/modules/public-site/api/public-site-api";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

const BLANK: UpsertFlavor = {
  slug: "",
  name: "",
  category: "",
  color: "#e6d6bf",
  description: "",
  isSignature: false,
  image: null,
  isActive: true,
  sortOrder: 0,
};

type Editing = {
  id: number | null;
  form: UpsertFlavor;
  existingHasImage: boolean;
  pendingFile: File | null;
  previewUrl: string | null;
  clearImage: boolean;
};

export function PublicSiteFlavorsScreen() {
  const { data: flavors, isLoading } = useFlavors();
  const create = useCreateFlavor();
  const update = useUpdateFlavor();
  const remove = useDeleteFlavor();
  const uploadImg = useUploadFlavorImage();
  const deleteImg = useDeleteFlavorImage();
  const { data: products } = useSelectableProducts();

  const [editing, setEditing] = useState<Editing | null>(null);
  const [productValue, setProductValue] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [imgBust, setImgBust] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Local preview URL temizliği.
  useEffect(() => {
    const url = editing?.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [editing?.previewUrl]);

  const startNew = () => {
    setProductValue("");
    setEditing({
      id: null,
      form: { ...BLANK, sortOrder: (flavors?.length ?? 0) + 1 },
      existingHasImage: false,
      pendingFile: null,
      previewUrl: null,
      clearImage: false,
    });
  };

  const startEdit = (f: Flavor) => {
    setProductValue("");
    setEditing({
      id: f.id,
      form: {
        slug: f.slug,
        name: f.name,
        category: f.category,
        color: f.color,
        description: f.description ?? "",
        isSignature: f.isSignature,
        image: null,
        isActive: f.isActive,
        sortOrder: f.sortOrder,
      },
      existingHasImage: f.hasImage,
      pendingFile: null,
      previewUrl: null,
      clearImage: false,
    });
  };

  const setForm = (patch: Partial<UpsertFlavor>) =>
    setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  // Üründen seç → çeşit adını (ve slug'ını) doldur.
  const onPickProduct = (id: string) => {
    setProductValue(id);
    const p = products?.find((x) => String(x.id) === id);
    if (p) setForm({ name: p.name, slug: slugify(p.name) });
  };

  const productOptions = (products ?? []).map((p) => ({
    value: String(p.id),
    label: p.category ? `${p.name} · ${p.category}` : p.name,
  }));

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      notify.error("Yalnız JPEG, PNG veya WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      notify.error("Görsel 8MB sınırını aşıyor.");
      return;
    }
    setEditing((e) =>
      e
        ? {
            ...e,
            pendingFile: file,
            previewUrl: URL.createObjectURL(file),
            clearImage: false,
          }
        : e
    );
  };

  const removeImage = () =>
    setEditing((e) =>
      e ? { ...e, pendingFile: null, previewUrl: null, clearImage: true } : e
    );

  const onSave = async () => {
    if (!editing) return;
    const form = { ...editing.form };
    if (!form.slug.trim()) form.slug = slugify(form.name);
    if (!form.category.trim()) {
      notify.error("Kategori girin.");
      return;
    }
    const body: UpsertFlavor = {
      ...form,
      description: form.description?.trim() ? form.description : null,
      image: null,
    };
    try {
      let id = editing.id;
      if (id == null) {
        const created = await create.mutateAsync(body);
        id = created.id;
      } else {
        await update.mutateAsync({ id, body });
      }
      if (editing.pendingFile && id != null) {
        await uploadImg.mutateAsync({ id, file: editing.pendingFile });
      } else if (editing.clearImage && editing.existingHasImage && id != null) {
        await deleteImg.mutateAsync(id);
      }
      setImgBust((n) => n + 1);
      notify.success(editing.id == null ? "Çeşit eklendi." : "Çeşit güncellendi.");
      setEditing(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onDelete = async (f: Flavor) => {
    if (!window.confirm(`"${f.name}" silinsin mi?`)) return;
    try {
      await remove.mutateAsync(f.id);
      notify.success("Çeşit silindi.");
      if (editing?.id === f.id) setEditing(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const saving = create.isPending || update.isPending || uploadImg.isPending || deleteImg.isPending;

  const currentPreview =
    editing?.previewUrl ??
    (editing && editing.existingHasImage && !editing.clearImage && editing.id != null
      ? `${flavorImageUrl(editing.id)}?v=${imgBust}`
      : null);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-3 sm:p-4">
      <div className="flex justify-end">
        <RevalidateSiteButton />
      </div>

      {/* Editör */}
      {editing && (
        <Card
          title={editing.id == null ? "Yeni çeşit" : "Çeşidi düzenle"}
          headerActions={
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Vazgeç
            </Button>
          }
        >
          {productOptions.length > 0 ? (
            <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
              <Select
                label="Üründen seç (opsiyonel)"
                name="product"
                value={productValue}
                options={productOptions}
                onChange={(e) => onPickProduct(e.target.value)}
                onBlur={() => {}}
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                Ürün kataloğundan seçince ad ve slug otomatik dolar; renk/kategori/foto’yu siz tamamlayın.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Ad" value={editing.form.name} onChange={(e) => setForm({ name: e.target.value })} />
            <Input
              label="Slug"
              value={editing.form.slug}
              onChange={(e) => setForm({ slug: e.target.value })}
              placeholder={slugify(editing.form.name)}
            />
            <Input
              label="Kategori"
              value={editing.form.category}
              onChange={(e) => setForm({ category: e.target.value })}
              placeholder="ör. Kaymaklı, Meyveli, Kuruyemişli"
            />
            <Input
              type="number"
              label="Sıra"
              value={editing.form.sortOrder}
              onChange={(e) => setForm({ sortOrder: Number(e.target.value) || 0 })}
            />
          </div>

          {/* Renk */}
          <div className="mt-4 flex items-end gap-2">
            <div>
              <span className="mb-1 block text-sm font-medium text-zinc-700">Renk</span>
              <input
                type="color"
                value={editing.form.color}
                onChange={(e) => setForm({ color: e.target.value })}
                className="h-10 w-14 rounded border border-zinc-300"
              />
            </div>
            <div className="flex-1">
              <Input label="Hex" value={editing.form.color} onChange={(e) => setForm({ color: e.target.value })} />
            </div>
          </div>

          <div className="mt-4">
            <Input
              label="Açıklama"
              value={editing.form.description ?? ""}
              onChange={(e) => setForm({ description: e.target.value })}
            />
          </div>

          {/* Fotoğraf — sisteme yükleme */}
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:p-4">
            <p className="text-sm font-semibold text-zinc-800">Fotoğraf</p>
            <p className="mt-1 text-xs text-zinc-500">JPEG / PNG / WebP · en fazla 8MB. Yoksa renkten görsel üretilir.</p>
            <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {currentPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentPreview} alt="Önizleme" className="h-20 w-20 rounded-lg border border-black/10 object-cover" />
              ) : (
                <span
                  className="flex h-20 w-20 items-center justify-center rounded-lg border border-black/10 text-xs text-zinc-400"
                  style={{ background: editing.form.color }}
                >
                  görsel yok
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                  Fotoğraf seç
                </Button>
                {currentPreview && (
                  <Button variant="ghost" onClick={removeImage}>
                    Kaldır
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Anahtarlar */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={editing.form.isSignature} onCheckedChange={(v) => setForm({ isSignature: v })} />
                İmza / öne çıkan
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={editing.form.isActive} onCheckedChange={(v) => setForm({ isActive: v })} />
                Yayında
              </label>
            </div>
            <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </Card>
      )}

      {/* Liste */}
      <Card
        title="Çeşitler"
        description="Web sitesindeki dondurma çeşitleri."
        headerActions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>
              Üründen ekle
            </Button>
            <Button onClick={startNew}>+ Yeni çeşit</Button>
          </div>
        }
      >
        {isLoading ? (
          <p className="text-sm text-zinc-400">Yükleniyor…</p>
        ) : !flavors?.length ? (
          <p className="text-sm text-zinc-400">Henüz çeşit yok. “Yeni çeşit” ile ekleyin.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {flavors.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                {f.hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${flavorImageUrl(f.id)}?v=${imgBust}`} alt="" className="h-9 w-9 shrink-0 rounded-full border border-black/10 object-cover" />
                ) : (
                  <span className="h-9 w-9 shrink-0 rounded-full border border-black/10" style={{ background: f.color }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">
                    {f.name} {f.isSignature ? <span className="text-amber-500">★</span> : null}
                  </p>
                  <p className="truncate text-xs text-zinc-400">{f.category} · {f.slug}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${f.isActive ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-500"}`}>
                  {f.isActive ? "Yayında" : "Gizli"}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(f)}
                  className={editIconActionButtonClass}
                  title="Düzenle"
                  aria-label={`${f.name} çeşidini düzenle`}
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(f)}
                  disabled={remove.isPending}
                  className={trashIconActionButtonClass}
                  title="Sil"
                  aria-label={`${f.name} çeşidini sil`}
                >
                  <TrashIcon className="h-[18px] w-[18px]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <BulkAddFlavorsFromProducts
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        existing={flavors ?? []}
      />
    </div>
  );
}
