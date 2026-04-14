"use client";

import { personnelProfilePhotoUrl } from "@/modules/personnel/api/personnel-api";
import { apiFetch } from "@/shared/api/client";
import { Modal } from "@/shared/ui/Modal";
import { useEffect, useId, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  personnelId: number;
  /** Liste/detay API’sinden; yoksa varsayılan yol kullanılır. */
  profilePhoto1Url?: string | null;
  nonce: number;
  title: string;
  closeLabel: string;
  loadingLabel: string;
};

export function PersonnelProfilePhotoPreviewModal({
  open,
  onClose,
  personnelId,
  profilePhoto1Url,
  nonce,
  title,
  closeLabel,
  loadingLabel,
}: Props) {
  const titleId = useId();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const href = `${personnelProfilePhotoUrl(personnelId, 1, {
      profilePhoto1Url: profilePhoto1Url ?? undefined,
    })}?_=${nonce}`;
    const ac = new AbortController();
    void apiFetch(href, { signal: ac.signal })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (ac.signal.aborted || !blob) return;
        setSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      })
      .catch(() => {});
    return () => {
      ac.abort();
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [open, personnelId, profilePhoto1Url, nonce]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={title}
      closeButtonLabel={closeLabel}
      wide
      className="!max-w-[min(100vw-1rem,56rem)]"
    >
      <div className="flex min-h-[12rem] justify-center px-4 pb-6 pt-2 sm:px-6 sm:pb-8">
        {!src ? (
          <span className="self-center text-sm text-zinc-500">
            {loadingLabel}
          </span>
        ) : (
          <img
            src={src}
            alt=""
            className="max-h-[min(85dvh,48rem)] w-auto max-w-full object-contain"
          />
        )}
      </div>
    </Modal>
  );
}
