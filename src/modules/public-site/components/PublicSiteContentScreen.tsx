"use client";

import { useEffect, useState } from "react";
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
};

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
      });
    }
  }, [data]);

  const set = <K extends keyof SiteContentAdmin>(key: K, value: SiteContentAdmin[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    try {
      await save.mutateAsync({
        ...form,
        brandTagline: form.brandTagline || null,
        about: form.about || null,
        mission: form.mission || null,
        vision: form.vision || null,
        contactEmail: form.contactEmail || null,
        instagram: form.instagram || null,
        contactPhone: form.contactPhone || null,
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
