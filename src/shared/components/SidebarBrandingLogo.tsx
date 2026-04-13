"use client";

import { companyBrandingLogoUrl } from "@/modules/admin/api/system-branding-api";
import { apiFetch } from "@/shared/api/client";
import { useEffect, useRef, useState } from "react";

type Props = {
  hasLogo: boolean;
  updatedAtUtc: string | null | undefined;
  className?: string;
};

/**
 * Çapraz köken <img src> çoğu kurulumda auth çerezini göndermez; logo için fetch + blob kullanılır.
 */
export function SidebarBrandingLogo({ hasLogo, updatedAtUtc, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasLogo) {
      setSrc(null);
      return;
    }

    const ctrl = new AbortController();
    const url = companyBrandingLogoUrl(updatedAtUtc);

    void (async () => {
      try {
        const res = await apiFetch(url, { signal: ctrl.signal });
        if (!res.ok) return;
        const blob = await res.blob();
        if (ctrl.signal.aborted) return;
        if (blobRef.current) {
          URL.revokeObjectURL(blobRef.current);
          blobRef.current = null;
        }
        blobRef.current = URL.createObjectURL(blob);
        setSrc(blobRef.current);
      } catch {
        if (!ctrl.signal.aborted) setSrc(null);
      }
    })();

    return () => {
      ctrl.abort();
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setSrc(null);
    };
  }, [hasLogo, updatedAtUtc]);

  if (!hasLogo || !src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob: URL
    <img src={src} alt="" className={className} />
  );
}
