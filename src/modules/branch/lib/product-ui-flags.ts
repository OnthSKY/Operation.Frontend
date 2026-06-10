/**
 * Ürün geçici bayrakları. Env yok — ihtiyaçta buradan aç/kapa.
 * Kayıt devri (OUT_PERSONNEL_POCKET_CLAIM_TRANSFER) şu an istenmiyorsa false bırakın.
 */
export const UI_POCKET_CLAIM_TRANSFER_ENABLED = false;

/**
 * Personel cebi (PERSONNEL_POCKET) — "personel kendi cebinden ödedi, kasa personele borçlu".
 * Karmaşık akış; yeni kayıt için gizli. Geçmiş kayıtlar (read path) etkilenmez:
 * eski satırlar listede / detayda / raporda görünmeye devam eder.
 */
export const UI_PERSONNEL_POCKET_ENABLED = false;
