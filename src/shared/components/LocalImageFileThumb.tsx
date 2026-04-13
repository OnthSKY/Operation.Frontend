"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** Seçilen yerel dosya için küçük önizleme (object URL; unmount’ta temizlenir). */
export function LocalImageFileThumb({
  file,
  className,
}: {
  file: File | null;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!file || !url) return null;

  return (
    <img
      src={url}
      alt=""
      className={cn(
        "mt-2 h-28 max-h-28 w-auto max-w-[11rem] rounded-md border border-zinc-200 object-cover object-center shadow-sm",
        className
      )}
    />
  );
}
