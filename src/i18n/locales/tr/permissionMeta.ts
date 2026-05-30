/** İzin matrisi grupları ve ekran / rota ipuçları (Türkçe). */
export const permissionMeta = {
  groupTitle_system: "Sistem",
  groupTitle_operations: "Operasyon (geniş)",
  groupTitle_warehouse: "Depo ve şoför",
  groupTitle_ui: "Arayüz — menü / modüller",
  groupTitle_branch: "Şube verisi ve işlemler",
  groupTitle_personnel: "Personel verisi ve özlük",
  groupTitle_shipment: "Sevkiyat (şoför)",
  groupTitle_other: "Diğer",

  prefixHint_system: "Yönetim, kullanıcı hesapları ve bu yetki matrisi ayarı.",
  prefixHint_operations:
    "Çapraz operasyonel API erişimi (çoğu ekranda UI izinleriyle birlikte kullanılır).",
  prefixHint_warehouse: "Depo ekranları, stok hareketleri, transferler, özetler.",
  prefixHint_ui: "Sol menüde modülün görünüp görünmeyeceği ve ilgili ana rotalar.",
  prefixHint_branch: "Şube kasası, gelir/gider, şube stok hareketleri ve API kuralları.",
  prefixHint_personnel: "Personel kartları, listeler, bordro ile ilgili görüntüleme ve yazma.",
  prefixHint_shipment: "Atanan sevkiyat satırları ve tamamlama akışları.",
  prefixHint_other: "Sınıflandırılmamış izin; kod ve sunucu açıklamasına bakın.",

  screen_system_admin: "Kullanıcılar ve yönetim: /admin/users, /admin/settings/authorization",
  screen_operations_staff:
    "Geniş personel API erişimi (şube, personel, depo yazımları — birçok ekranın arkası)",
  screen_warehouse_driver: "Şoför akışları: sevkiyat ve depo okuma yolları",

  screen_ui_dashboard: "Menü: Özet — /",
  screen_ui_reports: "Menü: Raporlar (stok, kasa özeti, şube karşılaştırması, patron akışı) — /reports",
  screen_ui_reports_financial: "Menü: Finans analiz hubı — /reports/financial ve ilgili API",
  screen_ui_daily_branch_register: "Menü: Günlük şube kasası / register görünümleri",
  screen_ui_branch_day_clerk:
    "Menü: Şube gün sonu kasiyeri — atanan şubeler, yalnız bugünkü kasa + delegeli avans",
  screen_ui_personnel: "Menü: Personel — /personnel",
  screen_ui_my_advances: "Menü: Avanslarım / cep (self-servis)",
  screen_ui_branches: "Menü: Şubeler — /branches",
  screen_ui_general_overhead: "Menü: Genel gider — /general-overhead",
  screen_ui_insurances: "Menü: Sigortalar — /insurance-track (veya ilgili)",
  screen_ui_warehouse: "Menü: Depolar — /warehouse",
  screen_ui_products: "Menü: Ürünler — /products",
  screen_ui_suppliers: "Menü: Tedarikçiler — /suppliers",
  screen_ui_vehicles: "Menü: Araçlar — /vehicles",
  screen_ui_import: "Menü: Veri içe aktarma (kurulumda açıksa)",

  screen_branch_transactions_today_only: "Şube kasası: bu kullanıcı için işlemler yalnızca «bugün» ile sınırlı",
  screen_branch_operations_write: "Şube kasası: gelir/gider/nakit satırları ekleme ve değiştirme",
  screen_branch_stock_write: "Şube: şube üzerinden stok ve transfer işlemleri",
  screen_branch_all_data_view: "Şube detayı: mali / özlük / stokun tam görünümü",
  screen_branch_delete_or_reverse: "Şube: kayıt silme, ters çevirme veya yeniden açma",
  screen_branch_cross_branch_view: "Şubeler: birden fazla şubeyi listeleme; yokluğu = yalnız atanmış şube",
  screen_branch_financials_view: "Şube özetleri: kasa / gelir / gider toplamlarını görme",

  screen_advances_delegated_branch:
    "Avans: kapsamda hedef personelleri listeleme ve kasadan avans oluşturma (gün sonu kasiyeri)",

  screen_personnel_self_financials_view: "Personel: kendi avans / cep özetleri",
  screen_personnel_branch_summary_view: "Personel: şubedeki personel listesi ve özet",
  screen_personnel_branch_all_data_view: "Personel: şubedeki kişilerin ayrıntılı özlük/mali verisi",
  screen_personnel_all_data_view: "Personel: tüm şirket personel ayrıntıları",
  screen_personnel_write: "Personel: kart oluşturma ve güncelleme",
  screen_personnel_payroll_write: "Personel: bordro parametreleri ve ödemeler",

  screen_warehouse_movement_write: "Depo: giriş/çıkış hareketi kaydetme",
  screen_warehouse_delete_or_reverse: "Depo: hareket kaydını silme veya ters çevirme (yazma'dan ayrı)",
  screen_warehouse_transfer_write: "Depo: şubeye transfer kayıtları",
  screen_warehouse_all_data_view: "Depo: maliyet ve hareket ayrıntısının tamamı",
  screen_warehouse_inbound_view: "Depo: giriş (IN) hareket görünümleri",
  screen_warehouse_outbound_view: "Depo: çıkış (OUT) hareket görünümleri",
  screen_warehouse_aggregates_view: "Depo: toplamlar, eldeki stok ızgarası, özetler",
  screen_warehouse_cross_user_view: "Depo: başkalarının kayıtlarını görme; yokluğu = yalnız kendi kayıtları (şoför)",

  screen_shipment_own_view: "Sevkiyat: bu kullanıcıya atananları görme",
  screen_shipment_own_write: "Sevkiyat: atanan satırları tamamlama",
  screen_shipment_start: "Sevkiyat: akışı başlatma (taslağı onaya gönderme)",

  // Risk 2 — master data write kodları
  screen_branch_master_write: "Şubeler: şube kartı oluşturma / güncelleme / silme",
  screen_products_write: "Ürünler: ürün, kategori, maliyet geçmişi oluşturma / güncelleme / silme",
  screen_suppliers_write: "Tedarikçiler: tedarikçi kartı, fatura, ödeme, fotoğraf yazma",
  screen_vehicles_write: "Araçlar: araç, sigorta, gider, bakım yazma",
  screen_advances_write: "Personel avansı: oluşturma / güncelleme / silme (delegated path ayrı)",
  screen_outbound_invoices_write: "Satış faturası: oluşturma, posta, makbuz, müşteri hesabı",
  screen_insurances_write: "Sigorta takibi: şube + araç sigortası yazma",

  desc_system_admin:
    "Kullanıcı hesapları, roller ve yetkilendirme matrisi gibi yönetim ekranlarına erişim; ayrıca bu ayarları değiştirme.",
  desc_admin_users_permission_overrides:
    "Kullanıcılar sayfasında tek bir giriş hesabı için izin satırlarını (ekstra izin ver / özellikle engelle) düzenleme.",
  desc_admin_users_data_scopes:
    "Kullanıcılar sayfasında şube, depo ve personel veri kapsamlarını (hangi kayıtları görebileceğini) düzenleme.",
  desc_operations_staff:
    "Şube, personel, depo ve raporlar gibi birçok operasyonel API ve yazma işlemi için geniş personel erişimi.",
  desc_warehouse_driver: "Depo okuma ve şube sevkiyat akışları için şoför rolüne özgü uçlar.",
  desc_ui_dashboard: "Özet paneli ve operasyonel hatırlatmaların görünmesi; ana sayfa rotasına giriş.",
  desc_ui_reports:
    "Stok, kasa özeti, şube karşılaştırması ve patron akışı gibi operasyonel rapor rotalarına menüden erişim (finans KPI hubı hariç).",
  desc_ui_reports_financial:
    "Gelir/gider KPI, trend, tablolar ve finans özeti dışa aktarımı: `/reports/financial` ve buna bağlı API uçları.",
  desc_ui_daily_branch_register: "Günlük şube kasası / defter görünümlerinin menüde açılması.",
  desc_ui_branch_day_clerk:
    "Atanan şubeler için sınırlı şube çalışma alanı: yalnız bugünkü kasa satırları ve delegeli avans; tam «Şubeler» modülü değildir.",
  desc_ui_personnel: "Personel kayıtları ve bordroya ilişkin arayüz modülünün görünmesi.",
  desc_ui_my_advances: "Avanslarım ve cep özeti gibi self-servis ekranların menüde yer alması.",
  desc_ui_branches: "Şube kartları, kasa ve şube stok işlemleri için şubeler modülünün menüde görünmesi.",
  desc_ui_general_overhead: "Merkezi genel gider havuzları ve dağıtımlarının yönetim ekranına erişim.",
  desc_ui_insurances: "Araç ve şube sigorta takip ekranlarının menüden açılması.",
  desc_ui_warehouse: "Depolar, stok hareketleri ve transferler için depo modülünün menüde görünmesi.",
  desc_ui_products: "Ürün ve kategori yönetimi ekranlarının menüden erişilebilir olması.",
  desc_ui_suppliers: "Tedarikçi ve fatura ile ilgili ekranların menüden açılması.",
  desc_ui_vehicles: "Filo, bakım ve araç gideri takibinin menüden erişilebilir olması.",
  desc_ui_import: "Kurulumda açıksa toplu veri içe aktarma aracının menüde görünmesi.",
  desc_branch_transactions_today_only:
    "Bu kullanıcı için şube kasası işlemlerinin yalnızca içinde bulunulan günle sınırlanması (geçmişe müdahale engeli).",
  desc_branch_operations_write: "Şube kasasında gelir, gider ve nakit satırlarının eklenmesi ve güncellenmesi.",
  desc_branch_stock_write: "Şube üzerinden stok ve depoya transfer gibi stok hareketlerinin yapılması.",
  desc_branch_all_data_view:
    "Şube detayında mali, özlük ve stok verilerinin tam ayrıntı düzeyinde görüntülenmesi.",
  desc_branch_delete_or_reverse: "Şube kayıtlarının silinmesi, ters çevrilmesi veya yeniden açılması.",
  desc_branch_cross_branch_view:
    "Birden fazla şubeyi listeleme ve şube ekranlarında çapraz görüntüleme; yokluğu kullanıcıyı yalnızca atanmış kendi şubesine sınırlar (PERSONNEL davranışı).",
  desc_branch_financials_view:
    "Şube özet ekranlarında kasa, gelir ve gider toplamlarını görme; yokluğu finansal tutarları gizler (HideFinancialTotals).",
  desc_advances_delegated_branch:
    "Şube için «Avans hedefi» kapsamındaki personelleri listelemek ve onlara kasadan avans girmek; personel avans geçmişinde yalnızca bu kullanıcının oluşturduğu satırlar.",
  desc_personnel_self_financials_view: "Kullanıcının kendi avans ve kendisine yazılan gider özetlerini görmesi.",
  desc_personnel_branch_summary_view: "Bir şubedeki personel listesi ve özet bilgilerin görüntülenmesi.",
  desc_personnel_branch_all_data_view:
    "Şubedeki personel için ayrıntılı özlük ve mali verilerin (tam kapsam) görüntülenmesi.",
  desc_personnel_all_data_view: "Şirket genelinde tüm personel ayrıntılı kayıtlarına erişim.",
  desc_personnel_write: "Personel kartlarının oluşturulması ve güncellenmesi.",
  desc_personnel_payroll_write: "Bordro parametreleri ve ödeme kayıtları üzerinde yazma işlemleri.",
  desc_warehouse_movement_write:
    "Depoda mal girişi ve çıkışı için hareket kayıtlarının oluşturulması ve güncellenmesi (IN/OUT hareketleri).",
  desc_warehouse_delete_or_reverse:
    "Depo hareket ve sevkiyat kayıtlarını silme veya ters çevirme; yazma'dan ayrı tutulur (DRIVER kayıt yazar ama silemez — fraud surface azaltma).",
  desc_warehouse_transfer_write: "Depodan şubelere stok transferi kayıtlarının oluşturulması ve yönetilmesi.",
  desc_warehouse_all_data_view: "Depo maliyeti ve tüm hareket ayrıntılarının tam düzeyde görüntülenmesi.",
  desc_warehouse_inbound_view: "Depo giriş (IN) hareketlerinin listelenmesi ve ilgili görünümlere erişim.",
  desc_warehouse_outbound_view: "Depo çıkış (OUT) hareketlerinin listelenmesi ve ilgili görünümlere erişim.",
  desc_warehouse_aggregates_view:
    "Hareket toplamları, eldeki stok ızgarası ve özetler gibi birleşik depo özet verilerinin görüntülenmesi.",
  desc_warehouse_cross_user_view:
    "Başka kullanıcıların oluşturduğu depo hareket ve transfer kayıtlarını görme; yokluğu kullanıcıyı yalnızca kendi oluşturduğu kayıtlara sınırlar (DRIVER davranışı).",
  desc_shipment_own_view: "Bu kullanıcıya atanmış sevkiyat satırlarının görüntülenmesi.",
  desc_shipment_own_write: "Atanan sevkiyat satırlarının tamamlanması ve imzalanması akışı.",
  desc_shipment_start:
    "Taslak sevkiyatı onay akışına başlatma yetkisi verir (şube sorumlusu/usta için).",

  // Risk 2 — master data write kodları
  desc_branch_master_write:
    "Şube kartını oluşturma, güncelleme ve silme. Şube içi operasyonel yazmadan (kasa/gelir/gider) ayrı tutulur.",
  desc_products_write:
    "Ürünler, kategoriler ve ürün maliyet geçmişi kayıtlarının oluşturulması, güncellenmesi ve silinmesi.",
  desc_suppliers_write:
    "Tedarikçi kartları, tedarikçi faturaları/ödemeleri ve fatura fotoğraflarının yazılması. Fatura akışlarının depoya cascade'i sistem-internal method'lar üzerinden yapılır (ek izin gerekmez).",
  desc_vehicles_write:
    "Araç kartları + ilişkili sigorta, gider ve bakım kayıtlarının yazılması.",
  desc_advances_write:
    "Personel avansının doğrudan yazılması (delegated branch path ayrı kod kullanır).",
  desc_outbound_invoices_write:
    "Satış faturalarının oluşturulması ve postlanması, makbuz yönetimi, sevkiyat bağlantısı, müşteri hesabı yazımı.",
  desc_insurances_write:
    "Şube ve araç sigortası takip kayıtlarının yazılması (poliçe, tarihler, tutarlar).",

  roleVsUserMatrixIntro:
    "Bu sayfa her rol için varsayılan izin paketini tanımlar. O role sahip her kullanıcının çıkış noktası burasıdır.",
  roleVsUserOverrideIntro:
    "Kullanıcılar → İzin geçersiz kılma’da yalnızca tek bir giriş hesabını değiştirirsiniz: ALLOW, rolünden bağımsız ek izin verir; DENY, rolde olsa bile o izni kapatır. Boş / INHERIT «burada rol matrisini kullan» demektir. Veri kapsamları (şube / depo / personel) ayrı düzenlenir; hangi kayıtları göreceğini sınırlar.",
} as const;
