const menuRepo = require('../repositories/menuRepo');
const dogrula = require('./dogrula');
const { okumaHavuzu } = require('../middleware/oturum');

async function secimler(req, res) {
  res.json(await menuRepo.secimler(okumaHavuzu(req)));
}

// Günün menüsü: yemekhane + tarih + öğün
async function gunMenusu(req, res) {
  const yemekhaneId = dogrula.tamsayi(req.query.yemekhane, 'Yemekhane');
  const ogunId = dogrula.tamsayi(req.query.ogun, 'Öğün');
  const tarih = dogrula.tarih(req.query.tarih);
  const havuz = okumaHavuzu(req);

  const menuId = await menuRepo.menuBul(havuz, yemekhaneId, tarih, ogunId);
  if (!menuId) return res.json({ menu: null });

  const [menu, doluluk, rezervasyon] = await Promise.all([
    menuRepo.icerik(havuz, menuId),
    menuRepo.doluluk(havuz, menuId),
    menuRepo.kullanicininRezervasyonu(havuz, req.kullanici.id, menuId),
  ]);
  res.json({
    menu: { ...menu, fiyat: menuRepo.fiyatSec(req.kullanici.rol, menu) },
    doluluk,
    rezervasyonum: rezervasyon,
  });
}

// Haftalık menü: seçilen tarihten itibaren 7 gün
async function haftalik(req, res) {
  const yemekhaneId = dogrula.tamsayi(req.query.yemekhane, 'Yemekhane');
  const baslangic = req.query.baslangic ? dogrula.tarih(req.query.baslangic, 'Başlangıç tarihi') : dogrula.bugun();
  const menuler = await menuRepo.haftalik(okumaHavuzu(req), {
    yemekhaneId,
    baslangic,
    kullaniciId: req.kullanici.id,
    rol: req.kullanici.rol,
  });
  res.json({ baslangic, menuler });
}

module.exports = { secimler, gunMenusu, haftalik };
