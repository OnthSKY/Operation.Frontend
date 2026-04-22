# Mobile Entry/Kayit Alanlari Fazlandirma Plani

Bu dokuman, uygulamadaki giris/kayit alanlarini mobilde daha okunur, daha hizli ve daha az hata uretecek hale getirmek icin fazli bir uygulama plani sunar.

## Kapsam

- `src/app/layout.tsx` ve uygulama genelindeki shell/navigation davranisi
- Form ekranlari (kayit, duzenleme, filtre, modal/drawer icerikleri)
- Liste ve tablo ekranlari (rapor, stok, operasyon, personel)
- Dashboard hikaye/kart yapilari
- Mobil etkileşim standartlari (touch target, spacing, sticky action, bilgi hiyerarsisi)

## Hedef KPI'lar

- Mobilde yatay scroll ihtiyacini kritik ekranlarda `%90+` azaltmak
- Form tamamlama suresini `%20+` kisaltmak
- Form terk oranini `%15+` azaltmak
- Yanlis veri girisi kaynakli validasyon hatalarini `%25+` azaltmak

### KPI olcum cercevesi

- **Baseline tarihi:** Faz 0 baslangicinda alinacak (T0)
- **Olcum periyodu:** Faz sonu + canliya alimdan sonraki ilk 2 hafta
- **Veri kaynagi:**
  - Session replay / product analytics (mobil viewport, terk orani, sure)
  - API ve frontend hata loglari (validasyon hatalari)
  - QA regression checklist sonucu (yatay tasma kontrolu)
- **Owner:**
  - KPI takibi: Frontend lead + QA lead
  - KPI raporlama: Sprint review'da tek sayfa ozet

---

## Faz 0 - Envanter ve Tasarim Kurallari (1-2 gun)

### Ne yapilacak?

- Tum giris/kayit ekranlari icin mobil denetim listesi cikacak.
- Ortak mobil UI kurallari tek bir yerde tanimlanacak.
- "Yatay kaydirma gerekli mi?" karar matrisi olusturulacak.

### Nerede yapilacak?

- Yeni dokuman: `src/docs/mobile-ui-guidelines.md`
- Ortak component audit: `src/modules/**/components/*`
- Layout kontrolu: `src/app/layout.tsx`

### Cikti

- Hangi ekranin hangi problemi oldugu netlesmis bir backlog
- Uygulanabilir tasarim kurallari (spacing, typografi, breakpoint, action alanlari)

### Faz 0 - Definition of Done

- Kritik mobil ekran envanteri tamamlandi (ekran + sorun tipi + etki seviyesi)
- `mobile-ui-guidelines.md` ilk surumu yayinlandi
- KPI baseline olcumleri T0 icin kayda alindi

---

## Faz 1 - Uygulama Iskeleti ve Navigation (2-3 gun)

### Ne yapilacak?

- Mobil viewport'ta ana govde bosluklari ve max-width stratejisi standardize edilecek.
- Ust navigasyon/tab bolgelerinde dokunma alani (min 44px) zorunlu hale getirilecek.
- Sayfa icinde kaydirilabilir bolgelerde modern scroll ipucu standardi tek tipe indirgenecek.

### Nerede yapilacak?

- `src/app/layout.tsx`
- Ortak layout/scaffold bilesenleri:
  - `src/modules/dashboard/components/PageScreenScaffold*` (varsa)
  - `src/modules/**/components/*Scaffold*` (varsa)

### Teknik not

- Mobilde once "tek kolon + tam genislik kartlar"
- Tablet ve ustunde kademeli grid
- Sticky bolgelerde ust uste binme (z-index) denetimi

### Faz 1 - Definition of Done

- Ust tab/navigation alanlarinda min touch target 44px dogrulandi
- Sticky alanlarin cakismazlik testi yapildi (modal/drawer/toolbar)
- En az 3 farkli cihaz genisliginde yatay tasma smoke testi gecti

---

## Faz 2 - Giris/Kayit Formlari (3-5 gun)

### Ne yapilacak?

