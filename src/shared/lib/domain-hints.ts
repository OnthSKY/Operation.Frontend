/**
 * Domain term sözlüğü — InfoHint için kısa, kullanıcı-dilinde açıklamalar.
 * Backend kodlarıyla 1:1: kod sabitleri burada KEY olarak kullanılır.
 *
 * Ekleme kuralı:
 *   - 1-2 cümle, teknik jargon yok
 *   - "Ne işe yarar + örnek" formatı
 *   - Kullanıcı seçim yaparken neyi seçeceğini anlayabilmeli
 */

export type DomainHintKey =
  | "cashSettlementParty"
  | "cashSettlementPatron"
  | "cashSettlementBranchManager"
  | "cashSettlementRemainsAtBranch"
  | "expensePaymentSource"
  | "expensePaymentRegister"
  | "expensePaymentPatron"
  | "expensePaymentPersonnelPocket"
  | "expensePaymentPersonnelHeldRegisterCash"
  | "expensePaymentUnset"
  | "invoicePaymentStatus"
  | "registerDayClose"
  | "patronDebtRepay"
  | "personnelPocketRepay"
  | "personnelHeldRegisterCash"
  | "bundledExpense";

const HINTS: Record<DomainHintKey, string> = {
  cashSettlementParty:
    "Bu gelirin nakit kısmı kime devredildi? Patron alır, şube müdürü/personel alır ya da şubede kalır.",
  cashSettlementPatron:
    "Nakit, iş sahibine (patrona) devredildi. Patron kasaya borçlanır (kasa = patrondan alacaklı).",
  cashSettlementBranchManager:
    "Nakit, şube müdürü veya bir personele teslim edildi — onun cebinde tutulur.",
  cashSettlementRemainsAtBranch:
    "Nakit fiziksel olarak şubede kaldı; kimseye devredilmedi.",

  expensePaymentSource:
    "Bu gider hangi kaynaktan ödendi? Kasa, patron, personel cebi vs. farklı muhasebe etkileri olur.",
  expensePaymentRegister:
    "Doğrudan şube kasasından ödendi.",
  expensePaymentPatron:
    "Patron kendi cebinden / banka hesabından ödedi. Kasa etkilenmez.",
  expensePaymentPersonnelPocket:
    "Bir personel kendi cebinden ödedi; sonra ona iade edilecek.",
  expensePaymentPersonnelHeldRegisterCash:
    "Personelin elinde tuttuğu (önceden kasadan alınmış) nakitle ödendi.",
  expensePaymentUnset:
    "Henüz ödeme kaynağı belirlenmedi — fatura ödenmemiş olarak işaretli.",

  invoicePaymentStatus:
    "Fatura ödendi mi? Ödenmemiş faturalar açık borç olarak listelenir.",

  registerDayClose:
    "Günün sonunda kasayı kapatır. Bundan sonra o güne yeni gider/gelir yazılamaz. Bundled gider'ler aynı anda yazılabilir.",

  patronDebtRepay:
    "Kasadan patrona geri ödeme — eski bir gün sonunda patrona devredilen nakdin iadesi.",

  personnelPocketRepay:
    "Personelin cebinden ödediği gideri kasadan ona iade etmek.",

  personnelHeldRegisterCash:
    "Personelin elinde tuttuğu kasa nakdi — banka yatırmadan önce vs.",

  bundledExpense:
    "Gün sonu ile birlikte yazılan gider. Gün sonu silinirse bu gider de otomatik silinir.",
};

export function domainHint(key: DomainHintKey): string {
  return HINTS[key];
}
