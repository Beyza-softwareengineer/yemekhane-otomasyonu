const rezervasyonRepo = require('../repositories/rezervasyonRepo');
const dogrula = require('./dogrula');
const { okumaHavuzu, yazmaIsaretle } = require('../middleware/oturum');

async function listele(req, res) {
  res.json(await rezervasyonRepo.listele(okumaHavuzu(req), req.kullanici.id));
}

// Yazma: kaynak sunucuda sp_rezervasyon_yap. Yordamın hata mesajı (örn. "Bakiye yetersiz.")
// hataYakala middleware'i tarafından değiştirilmeden arayüze iletilir.
// Dönen bakiye yordamın sonucudur, yani KAYNAKTAN gelir (replikaya sorulmaz).
async function yap(req, res) {
  const menuId = dogrula.tamsayi(req.body && req.body.menu_id, 'Menü');
  const sonuc = await rezervasyonRepo.yap(req.kullanici.id, menuId);
  await yazmaIsaretle(req);
  res.status(201).json(sonuc);
}

async function iptal(req, res) {
  const rezervasyonId = dogrula.tamsayi(req.params.id, 'Rezervasyon');
  const sonuc = await rezervasyonRepo.iptal(req.kullanici.id, rezervasyonId);
  await yazmaIsaretle(req);
  res.json(sonuc);
}

module.exports = { listele, yap, iptal };