- Uzun formlar bolumlere ayrilacak (Temel Bilgi, Evrak, Finans, Notlar gibi).
- Her bolumde progressive disclosure kullanilacak (once kritik alanlar, sonra detay).
- Mobilde form aksiyonlari altta sticky action bar ile sabitlenecek (Kaydet / Iptal).
- Dosya/fotograf alanlarinda "mevcut dosya + yeni secim" yapisi standartlastirilacak.

### Nerede yapilacak?

- Personel kayit/duzenleme:
  - `src/modules/personnel/components/PersonnelFormModal.tsx`
  - `src/modules/personnel/components/PersonnelScreen.tsx`
- Acil kayit akisi:
  - `src/app/emergency-admin-register/page.tsx`
- Ortak form primitive'leri:
  - `src/components/ui/*` veya projedeki form bilesen klasoru

### UX standartlari

- Input label + helper text hiyerarsisi net
- Hata mesaji alanin hemen altinda
- Klavye acildiginda aksiyon butonlari erisilebilir
- Tek elle kullanim icin ana aksiyonlar alt bolgede

### Faz 2 - Definition of Done

- Oncelikli formlarda sticky action bar davranisi standarda alindi
- Form hata mesaji ve helper text konumlari tutarli hale geldi
- Mobil klavye acikken ana aksiyonlara erisim testi gecti

---

## Faz 3 - Liste, Rapor ve Kart Bilgi Hiyerarsisi (3-4 gun)

### Ne yapilacak?

- Mobilde tablo yerine "ozet kart + acilir detay" modeli varsayilan olacak.
- Kartlarda max 3 ana metrik, detaylar acilir alana tasinacak.
- Urun/birim bilgisinin tum kritik akislarda zorunlu gorunurlugu saglanacak.
- "Cok metin" yerine ikon + kisa etiket + ikinci satir baglam duzeni uygulanacak.
- Gelir/Gider liste alanlarinda filtre UX'i ikiye ayrilacak:
  - **Detay filtreler:** Drawer ile acilan kapsamli filtreler (tarih, kategori, odeme tipi vb.)
  - **Hizli filtreler:** Bugun / Tum tarihler / Yenile gibi tek dokunus aksiyonlari
- Filtre panelinde aktif filtrelerin ozeti (chip/etiket) zorunlu olacak; kullanici "hangi filtre aktif" bilgisini drawer acmadan gorecek.
- Filtre grubunun yalnizca altindaki tablo/listeyi etkiledigi acik metinle belirtilecek.

### Nerede yapilacak?

- Sube detay gelir/gider/personel akislarinda mobil filtre ve liste hiyerarsisi:
  - `src/modules/branch/components/BranchDetailTabs.tsx`
  - `src/modules/branch/components/BranchDetailIncomeTab.tsx`
  - `src/modules/branch/components/BranchDetailExpensesTab.tsx`
  - `src/modules/branch/components/BranchDetailPersonnelTab.tsx`
- Stok raporu:
  - `src/modules/reports/components/ReportStockStory.tsx`
  - `src/modules/reports/components/ReportsDetailTables.tsx`
- Dashboard kartlari:
  - `src/modules/dashboard/components/DashboardDayStoryCard.tsx`
  - `src/modules/dashboard/components/DashboardCumulativeStorySection.tsx`
  - `src/modules/dashboard/components/DashboardOperationsTab.tsx`
- Rapor ozet alanlari:
  - `src/modules/reports/components/ReportCashPatronHighlights.tsx`

### Teknik not

- `MobileCard`, `MobileKv`, `ReportInteractiveRows` gibi bilesenler "tek kaynak" olacak.
- Ayni bilgi farkli formatta tekrar edilmeyecek; birincil/ikincil bilgi net ayrilacak.
- Filtre paneli semantigi standartlastirilacak:
  - "Filtreler" (detay) ve "Hizli filtreler" (quick actions) ayni grupta karistirilmamali
  - Aktif filtre sayisi + aktif filtre etiketleri mobilde her zaman gorunur olmali

### Filtreler ve Hizli Filtreler - Onerilen UX standardi

