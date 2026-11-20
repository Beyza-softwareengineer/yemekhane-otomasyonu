// Oturum deposu: Redis. Anahtar oturum:{token}, süre 30 dakika, her istekte yenilenir.
// Oturum çıkış yapıldığında (sil) silinir. Uygulama container'ı yeniden başlasa da
// oturum Redis'te durduğu için düşmez.
const crypto = require('crypto');
const config = require('./config');
const redis = require('./redis');

const SURE = config.oturum.sureSaniye; // 1800 sn
const anahtar = (token) => `oturum:${token}`;

async function olustur(veri) {
  const token = crypto.randomBytes(32).toString('hex');
  await redis.set(anahtar(token), JSON.stringify(veri), 'EX', SURE);
  return token;
}

// Oturumu getirir ve süresini yeniler (kayan süre). GETEX: oku + süreyi yeniden kur, tek komut.
async function getir(token) {
  if (!/^[0-9a-f]{64}$/.test(token || '')) return null; // geçersiz biçimde Redis'e hiç sorma
  const metin = await redis.getex(anahtar(token), 'EX', SURE);
  return metin ? JSON.parse(metin) : null;
}

// Oturumdaki alanları günceller; mevcut süreyi bozmaz (KEEPTTL).
async function guncelle(token, kismiVeri) {
  const metin = await redis.get(anahtar(token));
  if (!metin) return;
  const yeni = { ...JSON.parse(metin), ...kismiVeri };
  await redis.set(anahtar(token), JSON.stringify(yeni), 'KEEPTTL');
}

async function sil(token) {
  await redis.del(anahtar(token));
}

module.exports = { olustur, getir, guncelle, sil };
