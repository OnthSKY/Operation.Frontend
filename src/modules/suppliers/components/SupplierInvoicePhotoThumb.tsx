"use client";

import { useSupplierInvoicePhotoBlob } from "@/modules/suppliers/components/useSupplierInvoicePhoto";
import { cn } from "@/lib/cn";

type Props = {
  invoiceId: number;
  hasInvoicePhoto: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
};

/** Small clickable thumbnail of a supplier invoice photo. Renders nothing if none. */
export function SupplierInvoicePhotoThumb({ invoiceId, hasInvoicePhoto, onClick, className, ariaLabel }: Props) {
  const enabled = hasInvoicePhoto && invoiceId > 0;
  const { objectUrl, loading } = useSupplierInvoicePhotoBlob(invoiceId, enabled);

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "group inline-flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 ring-violet-500/40 transition hover:border-violet-300 hover:shadow focus-visible:outline-none focus-visible:ring-2",
        className,
      )}
    >
      {loading ? (
        <span className="text-[10px] font-medium text-zinc-400">…</span>
      ) : objectUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL from authenticated fetch
        <img
          src={objectUrl}
          alt=""
          className="h-full w-full object-cover object-center transition-transform duration-150 group-hover:scale-[1.04]"
        />
      ) : (
        <span className="text-[10px] font-medium text-zinc-400">—</span>
      )}
    </button>
  );
}
