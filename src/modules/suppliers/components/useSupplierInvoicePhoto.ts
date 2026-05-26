"use client";

import { apiFetch } from "@/shared/api/client";
import { useEffect, useRef, useState } from "react";

/** Loads the supplier invoice photo via authenticated fetch and returns a blob URL. */
export function useSupplierInvoicePhotoBlob(invoiceId: number | null, enabled: boolean) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || invoiceId == null || invoiceId <= 0) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setObjectUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setObjectUrl(null);

    void (async () => {
      try {
        const res = await apiFetch(`/suppliers/invoices/${invoiceId}/invoice-photo`);
        if (cancelled) return;
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setObjectUrl(u);
      } catch {
        /* no file */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [invoiceId, enabled]);

  return { objectUrl, loading };
}