- **Detay filtreler (drawer)**
  - Alanlar: Tarih araligi, ana kategori, odeme/settlement tipi, serbest arama (ekran ihtiyacina gore)
  - Aksiyonlar: "Uygula", "Sifirla", "Kapat"
  - Durum gostergesi: Filtre butonunda aktif filtre noktasi/rozeti
  - Geri bildirim: Drawer kapaninca liste ustunde aktif filtre chip'leri gorunur
- **Hizli filtreler (tek dokunus)**
  - Minimum set: `Bugun`, `Tum tarihler`, `Yenile`
  - Davranis: Hemen uygulanir, ek onay istemez
  - Konum: Detay filtre panelinden ayri bir "Hizli islemler" grubu
- **Aktif filtre gorunurlugu**
  - Liste basliginin altinda aktif filtre ozeti zorunlu
  - Tarih filtresi tek chip'te "Baslangic - Bitis" olarak gosterilir
  - Kategori/odeme tipi ayri chip'lerde gosterilir
  - Chip silme (x) aksiyonu varsa, tek filtreyi kaldirip listeyi aninda gunceller
- **Kapsam acikligi**
  - Filtre panelinde "Bu filtreler yalnizca asagidaki listeyi etkiler" metni bulunur
  - Ustteki ozet kartlar ile alttaki liste filtre kapsam farki net ifade edilir

### Faz 3 - Definition of Done

- Gelir/Gider filtre alanlarinda "detay filtreler" ve "hizli filtreler" ayrimi net
- Aktif filtre ozeti chip/etiket olarak drawer disinda gorunur
- Mobil liste ekranlarinda birincil metrikler ilk bakista okunur

---

## Faz 4 - Performans, Erisilebilirlik ve Stabilizasyon (2-3 gun)

### Ne yapilacak?

- Mobil performans ince ayari (render maliyeti, gereksiz re-render, uzun listede optimizasyon).
- Erisilebilirlik kontrolleri (focus sirasi, aria-label, kontrast, touch target).
- En kritik ekranlar icin smoke test + responsive regression checklist uygulanacak.

### Nerede yapilacak?

- Genel frontend:
  - `src/modules/**`
  - `src/app/**`
- i18n metin kontrolleri:
  - `src/i18n/locales/tr/*`
  - `src/i18n/locales/en/*`

### Basari kriteri

- Mobilde kritik akislarda yatay tasma yok
- CLS/LCP gozle gorulur sekilde iyilesmis
- Form submit basarisizlik orani dusmus

### Faz 4 - Definition of Done

- Kritik mobil akislar icin regression checklist %100 tamamlandi
- A11y temel kontrolleri (focus/label/kontrast/touch target) gecti
- Performans takip metrikleri (LCP/CLS + liste render sureleri) hedefe yaklasti

---

## Is Dagilimi (Rol Bazli)

- **UI/UX:** Bilgi hiyerarsisi, kart/form wireframe, durum varyantlari
- **Frontend:** Component refactor, responsive davranis, reusable primitive'ler
- **Backend (gerektiginde):** Mobilde gerekli ozet alanlar icin endpoint iyilestirmeleri
- **QA:** Cihaz matrisi ile manuel test + kritik akislarda regression

## Oncelik Sirasi (Kisa)

1. `layout` ve navigation standardizasyonu
2. En cok kullanilan kayit formlari (personel + acil kayit)
3. Stok/rapor kartlarinin mobil ozet yapisi
4. Erisilebilirlik + performans sertlestirme

## Yayin Stratejisi ve Risk Yonetimi

- Buyuk degisiklikler tek seferde degil, modul bazli ve kademeli yayinlanacak.
- Gerekli alanlarda feature flag veya kontrollu acilis (kullanici grubu/scope) tercih edilecek.
- Her faz sonunda:
  - 1 demo
  - 1 UX geri bildirim turu
  - 1 teknik risk go/no-go kontrolu
- Rollback plani:
  - UI regressions durumunda onceki stabil varyanta donulebilecek sekilde degisiklikler kucuk PR'lara bolunecek.

## Notlar

- Bu plan, mevcut gelistirmelerle uyumludur; sirf gorunus degil, veri okunabilirligi ve hata azaltma odaklidir.
- Her faz sonunda 1 demo + 1 kisa geri bildirim dongusu yapilmasi onerilir.
