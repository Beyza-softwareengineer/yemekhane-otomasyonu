const degerlendirmeRepo = require('../repositories/degerlendirmeRepo');
const dogrula = require('./dogrula');
const { UygulamaHatasi } = require('../hatalar');
const { okumaHavuzu, yazmaIsaretle } = require('../middleware/oturum');

async function listele(req, res) {
  const havuz = okumaHavuzu(req);
  const [bekleyenler, verdiklerim] = await Promise.all([
    degerlendirmeRepo.bekleyenler(havuz, req.kullanici.id),
    degerlendirmeRepo.benimkiler(havuz, req.kullanici.id),
  ]);
  res.json({ bekleyenler, verdiklerim });
}

async function ekle(req, res) {
  const menuId = dogrula.tamsayi(req.body && req.body.menu_id, 'Menü');
  const puan = Number(req.body && req.body.puan);
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
    throw new UygulamaHatasi(400, 'Puan 1 ile 5 arasında olmalıdır.');
  }
  let yorum = req.body && req.body.yorum != null ? String(req.body.yorum).trim() : '';
  if (yorum.length > 500) throw new UygulamaHatasi(400, 'Yorum en fazla 500 karakter olabilir.');
  yorum = yorum === '' ? null : yorum;

  const sonuc = await degerlendirmeRepo.ekle(req.kullanici.id, menuId, puan, yorum);
  if (sonuc === 'kullanilmamis') {
    throw new UygulamaHatasi(422, 'Yalnızca kullandığınız menüyü değerlendirebilirsiniz.');
  }
  if (sonuc === 'tekrar') throw new UygulamaHatasi(409, 'Bu menüyü zaten değerlendirdiniz.');
  await yazmaIsaretle(req);
  res.status(201).json({ tamam: true });
}

module.exports = { listele, ekle };
