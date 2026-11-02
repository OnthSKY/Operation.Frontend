/**
 * PDF indir akışında hangi kalıcı yan etkilerin çalışacağına karar veren TEK nokta.
 * Bilgi amaçlı modda (şube ürün özeti) checkbox değerleri ne olursa olsun fatura,
 * sistem kaydı ve finansal sayfaya yönlendirme kapalıdır.
 *
 * Bağımlılıksız tutulur → `node resolve-persist-actions.check.mjs` ile doğrulanır.
 */
export function resolveOasPersistActions(p: {
  informationalOnly: boolean;
  saveAsInvoice: boolean;
  saveToSystem: boolean;
}): { createInvoice: boolean; saveToSystem: boolean } {
  if (p.informationalOnly) return { createInvoice: false, saveToSystem: false };
  return { createInvoice: p.saveAsInvoice, saveToSystem: p.saveToSystem };
}
