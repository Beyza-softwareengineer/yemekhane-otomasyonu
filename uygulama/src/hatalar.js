// Kullanıcıya gösterilmesi güvenli, durum kodu belli hata.
class UygulamaHatasi extends Error {
  constructor(durum, mesaj) {
    super(mesaj);
    this.durum = durum;
  }
}
module.exports = { UygulamaHatasi };
