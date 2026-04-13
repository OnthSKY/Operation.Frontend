export const guide = {
  pageTitle: "Nasıl kullanırım?",
  pageLead:
    "Önce “Misyon” sekmesinden uygulamanın para ve stok takibindeki rolünü okuyun; ardından modül sekmelerinden ayrıntıya inin. Menüdeki (i) simgeleri kısa özet verir.",
  tabsAria: "Kılavuz — modül sekmeleri",
  whatsNewTitle: "Yeni ve güncellenenler",
  tocShort: {
    mission: "Misyon",
    nav: "Menü",
    dashboard: "Özet",
    flows: "Akışlar",
    reports: "Raporlar",
    personnel: "Personel",
    branch: "Şube",
    warehouse: "Depo",
    suppliers: "Tedarikçi",
    vehicles: "Araçlar",
    products: "Ürünler",
    admin: "Kullanıcılar",
    tips: "İpuçları",
    portal: "Hesabım",
  },
  roleNote:
    "Sol menüde gördüğünüz öğeler hesabınızın yetkisine göre değişir. Personel hesabında yalnızca size açık menüler listelenir.",
  mission: {
    title: "Misyon: patron parasını, kazancı ve stoğu tek çatı altında görmek",
    whatsNew: "",
    p1:
      "Uygulamanın özü: patrondan sisteme ne kadar nakit girdiği, şubelerde ne kadar ciro ve gider oluştuğu, paranın hangi kategorilerde toplandığı ve merkez depodan şubelere stok hareketinin nereye ve ne zaman yoğunlaştığı izlenebilir olsun.",
    p2:
      "Patron → kasa hattı: “Şube yönetimi”nde işlenen patrondan kasaya giriş, borç/cep geri ödemeleri ve günlük gelir–gider fişleri operasyonel gerçeği oluşturur. Bu kayıtlar doğrudan günlük özet ve finansal raporların ham verisidir.",
    p3:
      "“Ne kadar kazanıldı?” sorusu: şube gelir satırları ve dönemsel finansal rapor (gelir–gider kırılımı) ile yanıtlanır. “Hangi kategoride çok para var?” için finansal rapordaki gider/gelir grupları ve şube işlemlerinde seçilen kategoriler birlikte okunmalıdır.",
    p4:
      "Stok ve sevkiyat: “Depo”da giriş–çıkış ve şubeye transfer hareketleri tutulur; “Raporlar” altındaki stok ve şube stok raporları hangi şubede tüketimin arttığını ve depo sevkiyat eğilimini gösterir. Ürün kartı ve kategoriler stok ile raporları anlamlı gruplamak için kullanılır. Şirket araçları (menüde «Araçlar») filo, atama, sigorta ve işletme giderlerini ayrı izler; şube kasası veya finansal raporlarla otomatik bağlı değildir.",
    p5:
      "Personel tarafı: avans ve avans dışı giderler “Personel maliyetleri”nde birleşir; patronun personele aktardığı nakit ile şube giderleri ilişkilendirildiğinde bütünsel maliyet görünür.",
    p6:
      "Önerilen akış: gün içinde şube fişlerini anında girin → akşam genel bakışta günü doğrulayın → haftalık/aylık kategori ve nakit pozisyonunu raporlardan kontrol edin → stokta ani çıkışları depo hareketleri ve stok raporu ile doğrulayın. Menüdeki (i) simgeleri her modülün bu misyondaki yerini özetler.",
  },
  nav: {
    title: "Menü, arama ve hesap",
    whatsNew:
      "Zil simgesi: operasyon hatırlatmaları (ör. gün sonu ve muhasebeye Z raporu). Sağ üstteki hesap menüsü: profil bilgileri, kimlik doğrulayıcı ile iki adımlı giriş (TOTP) ve hesap aktiviteniz. Telefonda alt gezinme çubuğu ve daraltılabilir filtreler hızlı kullanım içindir.",
    p1: "Sol taraftaki menüden tüm modüllere gidersiniz. Mobilde önce üst çubuktaki “Menüyü aç” simgesine dokunun.",
    p2: "Üst çubuktaki arama kutusu (veya kısayol) ile sayfa ve sık kullanılan işlemlere hızlıca gidebilirsiniz.",
    p3: "Sağ üstte dil seçimi (TR / EN) ve oturumunuzu kapatmak için “Çıkış” düğmesi (menünün altında) bulunur.",
  },
  flows: {
    title: "Önerilen akışlar ve ortak terimler",
    whatsNew: "",
    p1:
      "Günlük: işlemleri şubede anında girin (gelir, kasadan gider, gerekirse patron/cep ile ödenen giderler). Akşam genel bakışta bugünkü toplamları doğrulayın.",
    p2:
      "Haftalık / aylık: Raporlar → Finans’ta dönemi seçin; özet kartları seçili para birimi içindir. «Önceki döneme göre» ve «Δ», bir önceki eşit uzunluktaki tarih penceresiyle karşılaştırmadır.",
    p3:
      "«Kasadan gider»: giderin ödeme kaynağı şube kasası (REGISTER) olduğunda; patronun veya personel cebinden ödenenler bu kaleme dahil değildir — şube detayında ayrı netler görünür.",
    p4:
      "«Kasa sorumlusunda» nakit: gelir satırında işaretlenen, fiziksel olarak kasa sorumlusunda tutulan tutarlar; genel bakışta para birimi özeti ve personele göre detay olarak listelenir.",
    p5:
      "Stok: depo giriş/çıkış ve şubeye sevk kaydı girdikçe stok raporları dolmaya başlar; filtreyi daraltırsanız boş görünebilir.",
    p6:
      "Sorun çıkarsa: bağlantıyı kontrol edin, «Yenile» ile tekrar deneyin; mesaj metnini okuyun.",
    p7:
      "Maaş ve avans: önce ödeme veya avans kaydını oluşturun; şube ekranından personel gideri yazacaksanız bu kayda bağlayın (tutar ve para birimi aynı olmalı). Ödemesiz önce gider yazıp bağlantıyı atlama riskinden kaçının. Ayrıntılı kural özeti şirket wiki’sinde USER-FLOWS ve teknik belgede §7.1.",
    goHome: "Genel bakışa git",
    goBranch: "Şubelere git",
    goReports: "Raporlara git",
  },
  dashboard: {
    title: "Genel bakış (ana sayfa)",
    whatsNew:
      "Şube özetinde daha derli toplu metrik kartları ve filtreler; küçük ekranda filtreler daraltılabilir şeritte toplanabilir, tablo daha okunur kalır.",
    p1: "Günlük özet: gelir, gider ve net nakit kartlarını burada görürsünüz. Şubelerin günlük durumuna ait tablo bu ekrandadır.",
    p2: "Belirli bir şubeye odaklanmak için satırdan şube adına tıklayın veya menüden “Şube yönetimi”ne gidin.",
    go: "Genel bakışa git",
  },
  reports: {
    title: "Raporlar",
    whatsNew: "",
    p1: "Finansal dönem ve stok raporları bu bölümdedir. Tarih / dönem filtrelerini kullanarak listeyi daraltın.",
    p2: "Detay satırlarında şube, depo veya ürün bazlı incelemeye devam edebilirsiniz.",
    go: "Raporlara git",
  },
  personnel: {
    title: "Personel",
    whatsNew:
      "Personel ve avans akışları, cep / mahsuplaşma satırlarının geçtiği güncel şube para kurallarıyla uyumludur; ekranda seçici veya ipucu çıktığında onları kullanın.",
    p1: "“Personeller” listesinden çalışan ekleyebilir, düzenleyebilir veya detaylarını açabilirsiniz.",
    p2: "Personele tek tek avans kaydı açmak için personel satırındaki ilgili işlemi veya global aramadaki avans kısayolunu kullanın.",
    p3: "“Personel maliyetleri” ekranı avansları ve personel giderlerini (avans dışı) birlikte listeler; sekmelerle daraltabilirsiniz.",
    goList: "Personel listesine git",
    goAdvances: "Personel maliyetlerine git",
  },
  branch: {
    title: "Şube yönetimi",
    whatsNew:
      "Yeni ve netleştirilen kasa türleri: patron kasaya giriş, patron borç geri ödeme, cep geri ödeme, cep mahsuplaşma satırları ve operasyon giderinde kargo alt türü. Bazı kayıtlarda şube / bağlı personel seçimi iyileştirildi; formlar zorunlu alanları ve gerektiğinde fiş yüklemesini vurgular.",
    p1: "Şube listesinden bir şube seçin; detayda günlük işlemler, sezon / dönem bilgileri ve şubeye özel sekmeler açılır.",
    p2: "Yeni şube işlemi (kasaya giriş-çıkış, gider, gün sonu vb.) ilgili şubenin ekranındaki formlar üzerinden kaydedilir.",
    p3: "Belge veya fiş gerektiren kayıtlarda ekrandaki görsel yükleme alanlarını doldurmanız istenebilir.",
    go: "Şube yönetimine git",
  },
  warehouse: {
    title: "Depo",
    whatsNew:
      "Stok ve hareket görünümleri daha sade; depo detayındaki sekmelerle özetten hareket geçmişine geçin.",
    p1: "Depo listesinden depo seçerek stok özeti, hareketler ve depo içi operasyon sekmelerine ulaşırsınız.",
    p2: "Giriş / çıkış hareketleri ve şubeye transfer gibi işlemler depo detayındaki ilgili bölümlerden yapılır.",
    go: "Depoya git",
  },
  suppliers: {
    title: "Tedarikçiler ve merkez alım faturası",
    whatsNew:
      "Fatura satırını şubelere bölme: depoya bağlı olmayan satırlarda «Şubelere böl» ile payları kaydedip şube gideri oluşturabilirsiniz (patron kaynaklı; şube kasasından düşmez).",
    p1:
      "Menüden «Tedarikçiler»e gidin: tedarikçi kartı, alım faturaları ve tedarikçiye yapılan ödemeleri burada tutarsınız. Bu ekran şirketin tedarikçiye borcunu (açık bakiye) ve ödeme anını izlemek içindir.",
    p2:
      "Yeni fatura: tedarikçiyi seçin, satırları girin. Stok girişiyle eşlemek için satıra depo GİRİŞ hareket numarasını yazabilirsiniz; bu satırlar stok tarafıyla bağlıdır ve şubelere bölünmez.",
    p3:
      "Depo hareketi olmayan satır (ör. muhasebe, genel gider): fatura listesinde «Detay» açın, satırda «Şubelere böl»e dokunun. İsterseniz «Tüm şubelere eşit böl» ile tutarı otomatik paylaştırın veya şube ve tutar satırlarını elle girin.",
    p4:
      "«Payları kaydet» taslak payları saklar. Payların toplamı satır tutarına eşit olmalıdır (ekranda yeşil/uyarı ile görünür). Ardından gider tarihi ve gider sınıfını seçip «Şube giderlerini oluştur» deyin; her şubede patron kaynaklı gider satırı oluşur — kasa bakiyesi değişmez, şube kâr–zarar raporlarına yansır.",
    p5:
      "Tedarikçi ödemesi: açık bakiyesi olan faturada «Öde» ile ödeme kaydı açın (kasa / banka / patron). Ödeme, fatura modülündedir; şube gideri bölüştürme ise ayrı adımdır.",
    go: "Tedarikçilere git",
  },
  vehicles: {
    title: "Şirket araçları",
    whatsNew:
      "Liste ve detay herkes için okunur; araç ekleme, atama değişikliği, sigorta ve gider kayıtları ile aylık özet operasyon yetkisi (personel) gerektirir.",
    p1:
      "Menüden «Araçlar»a gidin. Tabloda plaka, marka/model, durum (aktif / pasif / bakımda), güncel atama ve sigorta rozeti görünür: poliçe yok, tamam, yakında yenileme (yaklaşan bitiş) veya süresi dolmuş.",
    p2:
      "Bir aracı ya tek bir personele ya da tek bir şubeye atayabilirsiniz; ikisi birden seçilemez. Atamasız (boşta) da bırakılabilir. Atama her değiştiğinde geçmiş «Atama geçmişi» sekmesine kaydedilir.",
    p3:
      "Detayda sigorta poliçelerini (ör. trafik, kasko) ve giderleri (yakıt, bakım, sigorta ödemesi, onarım vb.) ekleyip düzenleyebilirsiniz. Giderler bu modülün içindedir; şube işlem fişi veya tedarikçi faturası değildir.",
    p4:
      "«Aylık özet» sekmesinde yıl, ay, araç ve şubeye göre toplamları görürsünüz. Şube filtresi, aracın o anki şube atamasına göredir; geçmiş ay başka şubedeyken oluşan giderler bu filtreye takılmayabilir.",
    go: "Araçlara git",
  },
  products: {
    title: "Ürünler",
    whatsNew: "",
    p1: "Ürün kataloğunu görüntüleyin; ürün ekleyin veya düzenleyin. Ürün detayında hareket geçmişi sekmesiyle hareketleri izleyebilirsiniz.",
    go: "Ürünlere git",
  },
  admin: {
    title: "Sistem — kullanıcılar (yöneticiler)",
    whatsNew: "",
    p1: "Yalnızca yönetici rolündeki hesaplar bu menüyü görür. Sistem kullanıcılarını buradan yönetirsiniz.",
    go: "Kullanıcılar ekranına git",
  },
  portal: {
    title: "Personel hesabı ile kullanım",
    whatsNew:
      "Yetkiniz olan yerlerde tam kullanıcılarla aynı kısayollar: hatırlatma zili (görünüyorsa), mobil alt çubuk ve hesabınız için açıldıysa güvenlik (TOTP) menüsü.",
    p1: "Hesabınız personel portalı ise menüde yalnızca size açık modüller görünür (ör. şube ve personel maliyetleri).",
    p2: "Avanslarınızı “Personel maliyetleri” ekranından (Avanslar sekmesi) takip edin.",
    p3: "Şube tarafında size tanımlı işlemler için “Şube yönetimi” menüsünü kullanın.",
    goBranch: "Şube yönetimine git",
    goAdvances: "Personel maliyetlerine git",
  },
  footer: {
    title: "İpuçları",
    whatsNew:
      "Form görseli reddederse önce dosya boyutunu küçültün. Doğrulama mesajları alanların yanında gösterilir; tekrar göndermeden önce okuyun.",
    p1: "Tablolardaki tarihler gün.ay.yıl formatındadır; sayfa altındaki kısa notta örnek gösterilir.",
    p2: "Formlarda kırmızı veya “Zorunlu” etiketli alanları mutlaka doldurun; kayıt gönderilmeden önce hata mesajlarını okuyun.",
    p3: "Büyük görseller reddedilebilir; boyut sınırına dikkat edin (uyarı mesajında belirtilir).",
  },
} as const;
