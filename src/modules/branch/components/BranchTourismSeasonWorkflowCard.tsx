"use client";

import { Card } from "@/shared/components/Card";
import Link from "next/link";

type Props = {
  t: (key: string) => string;
  showAdminPolicyLink: boolean;
};

/**
 * Turizm sezonu sekmesindeki iş akışı özeti (metin + isteğe bağlı merkez politika linki).
 * Şube sezonu CRUD’dan ayrı tutulur (tek sorumluluk).
 */
export function BranchTourismSeasonWorkflowCard({ t, showAdminPolicyLink }: Props) {
  return (
    <Card className="border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/[0.04]">
      <h3 className="text-sm font-semibold text-zinc-900">{t("branch.tSeasonGuideTitle")}</h3>
      <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-zinc-700 sm:pl-5">
        <li>{t("branch.tSeasonGuideStep1")}</li>
        <li>{t("branch.tSeasonGuideStep2")}</li>
        <li>{t("branch.tSeasonGuideStep3")}</li>
        <li>{t("branch.tSeasonGuideStep4")}</li>
      </ol>
      {showAdminPolicyLink ? (
        <p className="mt-3 text-sm">
          <Link
            href="/admin/settings/tourism-season-closed-policy"
            className="inline-flex min-h-11 items-center font-medium text-emerald-700 underline decoration-emerald-700/40 underline-offset-2 hover:text-emerald-800 sm:min-h-0"
          >
            {t("branch.tSeasonGuidePolicyLink")}
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">{t("branch.tSeasonGuidePolicyNoteViewer")}</p>
      )}
    </Card>
  );
}
