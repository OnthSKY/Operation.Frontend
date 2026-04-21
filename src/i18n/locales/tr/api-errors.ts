export const apiErrors = {
  generalOverheadReverseRequiresAcknowledgement:
    "Geri alma onayı gerekiyor: önizlemede kapalı turizm sezonu veya REGISTER / personel cebi payları olan şubeleri inceleyip acknowledgeReverseRisks=true gönderin.",
  tourismSeasonClosedForRegister:
    "Bu işlem tarihinde şubede açık turizm sezonu yok. Gider ve gelir dışı kasa akışları sezonsuz kaydedilemez; turizm sezonu ekleyin veya tarihi açık sezona alın. Gelir (IN) için yalnızca merkez politikasının izin vermesi gerekir.",
  tourismSeasonClosedForRegisterAdmin:
    "Bu işlem tarihinde şubede açık turizm sezonu yok. Gider vb. akışlar sezonsuz kapalıdır; turizm sezonunu tanımlayın. Gelir (IN) istisnası için Ayarlar → Turizm sezonu (kapalı kasa) politikasını kullanabilirsiniz.",
} as const;
