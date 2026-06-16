"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";

function Slide({ title, points }: { title: string; points: string[] }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700 sm:text-[0.95rem]">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

export default function SalesDeckPage() {
  const { locale } = useI18n();
  const isTr = locale === "tr";

  const labels = isTr
    ? {
        title: "POC Satış Sunumu",
        lead: "20-30 dakikalık müşteri görüşmesi için kısa sunum akışı.",
        backGuide: "Nasıl kullanırım sayfasına dön",
        ctaTitle: "Toplantı Sonu Karar Seti",
        cta: [
          "Pilot şube sayısı",
          "POC süresi (4-6 hafta)",
          "Başarı kriterlerinin onayı",
          "Müşteri tarafı sorumlu kişiler",
        ],
      }
    : {
        title: "POC Sales Deck",
        lead: "Compact flow for a 20-30 minute customer meeting.",
        backGuide: "Back to How to use page",
        ctaTitle: "Meeting Exit Decisions",
        cta: [
          "Pilot branch count",
          "POC duration (4-6 weeks)",
          "Success criteria sign-off",
          "Customer-side owners",
        ],
      };

  const slides = isTr
    ? [
        {
          title: "1) Problem",
          points: [
            "Kasa, stok, personel ve tedarik verileri farklı araçlarda dağınık.",
            "Gün sonu doğruluk düşük, merkez görünürlüğü zayıf.",
            "Yönetim kararları gecikmeli ve manuel raporla alınıyor.",
          ],
        },
        {
          title: "2) Çözüm",
          points: [
            "Şube, depo, personel ve rapor verisini tek platformda topluyoruz.",
            "Operasyon akışını finansal görünürlükle eşliyoruz.",
            "Yetki ve audit ile kontrol edilebilir bir yapı kuruyoruz.",
          ],
        },
        {
          title: "3) POC Kapsamı",
          points: [
            "Şube gelir/gider kaydı",
            "Depo giriş/çıkış ve şubeye transfer",
            "Personel avans/maaş temel akışı",
            "Finans + stok + nakit raporları",
          ],
        },
        {
          title: "4) Üretim-Hazır Altyapı",
          points: [
            "🔁 Idempotency-key — yavaş ağda buton iki kere tıklansa bile aynı kayıt iki kere yazılmaz (backend her POST'a UUID anahtarla dedupe yapar).",
            "🔐 JWT kesintisiz key rotation + hesap bazlı brute-force kilidi (5 deneme → 15 dk).",
            "🛡️ CSRF (double-submit) + güvenlik başlıkları (CSP, HSTS, COOP/CORP) + dosya yüklemede magic-number doğrulaması.",
            "⏱️ Per-user + per-IP rate limit; auto-retry exponential backoff (yavaş ağda otomatik düzelir).",
            "📋 KVKK uyumlu audit log — kullanıcı, rol, oturum, fatura, gider değişimi kim/ne zaman izlenebilir.",
            "🌐 344 hata mesajı Türkçe/İngilizce; backend Accept-Language ile cevap döner.",
          ],
        },
        {
          title: "5) Operatör Deneyimi",
          points: [
            "📱 Mobil-öncelikli UI — kart düzeni telefonda, tablo masaüstünde; sahadaki müdür ve kasiyer için ayrı tasarım.",
            "🎯 En basit kontroller — tek tıkla onayla, sil, düzenle; modal yerine yerinde aksiyon menüsü.",
            "⚡ Gün sonu + bundled gider atomik tek istek; hata olursa hiç yazılmaz.",
            "🧠 Akıllı default'lar + son kullanılan ★ — günde 20-50 gider girişi 3-4 tıklama tasarrufu.",
            "↩️ 5sn'lik “Geri Al” penceresi — yanlış silmeyi kurtarır (kasa, fatura, müteahhit dahil 8 alanda).",
            "🚀 Optimistic UI — silme anında ekrandan düşer, sunucu paralelde yazar (algılanan hız 10×).",
            "🌐 Yavaş bağlantı algılaması + “Yenileniyor…” göstergesi; saha kullanıcısı bekleme bilinçli yapar.",
            "💾 “Kaydet ve devam et” — modal kapatmadan ardarda 10 gider gir.",
          ],
        },
        {
          title: "5b) Para Akışı Şeffaflığı",
          points: [
            "💵 Her nakit hareketi izlenebilir: kasa → patron → personel cebi → banka → fatura zinciri uçtan uca takip edilir.",
            "🔗 source_transaction_id ile bağlanmış zincir: gün sonu silinince bağlı gider'leri görür ve onayla cascade silersin.",
            "👁️ Patron borcu/alacağı, personel cebi bakiyesi her şubede ve toplu olarak canlı görünür.",
            "📊 Dashboard'ta tüm şubelerin günlük net'i + patron-personel devirleri tek ekranda.",
            "🛡️ Cep iadesi, kasa devri, OUT_PATRON_DEBT_REPAY — Türkiye gerçeğine özel 60+ muhasebe sınıflandırması.",
            "🧾 Tedarikçi açık fatura listesi + tahsilat akışı = bekleyen para her zaman görünür.",
            "📜 Her finansal işlem değişiminde audit kaydı — “Kim 14:32'de hangi gideri sildi?” saniyeler içinde.",
          ],
        },
        {
          title: "5c) Hibrit Şube Modeli",
          points: [
            "🏠 Öz şube — tam operasyon: gelir, gider, gün sonu, personel kaydı, sevkiyat.",
            "🤝 Ortak şube — öz gibi çalışır + ortak adı + kar payı yüzdesi kayıt altındadır (rapor için).",
            "📦 Franchise — sadece sevkiyat + cari fatura + tahsilat akışı; günlük operasyon yazılamaz.",
            "✅ 3 model bir sistemde — Tekin Usta tipi karma zincirler için tek platform yeterli.",
            "🔐 Sistem-level gating: franchise şubeye yanlışlıkla gider yazılması imkansız (backend 400 döner).",
            "💱 Tip değiştirme: şube rozetine tek tıkla — geçmiş kayıtlar etkilenmez, sadece yeni işlemler kısıtlanır.",
          ],
        },
        {
          title: "6) Kullanım Senaryoları",
          points: [
            "🧑‍💼 İşletme Sahibi — sabah dashboard'ta tüm şubelerin günlük net'ini, kasada-cep nakdini ve uyarıları tek ekranda görür.",
            "👔 Şube Müdürü — gün sonu modal'ından nakit, kart ve birlikte yazılan giderleri tek hamlede kaydeder.",
            "📊 Mali Müşavir — ay sonunda finansal özet + tedarikçi cari + maaş özeti tek tıkla Excel'e indirilir.",
            "🚚 Şoför — kendi sevkiyatlarını mobil ekrandan onay ister, durum güncellemesi yapar.",
          ],
        },
        {
          title: "7) Yetenek Matrisi — Finans & Personel",
          points: [
            "🏪 Şube: gelir/gider, gün sonu (atomik + bundled gider), kasa devri akışı, rol bazlı yetki.",
            "🧾 Tedarikçi: fatura kaydı, branş paylaştırma, kısmi tahsilat, maliyet geçmişi, fatura fotoğrafı.",
            "💼 Personel: avans/maaş/prim, sigorta dönemi, yıl kapanışı (PDF arşiv + SHA256 imza), sistem hesabı.",
            "🛠️ Müteahhit (dış çalışan): iş kaydı, ödeme (kasa/patron/cep), bakiye takibi.",
            "🏢 Genel gider havuzu: çok-şubeli ortak giderleri tek havuzdan şubelere paylaştır.",
            "📄 Müşteri faturası (outbound): satış faturası kesme, cari hesap dökümü, ödeme alımı.",
            "💰 Avans / cep iadesi / patron borcu: ileri seviye nakit akış modeli.",
          ],
        },
        {
          title: "7b) Yetenek Matrisi — Operasyon & Saha",
          points: [
            "📦 Depo & Stok: girdi/çıktı, ürün maliyeti, ürün-birim dönüşümü, çok-depo yapısı.",
            "🚚 Sevkiyat: depo→şube transferi, sürücü atama, durum izleme, teslim fişi PDF.",
            "🛒 Sipariş & Cari Hesap Dökümü: müşteri bazlı sipariş + akıllı fiyat hesaplama (kg/adet/total).",
            "🚗 Araç filosu: bakım, sigorta, dokümanlar, gider takibi, plaka eşleştirme.",
            "📋 Sigorta takibi: personel + araç sigorta bitiş tarihi uyarıları.",
            "📁 Doküman yönetimi: şube/personel/şirket dosyaları, PDF/görsel ön-izleme.",
            "🔔 Operasyonel hatırlatmalar: günlük görev listesi + sigorta + ödeme zamanı uyarıları.",
          ],
        },
        {
          title: "7c) Yetenek Matrisi — Yetkilendirme & Analiz",
          points: [
            "🔐 Çoklu rol: bir kullanıcıya birden çok rol atanabilir (örn. STAFF + DRIVER); roller toplanır, en geniş yetkiye ulaşır.",
            "🎛️ Çoklu permission: her rolün kendine özel permission seti; sistem 70+ ayrık permission kodu (PERS_READ, BRANCH_TX_WRITE, vb.) ile granular kontrol.",
            "👤 Kişi bazlı ALLOW/DENY override: rolün verdiği yetki yetmediğinde belirli bir kullanıcıya tek tıkla ek permission açılır veya kapatılır.",
            "🎯 Scope (kapsam) yetkisi: belirli şubelere, depolara veya personellere kısıtlı erişim — “Datça müdürü sadece Datça şubelerini görsün”.",
            "📊 Raporlar: finansal özet/lifetime/şube karşılaştırma/personel bakiye/araç gideri/branş aylık.",
            "🎯 Dashboard: tüm şubelerin günlük/aylık/lifetime net'i tek ekranda.",
            "🌐 Çoklu dil (TR/EN), çoklu döviz, çoklu şube, çoklu depo.",
            "🔍 Global arama (Ctrl+K) + 🌐 public showroom + 🛡️ KVKK uyumlu audit log.",
          ],
        },
        {
          title: "8) Beklenen ROI",
          points: [
            "⏱️ Gün sonu süresi 25 dk → 5 dk (atomik bundled gider girişi).",
            "💰 Kasa farkı kayıpları azalır — patron-personel devri ve cep akışı sistemde net.",
            "📈 Fatura tahsilat döngüsü kısalır — açık fatura listesi ve hatırlatma görünür.",
            "🧾 Mali müşavire data hazırlama 4 saatten 5 dakikaya iner (CSV ihraç + audit hazır).",
            "🔍 Anlaşmazlıkta “kim ne zaman ne yaptı” saniyeler içinde audit'tan görülür.",
          ],
        },
        {
          title: "9) Veri Sahipliği",
          points: [
            "Verin senindir — istediğin an Excel/CSV olarak indirilebilir.",
            "PostgreSQL veritabanı; tedarikçi-kilitli (vendor lock-in) yok.",
            "Günlük otomatik yedekleme + manuel snapshot.",
            "KVKK uyumlu denetim izi (kim sildi, ne zaman değişti — backend'de 344 işlem türünde audit aktif).",
            "Soft-delete + 5sn'lik geri-alma penceresi — kazara silme kurtarılır.",
          ],
        },
        {
          title: "10) Pilot Modeli",
          points: [
            "1 şube ile başla — 4-6 haftalık ücretsiz pilot.",
            "Kurulum + temel veri tohumlama bizden — siz sadece günlük kullanın.",
            "Haftalık 30 dk sync — sorun/iyileştirme + roadmap konuşması.",
            "Pilot sonunda PASS/NO-PASS karar: net başarı kriterleri (slayt 11).",
            "Memnun değilseniz — data export + sıfır maliyet çıkış.",
          ],
        },
        {
          title: "11) Mimari & Güvenilirlik",
          points: [
            "🐘 PostgreSQL — endüstri standardı, vendor lock-in yok, istediğiniz an dump alınır.",
            "🐳 Docker konteyner — tek komutla şirket-içi sunucuya da kurulabilir, bulutta da çalışır.",
            "🛠️ ASP.NET Core 8 + Dapper — performans + olgun ekosistem; Stack Overflow + GitHub'da binlerce çözüm.",
            "💾 Günlük otomatik PostgreSQL backup + manuel snapshot; restore drilling test edilmiş.",
            "📊 Yapısal log + uyarılar — şüpheli aktivite (örn. 5x yanlış login) anında loglanır.",
            "🔄 Sıfır-downtime deploy hedefi — JWT key rotation desteği bu mimari kararın parçası.",
          ],
        },
        {
          title: "12) Roadmap (3-6 Ay)",
          points: [
            "🌍 Multi-tenant izolasyon — tek kurulumdan birden çok müşteri yönetimi (B2B SaaS için altyapı hazır).",
            "📱 PWA + ofline outbox — şubede internet kesilse bile gider yazılır, ağ gelince senkronize olur.",
            "🏦 Banka entegrasyonu — POS/ekstre eşleştirme, otomatik kasa karşılaştırması.",
            "🧾 e-Fatura / e-Arşiv entegrasyonu (GİB) — tedarikçi/müşteri faturaları otomatik aktarım.",
            "🤖 Akıllı uyarılar — kasa farkı, ödeme gecikme, sigorta bitişi proaktif bildirim.",
            "📈 Custom report builder — kullanıcı kendi raporunu sürükle-bırak ile üretir.",
          ],
        },
        {
          title: "13) Karşılaştırma",
          points: [
            "📊 Excel/manual takibe karşı: gerçek-zamanlı + audit'li + rol kademeli + mobil-erişimli.",
            "💼 Klasik muhasebe yazılımına (Logo/Mikro) karşı: operasyon + finans birlikte; ayrı sistemler kurmaya gerek yok.",
            "☁️ Yabancı SaaS'lara karşı: Türkçe, KVKK-uyumlu, Türkiye nakit akış modeli (patron borcu/cep) yerleşik.",
            "💵 Fiyat avantajı: kişi-bazlı değil — tüm şubeler için tek fiyat; büyüdükçe maliyet artmaz.",
            "🛡️ Tedarikçi-kilitsiz: PostgreSQL dump al, istediğin sunucuda kullan; sözleşmen bitince data senindir.",
            "🚀 Hız: 4-6 haftalık pilot ile canlı; ay'lar süren ERP kurulumlarının aksine.",
          ],
        },
        {
          title: "14) Başarı Kriterleri",
          points: [
            "Yönetici günlük net durumu tek ekranda görebilir.",
            "Depodan şubeye hareket uçtan uca izlenebilir.",
            "En az 3 ana rapor canlı veriyle çalışır.",
            "Rol bazlı yetki farkı net gösterilir.",
            "Saha kullanıcı yavaş bağlantıda da kesintisiz çalışır.",
          ],
        },
      ]
    : [
        {
          title: "1) Problem",
          points: [
            "Cash, stock, personnel, and procurement data are fragmented.",
            "Day-end confidence is low and HQ visibility is limited.",
            "Management decisions depend on delayed manual reporting.",
          ],
        },
        {
          title: "2) Solution",
          points: [
            "Unify branch, warehouse, personnel, and reporting in one platform.",
            "Connect operational execution to financial visibility.",
            "Add role-based control and auditable workflows.",
          ],
        },
        {
          title: "3) POC Scope",
          points: [
            "Branch income/expense posting",
            "Warehouse in/out and branch transfer",
            "Core personnel advance/salary flow",
            "Finance + stock + cash reports",
          ],
        },
        {
          title: "4) Production-Ready Infrastructure",
          points: [
            "🔁 Idempotency-key — even if the button is double-tapped on slow networks, the same record is never written twice (backend dedupes every POST by UUID).",
            "🔐 JWT seamless key rotation + per-account brute-force lockout (5 attempts → 15 min).",
            "🛡️ CSRF (double-submit) + security headers (CSP, HSTS, COOP/CORP) + file upload magic-number validation.",
            "⏱️ Per-user + per-IP rate limiting; auto-retry with exponential backoff (auto-heals on slow networks).",
            "📋 KVKK-compliant audit log — user, role, session, invoice, expense changes — full who/when traceability.",
            "🌐 344 error messages localized TR/EN; backend negotiates via Accept-Language.",
          ],
        },
        {
          title: "5) Operator Experience",
          points: [
            "📱 Mobile-first UI — card layout on phones, table on desktop; tailored for field managers and cashiers.",
            "🎯 Minimal controls — one-tap approve/delete/edit; inline action menus instead of nested modals.",
            "⚡ Day-close + bundled expenses in a single atomic request; nothing is written on failure.",
            "🧠 Smart defaults + recently-used ★ — 3-4 click savings per entry on a daily 20-50 expense workload.",
            "↩️ 5-second undo window — recovers accidental deletes (cash, invoice, contractor, etc. — 8 surfaces).",
            "🚀 Optimistic UI — row disappears instantly, server syncs in background (perceived speed 10×).",
            "🌐 Slow-connection detection + “Refreshing…” indicator; field users wait with confidence.",
            "💾 “Save and continue” — submit and stay on the modal to enter 10 expenses in a row.",
          ],
        },
        {
          title: "5b) Money Flow Transparency",
          points: [
            "💵 Every cash movement is traceable: register → owner → personnel pocket → bank → invoice — full chain.",
            "🔗 Linked by source_transaction_id: delete a day-close and the bundled expenses cascade with a confirmation.",
            "👁️ Owner debts/credits and personnel pocket balances visible per-branch and consolidated, live.",
            "📊 Dashboard shows every branch's daily net + owner/personnel handover totals on one screen.",
            "🛡️ Pocket repayment, cash handover, OUT_PATRON_DEBT_REPAY — 60+ accounting classifications built for the Turkish reality.",
            "🧾 Supplier open invoice list + receipt flow — pending money is always visible.",
            "📜 Every financial change has an audit record — \"Who deleted which expense at 14:32?\" answered in seconds.",
          ],
        },
        {
          title: "5c) Hybrid Branch Model",
          points: [
            "🏠 Owned — full operations: income, expense, day-close, personnel, shipments.",
            "🤝 Joint venture — works like owned + partner name + share percent recorded (for reporting).",
            "📦 Franchise — only shipments + outbound invoice + receipt flow; no daily operations.",
            "✅ All 3 models in one system — perfect for chains like Tekin Usta with mixed types.",
            "🔐 System-level gating: writing an expense to a franchise branch is impossible (backend 400).",
            "💱 Type change: one-tap on the branch badge — historical records untouched, only new transactions restricted.",
          ],
        },
        {
          title: "6) Personas & Daily Use",
          points: [
            "🧑‍💼 Owner — sees all branches' daily net, cash-in-pocket, and alerts on a single dashboard each morning.",
            "👔 Branch Manager — closes the day with cash, card, and bundled expenses in one atomic submission.",
            "📊 Accountant — exports monthly financial summary, supplier ledger, and payroll summary to Excel with one click.",
            "🚚 Driver — confirms shipments and posts status updates from mobile.",
          ],
        },
        {
          title: "7) Capability Matrix — Finance & People",
          points: [
            "🏪 Branch: income/expense, day-close (atomic + bundled), cash handover flow, role-based access.",
            "🧾 Supplier: invoice posting, branch allocation, partial receipts, cost history, invoice photo.",
            "💼 Personnel: advance/salary/bonus, insurance period, year-end closure (PDF archive + SHA256), system account.",
            "🛠️ Contractor: work entries, payments (register/patron/pocket), balance tracking.",
            "🏢 General overhead pool: shared expenses split across branches from a single pool.",
            "📄 Outbound invoice: customer billing, account statement, receipt collection.",
            "💰 Advance / pocket repayment / owner-debt: advanced cash-flow accounting model.",
          ],
        },
        {
          title: "7b) Capability Matrix — Ops & Field",
          points: [
            "📦 Warehouse & Stock: in/out, product costing, unit conversion, multi-warehouse.",
            "🚚 Shipment: warehouse→branch transfer, driver assignment, status tracking, delivery PDF.",
            "🛒 Order & Account Statement: customer orders + smart price calc (kg/qty/total).",
            "🚗 Vehicle fleet: maintenance, insurance, documents, expense tracking, plate matching.",
            "📋 Insurance tracking: personnel + vehicle insurance expiry alerts.",
            "📁 Document management: branch/personnel/company files, PDF/image preview.",
            "🔔 Operational reminders: daily tasks + insurance + payment due alerts.",
          ],
        },
        {
          title: "7c) Capability Matrix — Permissions & Analytics",
          points: [
            "🔐 Multi-role: a user can be assigned multiple roles (e.g. STAFF + DRIVER); roles union, widest access wins.",
            "🎛️ Multi-permission: each role has its own permission set; 70+ atomic permission codes (PERS_READ, BRANCH_TX_WRITE, etc.) for granular control.",
            "👤 Per-user ALLOW/DENY override: when a role's permissions aren't enough, grant or revoke a specific permission for one user with a click.",
            "🎯 Scoped access: restrict to specific branches/warehouses/personnel — e.g. \"Datça manager sees only Datça branches\".",
            "📊 Reports: financial summary/lifetime/branch compare/personnel balance/vehicle expense/branch monthly.",
            "🎯 Dashboard: all branches' daily/monthly/lifetime net on one screen.",
            "🌐 Multi-language (TR/EN), multi-currency, multi-branch, multi-warehouse.",
            "🔍 Global search (Ctrl+K) + 🌐 public showroom + 🛡️ KVKK-compliant audit log.",
          ],
        },
        {
          title: "8) Expected ROI",
          points: [
            "⏱️ Day-close 25 min → 5 min (atomic bundled expense entry).",
            "💰 Cash discrepancies decrease — owner/personnel cash flow visible end-to-end.",
            "📈 Invoice collection cycle shortens — open invoice list and reminders surfaced.",
            "🧾 Accountant prep drops from 4 hours to 5 minutes (CSV export + ready audit).",
            "🔍 Dispute resolution in seconds: full audit trail of who did what.",
          ],
        },
        {
          title: "9) Data Ownership",
          points: [
            "Your data is yours — exportable as Excel/CSV anytime.",
            "PostgreSQL database; no vendor lock-in.",
            "Daily automated backups + manual snapshots.",
            "KVKK-compliant audit trail (344 operation types tracked in backend).",
            "Soft-delete + 5-second undo — accidental deletes recoverable.",
          ],
        },
        {
          title: "10) Pilot Model",
          points: [
            "Start with 1 branch — 4-6 week free pilot.",
            "Setup + seed data done by us — you focus on daily use.",
            "Weekly 30-min sync — issues/improvements + roadmap.",
            "End of pilot: clear PASS/NO-PASS criteria (slide 11).",
            "Not satisfied? Data export + zero-cost exit.",
          ],
        },
        {
          title: "11) Architecture & Reliability",
          points: [
            "🐘 PostgreSQL — industry standard, no vendor lock-in, dump anytime.",
            "🐳 Docker — one-command on-prem deploy, also cloud-ready.",
            "🛠️ ASP.NET Core 8 + Dapper — performance + mature ecosystem; thousands of solutions on Stack Overflow + GitHub.",
            "💾 Daily automated PostgreSQL backups + manual snapshots; restore drills tested.",
            "📊 Structured logs + alerts — suspicious activity (e.g. 5 failed logins) logged immediately.",
            "🔄 Zero-downtime deploy target — JWT key rotation is part of this architectural decision.",
          ],
        },
        {
          title: "12) Roadmap (3-6 Months)",
          points: [
            "🌍 Multi-tenant isolation — manage multiple customers from a single install (B2B SaaS infrastructure ready).",
            "📱 PWA + offline outbox — branches can record expenses without network; syncs when back online.",
            "🏦 Bank integration — POS/statement reconciliation, automated register comparison.",
            "🧾 e-Invoice / e-Archive integration (Turkey GİB) — supplier/customer invoices auto-imported.",
            "🤖 Smart alerts — cash variance, payment delay, insurance expiry proactive notifications.",
            "📈 Custom report builder — drag-and-drop user-defined reports.",
          ],
        },
        {
          title: "13) Comparison",
          points: [
            "📊 vs Excel/manual: real-time + audited + role-tiered + mobile-accessible.",
            "💼 vs classic accounting (Logo/Mikro): operations + finance together; no parallel systems.",
            "☁️ vs foreign SaaS: Turkish, KVKK-compliant, Turkish cash-flow model (owner debt / pocket) built-in.",
            "💵 Pricing advantage: not per-user — flat per all branches; cost doesn't scale with team size.",
            "🛡️ Vendor-free: PostgreSQL dump, run on any server; your data is yours after contract.",
            "🚀 Speed: live in 4-6 week pilot vs months-long traditional ERP rollouts.",
          ],
        },
        {
          title: "14) Success Criteria",
          points: [
            "Management can view daily net in one screen.",
            "Warehouse-to-branch movement is fully traceable.",
            "At least 3 key reports run on live data.",
            "Role differences are clearly demonstrated.",
            "Field users keep working uninterrupted on slow connections.",
          ],
        },
      ];

  return (
    <div className="w-full min-w-0 space-y-5 px-4 pb-24 pt-4 sm:space-y-6 sm:px-6 sm:pb-10 sm:pt-6 md:py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {labels.title}
        </h1>
        <p className="text-sm text-zinc-600 sm:text-base">{labels.lead}</p>
        <Link
          href="/guide"
          className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          {labels.backGuide}
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {slides.map((slide) => (
          <Slide key={slide.title} title={slide.title} points={slide.points} />
        ))}
      </div>

      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:p-5">
        <h2 className="text-base font-bold text-violet-950 sm:text-lg">{labels.ctaTitle}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-violet-900 sm:text-[0.95rem]">
          {labels.cta.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
