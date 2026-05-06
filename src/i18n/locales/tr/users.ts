export const users = {
  title: "Kullanıcılar",
  description:
    "Sistem hesapları (giriş). İsteğe bağlı olarak personel kaydı ile eşleştirin.",
  addUser: "Yeni kullanıcı",
  forbidden: "Bu sayfayı görmek için yönetici yetkisi gerekir.",
  loadError: "Kullanıcılar yüklenemedi.",
  tableUser: "Kullanıcı adı",
  tableName: "Görünen ad",
  tableRole: "Rol",
  tableStatus: "Durum",
  tablePersonnel: "Personel",
  personnelNone: "—",
  empty: "Henüz kullanıcı yok.",
  modalTitle: "Kullanıcı oluştur",
  modalHint:
    "Şifre en az 8 karakter. Personel seçimi, mevcut bir çalışan için giriş açarken kullanılır.",
  fieldUsername: "Kullanıcı adı",
  fieldPassword: "Şifre",
  fieldPasswordConfirm: "Şifre tekrar",
  fieldFullName: "Görünen ad (isteğe bağlı)",
  fieldRole: "Rol",
  fieldPersonnel: "Personel (isteğe bağlı)",
  personnelPlaceholder: "Bağlama",
  roleAdmin: "Yönetici",
  roleStaff: "Operasyon personeli",
  rolePersonnel: "Şube personeli (sınırlı erişim)",
  roleDriver: "Depo şoförü (yalnız sevkiyat)",
  roleViewer: "Salt okunur (özet ve raporlar)",
  roleFinance: "Muhasebe ve finans",
  roleProcurement: "Satınalma ve depo",
  roleBranchDayRegister: "Şube gün sonu kasiyeri (yalnız bugün + atanmış avans)",
  roleDetailAdmin:
    "Tüm menüler (şube, personel, depo, ürün, tedarikçi, raporlar, kullanıcılar, yetkilendirme matrisi). Varsayılan olarak en geniş API erişimi; ince ayar matristen ve isteğe bağlı kullanıcı düzeyi geçersiz kılmalarla yapılır.",
  roleDetailStaff:
    "Operasyon paketi: şubeler, personel, depo hareketleri, ürünler, raporlar ve çoğu günlük iş ekranı. Tam izin seti Yetkilendirme matrisindeki «Operasyon personeli» satırına göredir.",
  roleDetailPersonnel:
    "Daraltılmış menü (tipik olarak şubeler, avanslarım vb.). Atandığı şubenin kartı ve kendisiyle ilgili veriler. Rol için şubeli bir personel kaydı gerekir.",
  roleDetailDriver:
    "Şubeler ve depo; size atanan sevkiyatları görme ve imzalama. Personel bağlantısı zorunludur. İstenirse «kendi mali görünümü» ile kendi avans ve gider özetini açabilirsiniz.",
  roleDetailViewer:
    "Özet, raporlar ve günlük şube kasası gibi salt okunur ekranlar; veri oluşturma veya onaylama yoktur.",
  roleDetailFinance:
    "Özet, raporlar, personel maliyetleri, şubeler, genel gider, ürün ve tedarikçi; muhasebe ve maliyet odaklı görünümler. Ayrıntılar matristeki «Muhasebe ve finans» satırına göredir.",
  roleDetailProcurement:
    "Özet, raporlar, şubeler, depo, ürün ve tedarikçi; satınalma, stok ve tedarik iş akışları. Ayrıntılar matristeki «Satınalma ve depo» satırına göredir.",
  roleDetailBranchDayRegister:
    "Yalnızca atanan şubeler: bugünkü kasa hareketleri ve veri kapsamında «Avans hedefi» olarak işaretlenen personellere kasadan avans. Tam şube modülü yok; başkalarının geçmiş avanslarını görmez.",
  branchDayRegisterSetupTitle: "Bu rol için kurulumu tamamlayın",
  branchDayRegisterSetupIntro:
    "Şube ve (isteğe bağlı) avans hedefi satırları «Veri kapsamları»nda tanımlanmadan hesap çalışmaz.",
  branchDayRegisterSetupStep1:
    "Şube kapsamları: kullanıcının açacağı her şube için satır ekleyin (gün sonu kasası için özet düzeyi yeterlidir).",
  branchDayRegisterSetupStep2:
    "İsteğe bağlı — delegeli avans: kasadan avans verebileceği her personel için personel kapsamında «Avans hedefi» seviyesi ile satır ekleyin.",
  branchDayRegisterSetupStep3:
    "Önce rolü veya kullanıcıyı kaydedin; veri kapsamı yetkiniz varsa ardından kapsam penceresi açılır ve satırları hemen ekleyebilirsiniz.",
  branchDayRegisterSetupNote:
    "Bu rolde kasa satırları sunucuda yalnızca bugünün tarihiyle sınırlıdır; geçmiş günlere kayıt atılamaz.",
  branchDayRegisterSetupAfterSaveHint:
    "Aşağıdan onayladığınızda bu hesap için Veri kapsamları penceresi açılacak (yetkiniz var).",
  branchDayRegisterSetupNeedScopesPermission:
    "Bu oturumla veri kapsamı düzenleyemezsiniz. «admin.users.data_scopes» yetkili bir yöneticiden bu kullanıcı için şube (ve isteğe bağlı avans hedefi) satırlarını eklemesini isteyin.",
  branchDayRegisterSetupGuideLink: "Uygulama rehberini aç (Yönetim sekmesi)",
  branchDayRegisterRoleSavedNeedScopesPermission:
    "Rol güncellendi. Bu kullanıcı için şube veri kapsamlarını (ve isteğe bağlı avans hedefi personellerini) atayın — hesabınızla kapsam düzenleyicisi açılamıyor.",
  branchDayRegisterUserCreatedNeedScopesPermission:
    "Kullanıcı oluşturuldu. Bu hesap için şube kapsamlarını (ve isteğe bağlı avans hedefi personellerini) atayın — oturumunuzla kapsam düzenleyicisi açılamıyor.",
  statusActive: "Aktif",
  statusInactive: "Pasif",
  passwordMismatch: "Şifreler eşleşmiyor.",
  passwordTooShort: "Şifre en az 8 karakter olmalı.",
  created: "Kullanıcı oluşturuldu",
  personnelPickInvalid: "Geçerli bir personel seçin veya alanı boş bırakın.",
  personnelRequiredForPortalRole:
    "Şube personeli rolü için atanmış şubesi olan bir personel seçmelisiniz.",
  personnelRequiredForDriverRole:
    "Şoför rolü için personel kaydı seçilmelidir (sevkiyat imzası).",
  tableSelfFinancials: "Kendi mali görünümü",
  selfFinancialsHint:
    "Açıkken şoför kendi avans ve kendisine yazılan giderleri görebilir.",
  selfFinancialsUpdated: "Görünürlük güncellendi",
  roleUpdated: "Rol güncellendi. Kullanıcı tekrar giriş yapmalıdır (oturumlar sonlandırıldı).",
  roleChangeSelfDisabled: "Kendi rolünüzü buradan değiştiremezsiniz.",
  roleChangeModalTitle: "Rolü değiştir",
  roleChangeModalDescription:
    "Aşağıdan yeni rolü seçin. Kaydettiğinizde bu hesabın açık oturumları sonlanır; kullanıcı yeniden giriş yapmalıdır.",
  roleChangeAccountHeading: "Hesap",
  roleChangeCurrentBadge: "Şu anki rol",
  roleChangePickHeading: "Yeni rol",
  roleChangePickSubhint:
    "Her seçenekte tipik menü ve veri erişimi özeti yer alır; kesin izin listesi Yetkilendirme matrisindedir.",
  roleChangePreviewHeading: "Özet",
  roleChangeConfirm: "Rolü güncelle",
  roleChangeOpenAria: "Rol seç ve güncelle",
  roleChangeSessionHint: "Onayladığınızda oturumlar sonlanır.",
  roleChangePersonnelFieldLabel: "Personel bağlantısı",
  roleChangePersonnelFieldHint:
    "Şube personeli veya şoför rolü için bu giriş hesabının hangi personel kartına bağlı olacağını seçin. Hesapta zaten personel varsa aynı kaydı bırakabilirsiniz.",
  roleChangePersonnelRequired:
    "Bu rol için listeden bir personel seçin (şube personelinde şubesi atanmış kayıt gerekir).",
  activateUser: "Aktif yap",
  deactivateUser: "Pasif yap",
  activateUserHint: "Kullanıcı tekrar giriş yapabilir.",
  deactivateUserHint:
    "Girişi kapatır; «Beni hatırla» oturumları sonlanır. Denetim kaydına yazılır.",
  accountActivatedToast: "Kullanıcı aktifleştirildi",
  accountDeactivatedToast: "Kullanıcı pasifleştirildi",
  accountStatusDialogTitleActivate: "Hesabı aktifleştir",
  accountStatusDialogTitleDeactivate: "Hesabı pasifleştir",
  accountStatusDialogDescriptionActivate:
    "Bu kullanıcı tekrar giriş yapabilecek. Onaylıyor musunuz?",
  accountStatusDialogDescriptionDeactivate:
    "Giriş kapanır; «Beni hatırla» oturumları sonlanır ve işlem denetim kaydına yazılır. Onaylıyor musunuz?",
  statusChangeSelfDisabled: "Kendi hesabınızı buradan pasifleştiremezsiniz.",
  tablePermissions: "Yetkiler",
  tableMfa: "MFA",
  mfaOnShort: "Açık",
  mfaOffShort: "Kapalı",
  listOverrideNone: "Özel izin satırı yok",
  listOverrideSome: "{count} özel izin",
  listScopeNone: "Özel veri kapsamı yok",
  listScopeSome: "{count} kapsam satırı",
  managePermissions: "Yetki düzenle",
  managePermissionsForbidden: "Kullanıcı izinlerini düzenlemek için yetkiniz yok.",
  manageScopes: "Kapsam düzenle",
  manageScopesForbidden:
    "Veri kapsamlarını düzenlemek için «admin.users.data_scopes» iznine ihtiyaç vardır. Sistem ayarları → Yetkilendirme matrisinden atanmalıdır.",
  manageScopesRequiresPermissionOverridesFirst:
    "Önce kullanıcı izinlerini düzenleme yetkisi gerekir (system.admin veya admin.users.permission_overrides). Yetkiniz yoksa yöneticinizden Sistem ayarları → Yetkilendirme üzerinden bu izinleri isteyin.",
  manageScopesGoAuthorization: "Yetkilendirme ayarlarına git →",
  permissionsModalTitle: "Kullanıcı bazlı izinler",
  permissionsModalUserLabel: "Hesap",
  permissionsGuideEyebrow: "Rehber",
  permissionsGuideToggleLabel: "Kalıtım, rol matrisi ve kullanıcı istisnaları (dokununca açın)",
  permissionsModalRoleHighlight: "Atanmış rol",
  permissionsStatsMatrixTitle: "Rol matrisi özeti",
  permissionsStatsMatrixSubtitle: "Yetkilendirme matrisinde «{role}» için",
  permissionsStatsMatrixGrantsLabel: "İzin veriyor",
  permissionsStatsMatrixNotGrantedLabel: "İzin vermiyor",
  permissionsStatsMatrixTotalLabel: "Toplam tanım",
  permissionsStatsMatrixFootnote:
    "«İzin vermiyor» = matriste bu rol için kapalı; kullanıcıya özel «Engelle» sayılmaz.",
  permissionsStatsMatrixLoading: "Rol satırı yükleniyor…",
  permissionsStatsMatrixMissing: "Bu rol için matris satırı yok; aç/kapa sayıları hesaplanamıyor.",
  permissionsStatsOverridesTitle: "Bu kullanıcıya özel (override)",
  permissionsStatsOverridesSubtitle: "Matristen bağımsız kayıtlar — taslak sayıları",
  permissionsStatsOverridesSaved: "Sunucuda kayıtlı özel: {allow} izin, {deny} engel ({total} satır)",
  permissionsStatsOverridesSavedEmpty: "Sunucuda kayıtlı özel satır yok.",
  permissionsStatsOverridesInheritLabel: "Kalıtım (rolü izle)",
  permissionsModalDescriptionShort:
    "Kalıtım: matristeki role göre izin var/yok (tek başına «izin verdim» veya «reddettim» demek değil). İzin ver (+) / Engelle (−): yalnızca bu girişe özel istisna.",
  permissionsModalHint:
    "Rol paketini değiştirmek için Sistem ayarları → Yetkilendirme. Burada yalnızca bu hesaba özel istisna tanımlarsınız.",
  permissionsHelpIntro:
    "Aşağıdaki her izin için üç seçenekten birini seçin. Depo: giriş, çıkış ve toplamlar ayrı izinlerdir. Şube sorumlusu (şube kartı) ve «Kapsam düzenle» veri sınırları bu ekrandan bağımsız çalışır.",
  permissionsRoleVsUserTitle: "Rol matrisi ile ilişki:",
  permissionsThreeStatesTitle: "Kalıtım ne demek?",
  permissionsInheritPlainMeaning:
    "Özet: «Kalıtım» tek başına izin vermez ve tek başına ret etmez; yalnızca rol matrisinde bu izin açıksa etki «var», kapalıysa «yok» olur. Açık istisna için «İzin ver (+)», kapatmak için «Engelle (−)» seçin.",
  permissionsInheritExplain:
    "Kalıtım = bu izin için bu kullanıcıya özel ALLOW/DENY kaydı yok demektir; ne «ekstra izin verildi» ne de «özellikle yasaklandı» anlamına gelir. Sunucu Yetkilendirme matrisinde bu role hangi izinler bağlıysa onları uygular. Matriste bu role yeni bir izin eklerseniz ve burada Kalıtım bırakırsanız, bu kullanıcı bir sonraki istekte o izni de rolle birlikte alır.",
  permissionsAllowExplain:
    "İzin ver (+) = role ek olarak bu girişe bu izni verir; matriste bu rol için kapalı olsa bile bu kullanıcıda açılır.",
  permissionsDenyExplain:
    "Engelle (−) = bu girişte bu izni kapatır; matriste bu rol için açık olsa bile bu kullanıcıda uygulanmaz.",
  permissionsInheritedStatHint:
    "Kalıtım sayısı: özel ALLOW/DENY yok; etki yalnızca rolden (izin/ret sayısı değil).",
  permissionWhereUsed: "Uygulamada neresi",
  permissionInheritSourceLine:
    "Kalıtım kaynağı: «{role}» rolü — matriste işaretli izinler uygulanır. Bu, tek başına «izin verildi» veya «engellendi» anlamına gelmez.",
  permissionServerDescriptionLabel: "Sunucu açıklaması",
  permissionCardWhereHeading: "Menü ve bağlam",
  permissionCardDetailHeading: "Ne işe yarar?",
  permissionCardTechnicalCodeHeading: "İzin kodu (sistem)",
  permissionMatrixRoleGrantsThis:
    "Rol şu an bu izni veriyor: «{role}» matrisinde açık. Kalıtım seçiliyken bu kullanıcıda etkindir (ret değil, rol izin veriyor).",
  permissionMatrixRoleDoesNotGrant:
    "Rol şu an bu izni vermiyor: «{role}» matrisinde kapalı. Kalıtım seçiliyken bu kullanıcıda bu izin yoktur — bu, «Engelle (−)» ile yapılan özel ret değildir; rol paketinde bu kod tanımlı değil.",
  permissionInheritBadgeTitle: "Kalıtım seçiliyken pratik sonuç",
  permissionInheritBadgeGranted:
    "Rol bu izni veriyor → bu kullanıcıda etkin. (Özel «İzin ver» kaydı yok; matristen geliyor.)",
  permissionInheritBadgeNotGranted:
    "Rol bu izni vermiyor → bu kullanıcıda yok. (Özel «Engelle» değil; matriste bu rol için kapalı.)",
  permissionMatrixPending: "Rol matrisi yükleniyor…",
  permissionMatrixRoleMissing:
    "Bu rol için matris satırı bulunamadı. Yetkilendirme sayfasını kontrol edin.",
  permissionChoiceOutcomeTitle: "Seçimin sonucu (kaydedince)",
  permissionChoiceGroupAria: "Kalıtım, izin ver veya engelle",
  permissionInheritIconAriaMatrixOn: "Matriste bu izin açık",
  permissionInheritIconAriaMatrixOff: "Matriste bu izin kapalı",
  permissionSaveEffectInheritOn:
    "Özel kayıt kalkar; «{role}» matrisinde bu izin açık olduğu için bu kullanıcıda etkin kalır (rol veriyor).",
  permissionSaveEffectInheritOff:
    "Özel kayıt kalkar; «{role}» matrisinde bu izin kapalı olduğu için bu kullanıcıda yok kalır (rol vermiyor — özel ret sayılmaz).",
  permissionSaveEffectInheritPending: "Matris yüklenene kadar tam sonucu göstermiyoruz.",
  permissionSaveEffectInheritUnknown: "Rol satırı eksik; Kalıtım etkisini burada hesaplayamıyoruz.",
  permissionSaveEffectAllow:
    "Bu girişe bu izin açıkça verilir (matriste «{role}» için kapalı olsa bile).",
  permissionSaveEffectDeny:
    "Bu girişte bu izin kapatılır (matriste «{role}» için açık olsa bile).",
  permissionButtonTitleInherit:
    "Rol matrisindeki değere döner; kullanıcıya özel ALLOW/DENY kaldırılır. İzin vermez ve ret etmez — matriste açıksa etkin, kapalıysa değildir.",
  permissionButtonTitleAllow: "Bu izni yalnız bu kullanıcıya ekler veya açık tutar.",
  permissionButtonTitleDeny: "Bu izni yalnız bu kullanıcıda kapatır.",
  permissionGroupBranch: "Şube",
  permissionGroupPersonnel: "Personel",
  permissionGroupWarehouse: "Depo",
  permissionGroupShipment: "Sevkiyat",
  permissionGroupUi: "Arayüz",
  permissionGroupSystem: "Sistem",
  permissionGroupOperations: "Operasyon",
  permissionGroupOther: "Diğer",
  permissionsSearchPlaceholder: "İzin kodu veya açıklamada ara",
  permissionsSearchEmpty: "Arama kriterine uygun permission bulunamadı.",
  permissionsInheritedLabel: "Kalıtım (roldeki gibi)",
  permissionsAllowLabel: "İzin ver (+)",
  permissionsDenyLabel: "Engelle (−)",
  permissionsUpdated: "Kaydedildi. Bu kullanıcı tekrar giriş yapmalıdır (oturumlar sonlandırıldı).",
  scopesModalTitle: "Veri kapsamı (şube / depo / personel)",
  scopesModalHint:
    "Hangi şube, depo veya personel için ne kadar detay göreceğini satırlarla sınırlayın. Liste boşsa rolün izinleri olduğu gibi kalır (ek kısıt yok). Şube sorumlusu: Şubeler → şube düzenle → Sorumlular; hesap personel kaydına bağlıysa o şubenin personel kapsamı aşağıda otomatik görünür.",
  scopesHelpPanelTitle: "Seviye rehberi",
  scopesHelpPanelSubtitle:
    "Açılır listelerde seçenekler dar erişimden geniş erişime doğru sıralanır. Her satır yalnız seçtiğiniz kayıt için geçerlidir.",
  scopesHelpBranchStep1: "Özet — şube özet panoları ve genel bakış; en sınırlı detay.",
  scopesHelpBranchStep2: "Operasyon — günlük işler: kasa, gelir/gider, stok ve şube operasyon kayıtlarına yazma.",
  scopesHelpBranchStep3: "Tüm veri — tam finansal ve ayrıntılı şube verisi.",
  scopesHelpWarehouseStep1: "Salt okuma — hareketleri görüntüleme.",
  scopesHelpWarehouseStep2: "Operasyon — giriş/çıkış ve depolar arası hareketlere yazma.",
  scopesHelpWarehouseStep3: "Tam veri — maliyet ve tüm hareket detayı.",
  scopesHelpPersonnelStep1: "Kendi kartı — yalnızca hesabın bağlı olduğu personel.",
  scopesHelpPersonnelStep2: "Şube özeti — o şubedeki personel listesi ve özet bilgiler.",
  scopesHelpPersonnelStep3: "Şube detayı — o şubede finans ve İK ayrıntıları.",
  scopesHelpPersonnelStep4: "Tüm personel — şirket genelindeki tüm personel ayrıntıları.",
  scopesColumnTarget: "Kayıt",
  scopesColumnAccessLevel: "Erişim seviyesi",
  scopesUpdated: "Kaydedildi. Bu kullanıcı tekrar giriş yapmalıdır (oturumlar sonlandırıldı).",
  branchScopesTitle: "Şube kapsamları",
  warehouseScopesTitle: "Depo kapsamları",
  personnelScopesTitle: "Personel kapsamları",
  personnelScopeImpliedTitle: "Otomatik (şube kartında sorumlu)",
  personnelScopeImpliedPrefix: "Şube:",
  personnelScopeImpliedDetail:
    "Bu şubedeki tüm personel için veri düzeyi otomatik olarak «şube detayı» (BRANCH_ALL_DATA) sayılır.",
  personnelScopeImpliedRemoveHint:
    "Kaldırmak için: Şubeler → ilgili şubeyi düzenle → Sorumlular listesinden bu personeli çıkarın (ayrıca kullanıcının hesabı o personel kaydına bağlı olmalı).",
  personnelScopeImpliedCoveredTitle: "Bu şubede kapsamda görünen personeller",
  personnelScopeImpliedCoveredCount: "{count} kişi",
  personnelScopeImpliedCoveredEmpty: "Bu şubeye atanmış aktif personel yok.",
  personnelScopeImpliedMultiBranchNote:
    "Birden fazla şubede sorumluysanız her şube ayrı blokta listelenir; her blok yalnız o şubedeki personelleri gösterir.",
  howToBranchResponsibleTitle: "Şube sorumlusu nasıl atanır?",
  howToBranchResponsibleBody:
    "Şubeler listesinden şubeyi açın → Düzenle → «Sorumlular» alanından yalnızca o şubeye atanmış personelleri seçin. Kaydedince hem kasa/operasyon akışlarında sorumlu sayılırlar hem de (hesap personel ile bağlıysa) o şubedeki personel verisi kapsamı otomatik eklenir.",
  howToPersonnelScopeTitle: "Personel sorumlusu / manuel kapsam",
  howToPersonnelScopeBody:
    "Aşağıdaki «Satır ekle» ile tek bir personel veya bir şube hedefi seçip düzey belirleyebilirsiniz. Şube hedefi: o şubedeki tüm personel satırları. Şube sorumlusu ile çakışan şube için ayrıca satır eklemeniz gerekmez.",
  branchScopeLevel: "Şube kapsam seviyesi",
  warehouseScopeLevel: "Depo kapsam seviyesi",
  personnelScopeLevel: "Personel kapsam seviyesi",
  personnelScopeTarget: "Personel kapsam hedefi",
  scopeTargetPersonnel: "Personel kaydı",
  scopeTargetBranch: "Şube kaydı",
  branchScopeSummary: "Özet — en dar görünüm",
  branchScopeOperations: "Operasyon — günlük kayıtlar (kasa, gider, stok)",
  branchScopeAllData: "Tüm veri — tam finansal detay",
  warehouseScopeRead: "Salt okuma — sadece görüntüleme",
  warehouseScopeOperations: "Operasyon — hareket girişi",
  warehouseScopeAllData: "Tam veri — maliyet dahil her şey",
  personnelScopeSelf: "Kendi kartı",
  personnelScopeBranchSummary: "Şube özeti — liste ve özet",
  personnelScopeBranchAllData: "Şube detayı — finans / İK detayı",
  personnelScopeAllPersonnelData: "Tüm personel — şirket geneli",
  personnelScopeAdvanceDelegateTarget:
    "Avans hedefi — gün sonu kasiyerleri bu personele yalnızca kasadan avans girebilir",
} as const;
