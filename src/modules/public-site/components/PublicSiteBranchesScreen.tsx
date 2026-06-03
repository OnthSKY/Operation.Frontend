"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/shared/components/Card";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";
import {
  usePublicSiteBranch,
  usePublicSiteBranches,
  useSavePublicSiteBranch,
} from "@/modules/public-site/hooks/usePublicSiteQueries";
import { RevalidateSiteButton } from "@/modules/public-site/components/RevalidateSiteButton";
import type { UpsertBranchPublicProfile } from "@/modules/public-site/api/public-site-api";

type FormState = UpsertBranchPublicProfile & { keywordsText: string };

const EMPTY: FormState = {
  isPublished: false,
  city: "",
  district: "",
  publicAddress: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  hoursText: "",
  openingHoursSchema: "",
  mapsUrl: "",
  lat: null,
  lng: null,
  keywords: [],
  keywordsText: "",
  description: "",
};

export function PublicSiteBranchesScreen() {
  const { data: branches, isLoading } = usePublicSiteBranches();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: profile } = usePublicSiteBranch(selectedId);
  const save = useSavePublicSiteBranch();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [openTime, setOpenTime] = useState("10:00");
  const [closeTime, setCloseTime] = useState("23:00");

  useEffect(() => {
    if (selectedId == null && branches && branches.length > 0) {
      setSelectedId(branches[0]!.branchId);
    }
  }, [branches, selectedId]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      isPublished: profile.isPublished,
      city: profile.city ?? "",
      district: profile.district ?? "",
      publicAddress: profile.publicAddress ?? "",
      phone: profile.phone ?? "",
      whatsapp: profile.whatsapp ?? "",
      instagram: profile.instagram ?? "",
      hoursText: profile.hoursText ?? "",
      openingHoursSchema: profile.openingHoursSchema ?? "",
      mapsUrl: profile.mapsUrl ?? "",
      lat: profile.lat,
      lng: profile.lng,
      keywords: profile.keywords,
      keywordsText: profile.keywords.join(", "),
      description: profile.description ?? "",
    });
  }, [profile]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const applyEveryDay = () => {
    setForm((f) => ({
      ...f,
      hoursText: `Her gün ${openTime} – ${closeTime}`,
      openingHoursSchema: `Mo-Su ${openTime}-${closeTime}`,
    }));
  };

  const onSave = async () => {
    if (selectedId == null) return;
    const keywords = form.keywordsText.split(",").map((k) => k.trim()).filter(Boolean);
    const body: UpsertBranchPublicProfile = {
      isPublished: form.isPublished,
      city: form.city || null,
      district: form.district || null,
      publicAddress: form.publicAddress || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      instagram: form.instagram || null,
      hoursText: form.hoursText || null,
      openingHoursSchema: form.openingHoursSchema || null,
      mapsUrl: form.mapsUrl || null,
      lat: form.lat,
      lng: form.lng,
      keywords,
      description: form.description || null,
    };
    try {
      await save.mutateAsync({ branchId: selectedId, body });
      notify.success("Şube vitrini kaydedildi.");
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const selectedName = useMemo(
    () => branches?.find((b) => b.branchId === selectedId)?.branchName ?? "",
    [branches, selectedId]
  );

  return (
    <div className="mx-auto max-w-6xl p-3 sm:p-4">
      <div className="mb-3 flex justify-end">
        <RevalidateSiteButton />
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card title="Şubeler" description="Vitrinde yönetmek için bir şube seçin.">
        {isLoading ? (
          <p className="text-sm text-zinc-400">Yükleniyor…</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {branches?.map((b) => (
              <li key={b.branchId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(b.branchId)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedId === b.branchId ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"
                  }`}
                >
                  <span className="truncate">{b.branchName}</span>
                  <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.isPublished ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-500"}`}>
                    {b.isPublished ? "Yayında" : "Gizli"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selectedId != null ? (
        <Card
          title={selectedName}
          description="Bu şubenin web sitesinde görünecek bilgileri."
          headerActions={
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch checked={form.isPublished} onCheckedChange={(v) => set("isPublished", v)} />
              Yayında
            </label>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="İl" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            <Input label="İlçe / Semt" value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} placeholder="ör. Dalyan" />
            <Input label="Vitrin adresi" value={form.publicAddress ?? ""} onChange={(e) => set("publicAddress", e.target.value)} placeholder={profile?.defaultAddress ?? "Boşsa şube adresi"} />
            <Input label="Telefon" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            <Input label="WhatsApp" value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} placeholder="905xxxxxxxxx" />
            <Input label="Instagram" value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} placeholder="@ olmadan" />
          </div>

          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-sm font-medium text-zinc-700">Çalışma saatleri</p>
            <div className="flex flex-wrap items-end gap-2">
              <Input type="time" label="Açılış" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-32" />
              <Input type="time" label="Kapanış" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-32" />
              <Button variant="secondary" onClick={applyEveryDay}>Her güne uygula</Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input label="Görünen metin" value={form.hoursText ?? ""} onChange={(e) => set("hoursText", e.target.value)} />
              <Input label="Yapısal (Mo-Su 10:00-23:00)" value={form.openingHoursSchema ?? ""} onChange={(e) => set("openingHoursSchema", e.target.value)} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Google Maps linki" value={form.mapsUrl ?? ""} onChange={(e) => set("mapsUrl", e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Enlem (lat)" inputMode="decimal" value={form.lat ?? ""} onChange={(e) => set("lat", e.target.value === "" ? null : Number(e.target.value))} />
              <Input label="Boylam (lng)" inputMode="decimal" value={form.lng ?? ""} onChange={(e) => set("lng", e.target.value === "" ? null : Number(e.target.value))} />
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <Input label="Anahtar kelimeler (virgülle)" value={form.keywordsText} onChange={(e) => set("keywordsText", e.target.value)} placeholder="dalyan dondurma, keçi sütü dondurma" />
            <Input label="Vitrin açıklaması" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={onSave} disabled={save.isPending} className="w-full sm:w-auto">
              {save.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-zinc-400">Soldan bir şube seçin.</p>
        </Card>
      )}
      </div>
    </div>
  );
}
