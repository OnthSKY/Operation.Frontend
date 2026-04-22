"use client";

import type { ReactNode } from "react";

type MobileListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  loading?: boolean;
  empty?: ReactNode;
  className?: string;
};

export function MobileList<T>({
  items,
  renderItem,
  loading = false,
  empty = null,
  className,
}: MobileListProps<T>) {
  if (loading) {
    return (
      <div className={className}>
        <p className="text-sm text-zinc-500">Yukleniyor...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return <div className={className}>{empty}</div>;
  }

  return (
    <div className={className}>
      <div className="space-y-2">{items.map((item, index) => renderItem(item, index))}</div>
    </div>
  );
}
