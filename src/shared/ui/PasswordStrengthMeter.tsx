"use client";

import { useMemo } from "react";

/**
 * Modern password strength gösterici — backend `PasswordPolicy` regex'iyle 1:1 eşleşir.
 *
 * Kurallar (hepsi geçilmeli):
 *   ✓ Min 8 karakter (max 200)
 *   ✓ En az 1 büyük harf (Türkçe Ç/Ğ/İ/Ö/Ş/Ü dahil)
 *   ✓ En az 1 küçük harf
 *   ✓ En az 1 rakam
 *
 * Skor barı bonus ölçüt sayar (özel karakter, uzunluk) — kullanıcıya daha
 * güçlü şifre üretmeye teşvik için. Submit kararı için `allRequiredMet`
 * boolean'ını dışarı veriyoruz.
 */

export type PasswordStrengthResult = {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  allRequiredMet: boolean;
  checks: {
    minLength: boolean;
    upper: boolean;
    lower: boolean;
    digit: boolean;
  };
};

const MIN_LENGTH = 8;
const MAX_LENGTH = 200;

export function evaluatePassword(password: string): PasswordStrengthResult {
  const len = password.length;
  // Unicode-aware Türkçe büyük/küçük harf desteği — backend ile aynı (\p{Lu}, \p{Ll})
  const upper = /\p{Lu}/u.test(password);
  const lower = /\p{Ll}/u.test(password);
  const digit = /\d/.test(password);
  const minLength = len >= MIN_LENGTH && len <= MAX_LENGTH;

  const requiredCount = [minLength, upper, lower, digit].filter(Boolean).length;
  const allRequiredMet = requiredCount === 4;

  // Bonus puanlar — kullanıcıyı daha güçlü şifreye teşvik
  const special = /[^A-Za-z0-9\p{L}]/u.test(password);
  const long = len >= 12;

  let score = requiredCount; // 0-4
  if (allRequiredMet && (special || long)) score = 5;

  return {
    score: score as PasswordStrengthResult["score"],
    allRequiredMet,
    checks: { minLength, upper, lower, digit },
  };
}

type Props = {
  password: string;
  className?: string;
};

const STRENGTH_LABELS = ["Çok zayıf", "Çok zayıf", "Zayıf", "Orta", "Güçlü", "Çok güçlü"] as const;
const STRENGTH_COLORS = [
  "bg-zinc-200",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
] as const;

export function PasswordStrengthMeter({ password, className }: Props) {
  const result = useMemo(() => evaluatePassword(password), [password]);
  const empty = password.length === 0;

  return (
    <div className={`space-y-2 ${className ?? ""}`} aria-live="polite">
      {/* Bar grubu */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={result.score}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                empty
                  ? "bg-zinc-200"
                  : i <= result.score
                  ? STRENGTH_COLORS[result.score]
                  : "bg-zinc-200"
              }`}
            />
          ))}
        </div>
        {!empty ? (
          <span className={`text-xs font-medium tabular-nums ${
            result.score >= 4 ? "text-emerald-700" :
            result.score === 3 ? "text-amber-700" :
            "text-rose-700"
          }`}>
            {STRENGTH_LABELS[result.score]}
          </span>
        ) : null}
      </div>

      {/* Kural checklist'i — boş şifrede gri, geçtikçe yeşil */}
      <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        <Check ok={result.checks.minLength} empty={empty} label="En az 8 karakter" />
        <Check ok={result.checks.upper} empty={empty} label="Büyük harf (A-Z, Ç-Ü)" />
        <Check ok={result.checks.lower} empty={empty} label="Küçük harf (a-z)" />
        <Check ok={result.checks.digit} empty={empty} label="Rakam (0-9)" />
      </ul>
    </div>
  );
}

function Check({ ok, empty, label }: { ok: boolean; empty: boolean; label: string }) {
  const color = empty ? "text-zinc-400" : ok ? "text-emerald-700" : "text-zinc-500";
  const icon = empty ? "○" : ok ? "✓" : "○";
  return (
    <li className={`flex items-center gap-1.5 ${color}`}>
      <span aria-hidden="true" className="inline-block w-3 text-center font-semibold">
        {icon}
      </span>
      <span>{label}</span>
    </li>
  );
}
