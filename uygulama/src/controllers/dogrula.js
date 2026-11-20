// İstek girdisi doğrulama yardımcıları (iş kuralı değil, biçim kontrolü).
const { UygulamaHatasi } = require('../hatalar');

function tamsayi(deger, ad) {
  const n = Number(deger);
  if (!Number.isInteger(n) || n <= 0) throw new UygulamaHatasi(400, `${ad} geçersiz.`);
  return n;
}

function tarih(deger, ad = 'Tarih') {
  if (typeof deger !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deger) || Number.isNaN(Date.parse(deger))) {
    throw new UygulamaHatasi(400, `${ad} geçersiz (GGGG-AA-GG biçiminde olmalı).`);
  }
  return deger;
}

// En fazla 2 ondalıklı, sıfır ya da pozitif tutar
function tutar(deger, ad = 'Tutar') {
  const metin = String(deger ?? '').replace(',', '.').trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(metin)) throw new UygulamaHatasi(400, `${ad} geçersiz.`);
  return Number(metin);
}

// Bugünün tarihi (İstanbul saatiyle), GGGG-AA-GG
function bugun() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}

module.exports = { tamsayi, tarih, tutar, bugun };
