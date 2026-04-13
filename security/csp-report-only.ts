/**
 * Content-Security-Policy-Report-Only (aşama 1).
 * İhlalleri konsol / reporting endpoint’e düşürür; uygulamayı bloklamaz.
 * Sonraki adım: ihlalleri azaltıp aynı metni Content-Security-Policy olarak uygulamak.
 */

const defaultApiUrl = "http://localhost:5177/api";

function publicApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = raw && raw.length > 0 ? raw.replace(/\/$/, "") : defaultApiUrl.replace(/\/$/, "");
  try {
    return new URL(base).origin;
  } catch {
    return new URL(defaultApiUrl).origin;
  }
}

/** Yalnızca production build yanıtları için (dev’de HMR / eval gürültüsü olmaması adına). */
export function buildContentSecurityPolicyReportOnly(): string {
  const apiOrigin = publicApiOrigin();
  const directives: string[] = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
    // Next.js üretim paketi: çoğu kurulumda inline script parçaları gerekir.
    "script-src 'self' 'unsafe-inline'",
    // Tailwind / styled-jsx benzeri inline stil yoksa ileride 'unsafe-inline' kaldırılabilir.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${apiOrigin}`,
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin}`,
  ];
  return directives.join("; ");
}
