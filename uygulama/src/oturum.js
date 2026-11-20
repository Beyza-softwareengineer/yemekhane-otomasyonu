// Oturum deposu. Şimdilik bellekte tutulur (Aşama 2).
// Aşama 3'te bu dosyanın içi Redis ile değiştirilecek; dışarıya açılan arayüz aynı kalır.
const crypto = require('crypto');
const config = require('./config');

const SURE_MS = config.oturum.sureSaniye * 1000;
const depo = new Map(); // token -> { veri, bitis }

async function olustur(veri) {
  const token = crypto.randomBytes(32).toString('hex');
  depo.set(token, { veri, bitis: Date.now() + SURE_MS });
  return token;
}

// Oturumu getirir ve süresini yeniler (kayan süre: 30 dakika).
async function getir(token) {
  const kayit = depo.get(token);
  if (!kayit) return null;
  if (kayit.bitis < Date.now()) {
    depo.delete(token);
    return null;
  }
  kayit.bitis = Date.now() + SURE_MS;
  return kayit.veri;
}

async function guncelle(token, kismiVeri) {
  const kayit = depo.get(token);
  if (kayit) Object.assign(kayit.veri, kismiVeri);
}

async function sil(token) {
  depo.delete(token);
}

module.exports = { olustur, getir, guncelle, sil };
