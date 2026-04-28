"use client";

import { Button } from "@/shared/ui/Button";
import type { ChangeEventHandler, Dispatch, RefObject, SetStateAction } from "react";

type Props = {
  t: (key: string) => string;
  companyName: string;
  setCompanyName: Dispatch<SetStateAction<string>>;
  branchName: string;
  setBranchName: Dispatch<SetStateAction<string>>;
  emblemDataUrl: string;
  setEmblemDataUrl: Dispatch<SetStateAction<string>>;
  emblemFileInputRef: RefObject<HTMLInputElement | null>;
  onEmblemFileChange: ChangeEventHandler<HTMLInputElement>;
  onUseBrandingEmblem: () => void;
  brandingLogoBusy: boolean;
  documentTitle: string;
  setDocumentTitle: Dispatch<SetStateAction<string>>;
  showDocumentTagline: boolean;
};

export function OrderAccountStatementDocumentContentSection(props: Props) {
  const {
    t,
    companyName,
    setCompanyName,
    branchName,
    setBranchName,
    emblemDataUrl,
    setEmblemDataUrl,
    emblemFileInputRef,
    onEmblemFileChange,
    onUseBrandingEmblem,
    brandingLogoBusy,
    documentTitle,
    setDocumentTitle,
    showDocumentTagline,
  } = props;

  const normalizedTitle = documentTitle.toLocaleLowerCase("tr-TR");
  const hasDefaultTaglineWords =
    (normalizedTitle.includes("sipariş") || normalizedTitle.includes("siparis")) &&
    (normalizedTitle.includes("hesap dökümü") || normalizedTitle.includes("hesap dokumu"));

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">2B · Belge icerigi</p>
        <span className="inline-flex rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          PDF gorunumu
        </span>
      </div>
      <p className="mb-3 text-[11px] text-emerald-700">{t("reports.orderAccountStatementPaneDocumentHelp")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-zinc-600">{t("reports.orderAccountStatementHeaderCompany")}</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            autoComplete="organization"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600">{t("reports.orderAccountStatementHeaderBranch")}</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
        <label className="block text-sm">
          <span className="text-zinc-600">{t("reports.orderAccountStatementEmblem")}</span>
          <input
            ref={emblemFileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onEmblemFileChange}
          />
          <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2">
            <span className="inline-flex min-w-0 items-center gap-2">
              {emblemDataUrl ? (
                <img
                  src={emblemDataUrl}
                  alt={t("reports.orderAccountStatementEmblem")}
                  className="h-9 w-9 shrink-0 rounded-lg border border-zinc-200 bg-white object-contain p-0.5"
                />
              ) : (
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-400">
                  Logo
                </span>
              )}
              <span className="truncate text-xs font-medium text-zinc-700">
                {emblemDataUrl ? t("reports.orderAccountStatementEmblem") : "Amblem seçilmedi"}
              </span>
            </span>
            <Button
              type="button"
              variant="secondary"
              className="!h-8 !min-h-8 !w-auto shrink-0 rounded-md px-2.5 text-[11px]"
              onClick={() => emblemFileInputRef.current?.click()}
            >
              {emblemDataUrl ? "Değiştir" : "Yükle"}
            </Button>
          </div>
          <span className="mt-1 block text-[11px] text-zinc-500">{t("reports.orderAccountStatementEmblemHelp")}</span>
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="!h-8 !min-h-8 !w-auto rounded-md px-2.5 text-xs"
            onClick={onUseBrandingEmblem}
            disabled={brandingLogoBusy}
          >
            {brandingLogoBusy ? (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="mr-1.5 h-3.5 w-3.5 animate-spin"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3a9 9 0 109 9" />
              </svg>
            ) : null}
            <span>
              {brandingLogoBusy
                ? t("reports.orderAccountStatementEmblemFetching")
                : t("reports.orderAccountStatementEmblemUseInstitutionImage")}
            </span>
          </Button>
          {emblemDataUrl ? (
            <Button
              type="button"
              variant="ghost"
              className="!h-8 !min-h-8 !w-auto rounded-md px-2.5 text-xs text-red-700 hover:!bg-red-50"
              onClick={() => setEmblemDataUrl("")}
            >
              {t("reports.orderAccountStatementEmblemClear")}
            </Button>
          ) : null}
        </div>
      </div>
      <label className="mt-3 block text-sm">
        <span className="text-zinc-600">{t("reports.orderAccountStatementDocTitle")}</span>
        <input
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
          placeholder="Örn: Nisan 2026 Cari Ekstre Özeti"
        />
        <p className="mt-1 text-[11px] text-zinc-500">
          Buraya dönem/özet adı yazın (örn. "Nisan 2026 Cari Ekstre"). "Sipariş ve Hesap Dökümü" satırı ayrıca
          gösteriliyorsa aynı ifadeyi başlıkta tekrar etmeyin.
        </p>
        {showDocumentTagline && hasDefaultTaglineWords ? (
          <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
            Başlıkta "Sipariş ve Hesap Dökümü" ifadesi tekrar ediyor; mükerrer görünümü önlemek için başlığı daha
            özel bir adla güncelleyin.
          </p>
        ) : null}
      </label>
    </div>
  );
}
