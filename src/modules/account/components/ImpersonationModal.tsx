"use client";

import { fetchUsersList } from "@/modules/personnel/api/users-api";
import { useImpersonation } from "@/lib/auth/useImpersonation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Modal } from "@/shared/ui/Modal";
import type { UserListItem } from "@/types/user";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { useQuery } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * "Yerine geç" kullanıcı seçim modali.
 * Tek sorumluluk: kullanıcı arama + seçim + onay toast'ı + start çağrısı.
 * Sunucu çağrıları için `useImpersonation` hook'unu kullanır; cache/router
 * tarafını orada tek noktada tutar (DRY).
 */
export function ImpersonationModal({ open, onClose }: Props) {
  const titleId = useId();
  const { user } = useAuth();
  const { start, pending } = useImpersonation();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const usersQ = useQuery({
    queryKey: ["impersonation", "users"],
    queryFn: fetchUsersList,
    enabled: open,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const list = usersQ.data ?? [];
    const meId = user?.id;
    const q = query.trim().toLocaleLowerCase("tr");
    return list
      .filter((u) => u.id !== meId)
      .filter((u) =>
        !q
          ? true
          : `${u.username} ${u.fullName ?? ""}`.toLocaleLowerCase("tr").includes(q)
      )
      .slice(0, 100);
  }, [usersQ.data, query, user?.id]);

  const handleSelect = (target: UserListItem) => {
    setError(null);
    notifyConfirmToast({
      toastId: `impersonation-confirm-${target.id}`,
      tone: "warning",
      title: "Yerine geçmek istediğine emin misin?",
      message: (
        <>
          <span className="font-semibold">
            {target.fullName?.trim() || target.username}
          </span>{" "}
          adına oturum açacaksın. Yaptığın tüm işlemler audit log'a yöneticinin
          (sen) adıyla işlenir.
        </>
      ),
      cancelLabel: "Vazgeç",
      confirmLabel: "Yerine Geç",
      onConfirm: async () => {
        try {
          await start(target.id);
          onClose();
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Yerine geçilemedi.");
        }
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title="Kullanıcı yerine geç"
      description="Seçtiğin kullanıcının arayüzünü onun yetkileriyle görürsün. İstediğin an üstteki şeritten yöneticiye dönebilirsin."
      narrow
      closeButtonLabel="Kapat"
    >
      <div className="flex min-h-0 flex-col gap-3">
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kullanıcı adı veya isim ara"
            autoFocus
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}

        <div
          role="listbox"
          aria-label="Kullanıcılar"
          className="max-h-[55vh] min-h-[12rem] overflow-y-auto rounded-xl border border-zinc-200/80 bg-zinc-50/40"
        >
          {usersQ.isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">Yükleniyor…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              {query ? "Eşleşen kullanıcı yok." : "Listelenecek kullanıcı yok."}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200/70">
              {filtered.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  disabled={pending}
                  onSelect={() => handleSelect(u)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function UserRow({
  user,
  disabled,
  onSelect,
}: {
  user: UserListItem;
  disabled: boolean;
  onSelect: () => void;
}) {
  const label = user.fullName?.trim() || user.username;
  const initials = label
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  const isDisabled =
    disabled ||
    (!!user.status && user.status.toUpperCase() !== "ACTIVE");

  return (
    <li>
      <button
        type="button"
        disabled={isDisabled}
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-indigo-50/60 active:bg-indigo-100/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[12px] font-semibold text-indigo-700">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-900">
            {label}
          </span>
          <span className="block truncate text-xs text-zinc-500">
            @{user.username}
            {user.status && user.status.toUpperCase() !== "ACTIVE" ? (
              <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
                {user.status}
              </span>
            ) : null}
          </span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className="text-zinc-400"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </li>
  );
}
