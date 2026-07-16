export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  // .env değeri yoksa: sadece geliştirmede localhost'a düş; production'da sessizce ezmek yerine hata ver.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL tanımlı değil. Canlı build için .env içinde gerçek API adresini verin."
    );
  }
  return "http://localhost:5177/api";
}
