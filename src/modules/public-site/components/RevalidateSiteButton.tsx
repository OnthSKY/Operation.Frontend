"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { useRevalidateSite } from "@/modules/public-site/hooks/usePublicSiteQueries";

/** "Siteyi Güncelle" — vitrin sitesinin önbelleğini anında tazeler. */
export function RevalidateSiteButton() {
  const revalidate = useRevalidateSite();

  const onClick = async () => {
    try {
      await revalidate.mutateAsync();
      notify.success("Site güncellendi — değişiklikler birkaç saniye içinde yayında.");
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <Button variant="secondary" onClick={onClick} disabled={revalidate.isPending}>
      <RefreshCw size={16} className={revalidate.isPending ? "animate-spin" : ""} />
      {revalidate.isPending ? "Güncelleniyor…" : "Siteyi Güncelle"}
    </Button>
  );
}
