/** Türkiye cep: ulusal 10 hane (5XXXXXXXXX), API saklama +905XXXXXXXXX */

const NATIONAL_LEN = 10;

export function nationalMobileDigitsFromStored(
  stored: string | null | undefined
): string {
  if (stored == null || String(stored).trim() === "") return "";
  let d = String(stored).replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, NATIONAL_LEN);
}

export function formatPersonnelPhoneDisplay(nationalDigits: string): string {
  const d = nationalDigits.replace(/\D/g, "").slice(0, NATIONAL_LEN);
  if (!d) return "+90 ";
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 8);
  const e = d.slice(8, 10);
  let s = `+90 ${a}`;
  if (b) s += ` ${b}`;
  if (c) s += ` ${c}`;
  if (e) s += ` ${e}`;
  return s;
}

export function isCompleteTurkishMobileNational(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  return d.length === NATIONAL_LEN && d[0] === "5";
}

export function toPersonnelPhoneE164(nationalDigits: string): string {
  const d = nationalDigits.replace(/\D/g, "").slice(0, NATIONAL_LEN);
  return `+90${d}`;
}
