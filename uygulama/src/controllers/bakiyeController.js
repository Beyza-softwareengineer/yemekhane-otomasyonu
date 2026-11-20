const kullaniciRepo = require('../repositories/kullaniciRepo');
const dogrula = require('./dogrula');
const { okumaHavuzu, yazmaIsaretle } = require('../middleware/oturum');

async function goster(req, res) {
  const [bakiye, hareketler] = await Promise.all([
    kullaniciRepo.bakiyeOku(req.kullanici.id), // para: kaynaktan
    kullaniciRepo.hareketler(okumaHavuzu(req), req.kullanici.id), // geçmiş listesi: replikadan
  ]);
  res.json({ bakiye, hareketler });
}

async function yukle(req, res) {
  const tutar = dogrula.tutar(req.body && req.body.tutar, 'Yükleme tutarı');
  const sonuc = await kullaniciRepo.bakiyeYukle(req.kullanici.id, tutar); // 10–1000 TL kuralı yordamda
  await yazmaIsaretle(req);
  res.status(201).json(sonuc);
}

module.exports = { goster, yukle };
