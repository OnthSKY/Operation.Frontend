"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Card } from "@/shared/components/Card";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { useSaveSiteContent, useSiteContent } from "@/modules/public-site/hooks/usePublicSiteQueries";
import { RevalidateSiteButton } from "@/modules/public-site/components/RevalidateSiteButton";
import type { SiteContentAdmin } from "@/modules/public-site/api/public-site-api";

const EMPTY: SiteContentAdmin = {
  brandName: "",
  brandTagline: "",
  about: "",
  mission: "",
  vision: "",
  contactEmail: "",
  instagram: "",
  contactPhone: "",
  footerNote: "",
  homeFeatures: [],
  menu: { notice: "", footerNote: "", selfService: { title: "", steps: [] } },
};

// Ana sayfadaki kartların ikonları tasarım gereği slota sabit — panelde yalnız metin düzenlenir.
const FEATURE_ICON_HINTS = ["🌿 Doğal", "❄️ Geleneksel", "🏬 Şube"];

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <textarea
        className="min-h-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function PublicSiteContentScreen() {
  const { data, isLoading } = useSiteContent();
  const save = useSaveSiteContent();
  const [form, setForm] = useState<SiteContentAdmin>(EMPTY);

  useEffect(() => {
    if (data) {
      setForm({
        brandName: data.brandName ?? "",
        brandTagline: data.brandTagline ?? "",
        about: data.about ?? "",
        mission: data.mission ?? "",
        vision: data.vision ?? "",
        contactEmail: data.contactEmail ?? "",
        instagram: data.instagram ?? "",
        contactPhone: data.contactPhone ?? "",
        footerNote: data.footerNote ?? "",
        homeFeatures: data.homeFeatures ?? [],
        menu: {
          notice: data.menu?.notice ?? "",
          footerNote: data.menu?.footerNote ?? "",
          selfService: {
            title: data.menu?.selfService?.title ?? "",
            steps: data.menu?.selfService?.steps ?? [],
          },
        },
      });
    }
  }, [data]);

  const set = <K extends keyof SiteContentAdmin>(key: K, value: SiteContentAdmin[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setFeature = (index: number, patch: Partial<SiteContentAdmin["homeFeatures"][number]>) =>
    setForm((f) => ({
      ...f,
      homeFeatures: f.homeFeatures.map((feat, i) => (i === index ? { ...feat, ...patch } : feat)),
    }));

  // Menü alt-durumu — daima somut nesne (null gelmez); kaydederken boşlar null'a çevrilir.
  const menu = form.menu ?? { notice: "", footerNote: "", selfService: { title: "", steps: [] } };
  const self = menu.selfService ?? { title: "", steps: [] };
  const setMenu = (patch: Partial<NonNullable<SiteContentAdmin["menu"]>>) =>
    set("menu", { ...menu, ...patch });
  const setSelf = (patch: Partial<{ title: string | null; steps: string[] }>) =>
    setMenu({ selfService: { ...self, ...patch } });
  const setStep = (i: number, value: string) =>
    setSelf({ steps: self.steps.map((s, idx) => (idx === i ? value : s)) });
  const addStep = () => setSelf({ steps: [...self.steps, ""] });
  const removeStep = (i: number) => setSelf({ steps: self.steps.filter((_, idx) => idx !== i) });

  const onSave = async () => {
    try {
      // Menü: boş adım/başlıkları temizle, tüm alanlar boşsa null gönder (menüde gizlenir).
      const steps = self.steps.map((s) => s.trim()).filter(Boolean);
      const noticeOut = menu.notice?.trim() || null;
      const menuFooterOut = menu.footerNote?.trim() || null;
      const titleOut = self.title?.trim() || null;
      const selfOut = titleOut || steps.length > 0 ? { title: titleOut, steps } : null;
      const menuOut =
        noticeOut || menuFooterOut || selfOut
          ? { notice: noticeOut, footerNote: menuFooterOut, selfService: selfOut }
          : null;

      await save.mutateAsync({
        ...form,
        brandTagline: form.brandTagline || null,
        about: form.about || null,
        mission: form.mission || null,
        vision: form.vision || null,
        contactEmail: form.contactEmail || null,
        instagram: form.instagram || null,
        contactPhone: form.contactPhone || null,
        footerNote: form.footerNote || null,
        homeFeatures: form.homeFeatures,
        menu: menuOut,
      });
      notify.success("Site içeriği kaydedildi.");
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-3xl p-4 text-sm text-zinc-400">Yükleniyor…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-4">
      <div className="flex justify-end">
        <RevalidateSiteButton />
      </div>

      <Card title="Marka" description="Sitenin genel kimliği.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Marka adı" value={form.brandName} onChange={(e) => set("brandName", e.target.value)} />
          <Input label="Slogan" value={form.brandTagline ?? ""} onChange={(e) => set("brandTagline", e.target.value)} />
        </div>
        <div className="mt-4">
          <TextArea label="Hakkımızda" value={form.about ?? ""} onChange={(v) => set("about", v)} />
        </div>
      </Card>

      <Card title="Misyon & Vizyon">
        <div className="grid gap-4">
          <TextArea label="Misyon" value={form.mission ?? ""} onChange={(v) => set("mission", v)} />
          <TextArea label="Vizyon" value={form.vision ?? ""} onChange={(v) => set("vision", v)} />
        </div>
      </Card>

      <Card title="Ana sayfa kartları" description="Ana sayfadaki “neden biz” bölümü. İkonlar sabittir; yalnız metni düzenlersiniz.">
        <div className="grid gap-4">
          {form.homeFeatures.map((feat, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
              <p className="mb-2 text-xs font-semibold text-zinc-500">
                {i + 1}. kart {FEATURE_ICON_HINTS[i] ? `· ${FEATURE_ICON_HINTS[i]}` : ""}
              </p>
              <div className="grid gap-3">
                <Input label="Başlık" value={feat.title} onChange={(e) => setFeature(i, { title: e.target.value })} />
                <TextArea label="Açıklama" value={feat.text} onChange={(v) => setFeature(i, { text: v })} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Footer" description="Sitenin altındaki marka açıklaması.">
        <TextArea label="Footer metni" value={form.footerNote ?? ""} onChange={(v) => set("footerNote", v)} />
      </Card>

      <Card
        title="Dijital Menü (QR)"
        description="QR ile açılan /menu sayfası. Boş bırakılan alanlar menüde gizlenir."
      >
        <div className="grid gap-4">
          <Input
            label="Üst bilgi şeridi"
            value={menu.notice ?? ""}
            onChange={(e) => setMenu({ notice: e.target.value })}
            placeholder="ör. Self servis — reyondan seçip kasada ödeyiniz."
          />

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
            <p className="mb-2 text-xs font-semibold text-zinc-500">Self servis akışı</p>
            <div className="grid gap-3">
              <Input
                label="Başlık"
                value={self.title ?? ""}
                onChange={(e) => setSelf({ title: e.target.value })}
                placeholder="ör. Self Servis · Nasıl Çalışır?"
              />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700">Adımlar</span>
                {self.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
                      {i + 1}
                    </span>
                    <Input
                      value={step}
                      onChange={(e) => setStep(i, e.target.value)}
                      placeholder={`Adım ${i + 1}`}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      aria-label="Adımı sil"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 transition hover:bg-zinc-100 hover:text-red-600"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <Button variant="secondary" onClick={addStep} className="w-fit gap-1.5">
                  <Plus size={15} /> Adım ekle
                </Button>
              </div>
            </div>
          </div>

          <Input
            label="Alt not"
            value={menu.footerNote ?? ""}
            onChange={(e) => setMenu({ footerNote: e.target.value })}
            placeholder="ör. Çeşitler mevsime göre değişebilir."
          />
        </div>
      </Card>

      <Card title="İletişim">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="E-posta" value={form.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value)} />
          <Input label="Instagram" value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} placeholder="@ olmadan" />
          <Input label="Telefon" value={form.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value)} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={save.isPending} className="w-full sm:w-auto">
          {save.isPending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}
