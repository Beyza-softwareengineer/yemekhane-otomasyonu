const menuRepo = require('../repositories/menuRepo');
const alerjenRepo = require('../repositories/alerjenRepo');
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

  // Menü içeriği önbellekten (ya da veritabanından) gelir; doluluk ve kullanıcının
  // rezervasyonu her seferinde veritabanından okunur.
  const menu = await menuRepo.onbellekliIcerik(havuz, yemekhaneId, tarih, ogunId);
  if (!menu) return res.json({ menu: null });

  const [doluluk, rezervasyon, alerjenIdleri] = await Promise.all([
    menuRepo.doluluk(havuz, menu.id),
    menuRepo.kullanicininRezervasyonu(havuz, req.kullanici.id, menu.id),
    alerjenRepo.kullaniciIdleri(havuz, req.kullanici.id),
  ]);

  // Alerjen uyarısı kullanıcıya özeldir, bu yüzden önbelleğe değil, her istekte hesaplanır:
  // yemeğin alerjenleri ile kullanıcının profilinde seçtiği alerjenler kesişiyorsa uyarı eklenir.
  const kullaniciAlerjenleri = new Set(alerjenIdleri);
  const yemekler = menu.yemekler.map((y) => ({
    ...y,
    uyari_alerjenleri: y.alerjenler.filter((a) => kullaniciAlerjenleri.has(a.id)).map((a) => a.ad),
  }));
  const fiyat = menuRepo.fiyatSec(req.kullanici.rol, menu);

  res.json({
    menu: {
      ...menu,
      yemekler,
      uyari_var: yemekler.some((y) => y.uyari_alerjenleri.length > 0),
      fiyat,
      yarim_fiyat: menuRepo.yarimFiyat(fiyat, menu.yarim_porsiyon_orani),
    },
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
