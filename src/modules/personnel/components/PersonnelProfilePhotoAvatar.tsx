"use client";

import { cn } from "@/lib/cn";
import {
  personnelProfilePhotoUrl,
  type PersonnelProfilePhotoPaths,
} from "@/modules/personnel/api/personnel-api";
import { useEffect, useMemo, useState } from "react";

type Props = {
  personnelId: number;
  hasPhoto: boolean;
  /** API’den gelen göreli yollar; yoksa `/personnel/{id}/profile-photos/1` kullanılır. */
  profilePhotoPaths?: PersonnelProfilePhotoPaths | null;
  /** Önbelleği kırmak için (yüklemelerden sonra artırın). */
  nonce: number;
  displayName: string;
  className?: string;
  /** Erişilebilirlik için kısa açıklama */
  photoLabel: string;
  /** Fotoğraf varken tıklanınca (ör. büyük önizleme). */
  onPhotoClick?: () => void;
  /** `onPhotoClick` ile buton modunda `aria-label` */
  photoOpenLabel?: string;
  shape?: "circle" | "square";
};

export function PersonnelProfilePhotoAvatar({
  personnelId,
  hasPhoto,
  profilePhotoPaths,
  nonce,
  displayName,
  className,
  photoLabel,
  onPhotoClick,
  photoOpenLabel,
  shape = "circle",
}: Props) {
  const href = useMemo(
    () =>
      hasPhoto
        ? `${personnelProfilePhotoUrl(personnelId, 1, profilePhotoPaths)}?_=${nonce}`
        : null,
    [hasPhoto, personnelId, profilePhotoPaths, nonce]
  );
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [href]);

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  const rootClass = cn(
    "relative flex shrink-0 items-center justify-center overflow-hidden bg-zinc-200 text-lg font-semibold text-zinc-600",
    shape === "square" ? "rounded-xl" : "rounded-full",
    hasPhoto &&
      onPhotoClick &&
      "cursor-pointer border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900",
    className ?? "h-16 w-16"
  );

  const inner =
    href && !imageFailed ? (
      <img
        src={href}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    ) : (
      <span aria-hidden>{initial}</span>
    );

  if (hasPhoto && onPhotoClick) {
    return (
      <button
        type="button"
        className={rootClass}
        title={photoLabel}
        aria-label={photoOpenLabel ?? photoLabel}
        onClick={onPhotoClick}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={rootClass} title={photoLabel}>
      {inner}
    </div>
  );
}
