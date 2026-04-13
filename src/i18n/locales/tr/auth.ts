export const auth = {
  title: "Giriş",
  subtitle: "Operations hesabınızla devam edin.",
  username: "Kullanıcı adı",
  password: "Şifre",
  rememberMe: "Beni hatırla",
  rememberMeHint:
    "Açıksa sunucuda refresh token oluşturulur; access süresi dolunca oturum sessizce yenilenir.",
  showPassword: "Şifreyi göster",
  hidePassword: "Şifreyi gizle",
  submit: "Giriş yap",
  signingIn: "Giriş yapılıyor…",
  loginFailed: "Kullanıcı adı veya şifre hatalı.",
  networkError:
    "API'ye ulaşılamıyor. NEXT_PUBLIC_API_BASE_URL'i Swagger ile aynı yapın (ör. https://localhost:7152/api veya http://localhost:5177/api). HTTPS için geliştirme sertifikasını tarayıcıda güvenilir kabul edin.",
  logout: "Çıkış",
  brandHeadline: "Operasyonlarınızı net yönetin",
  brandTagline:
    "Şubeler, ekip ve stok — günlük işiniz için tek bir çalışma alanında bir arada.",
  feature1: "Şube aktivitesi ve özetler tek bakışta",
  feature2: "Ekibiniz için kontrollü erişim",
  feature3: "Güvenilir depo ve envanter bilgisi",
  totpTitle: "Doğrulama kodu",
  totpSubtitle: "Uygulamanızdaki 6 haneli doğrulama kodunu girin.",
  totpCode: "Doğrulama kodu",
  totpSubmit: "Doğrula ve giriş yap",
  totpBack: "Farklı hesap kullan",
  totpFailed: "Kod geçersiz veya süresi dolmuş.",
} as const;
