const menuRepo = require('../repositories/menuRepo');
const menuOnbellekRepo = require('../repositories/menuOnbellekRepo');
const dogrula = require('./dogrula');
const { UygulamaHatasi } = require('../hatalar');
const { okumaHavuzu, yazmaIsaretle } = require('../middleware/oturum');

function govdedenMenu(govde) {
  const g = govde || {};
  const yemekIdler = Array.isArray(g.yemek_idler) ? [...new Set(g.yemek_idler.map(Number))] : [];
  if (yemekIdler.length === 0 || yemekIdler.some((y) => !Number.isInteger(y) || y <= 0)) {
    throw new UygulamaHatasi(400, 'Menü için en az bir yemek seçmelisiniz.');
  }
  return {
    ogrenciFiyati: dogrula.tutar(g.ogrenci_fiyati, 'Öğrenci fiyatı'),
    personelFiyati: dogrula.tutar(g.personel_fiyati, 'Personel fiyatı'),
    yemekIdler,
  };
}

function sqlHatasiniCevir(err) {
  if (err.errno === 1062) {
    return new UygulamaHatasi(409, 'Bu yemekhane, tarih ve öğün için zaten bir menü var.');
  }
  if (err.errno === 1452) {
    return new UygulamaHatasi(400, 'Yemekhane, öğün ya da yemek seçimi geçersiz.');
  }
  return err;
}

async function rapor(req, res) {
  const baslangic = req.query.baslangic ? dogrula.tarih(req.query.baslangic, 'Başlangıç tarihi') : dogrula.bugun();
  const bitis = req.query.bitis ? dogrula.tarih(req.query.bitis, 'Bitiş tarihi') : baslangic;
  res.json(await menuRepo.rapor(okumaHavuzu(req), { baslangic, bitis }));
}

async function yemekler(req, res) {
  res.json(await menuRepo.tumYemekler(okumaHavuzu(req)));
}

async function menuGetir(req, res) {
  const menu = await menuRepo.menuDuzenleme(okumaHavuzu(req), dogrula.tamsayi(req.params.id, 'Menü'));
  if (!menu) throw new UygulamaHatasi(404, 'Menü bulunamadı.');
  res.json(menu);
}

async function menuOlustur(req, res) {
  const g = req.body || {};
  const menu = {
    yemekhaneId: dogrula.tamsayi(g.yemekhane_id, 'Yemekhane'),
    ogunId: dogrula.tamsayi(g.ogun_id, 'Öğün'),
    tarih: dogrula.tarih(g.tarih),
    ...govdedenMenu(g),
  };
  try {
    const id = await menuRepo.olustur(menu);
    await yazmaIsaretle(req);
    res.status(201).json({ id });
  } catch (err) {
    throw sqlHatasiniCevir(err);
  }
}

async function menuGuncelle(req, res) {
  const id = dogrula.tamsayi(req.params.id, 'Menü');
  try {
    const sonuc = await menuRepo.guncelle(id, govdedenMenu(req.body));
    if (!sonuc) throw new UygulamaHatasi(404, 'Menü bulunamadı.');
    // Veritabanı değişti: eski içerik Redis'ten silinir (arayüz yeni menüyü göstersin).
    await menuOnbellekRepo.gecersizlestir(sonuc.yemekhane_id, sonuc.tarih, sonuc.ogun_id);
    console.log(`[önbellek] ${menuOnbellekRepo.anahtar(sonuc.yemekhane_id, sonuc.tarih, sonuc.ogun_id)} menü güncellendi -> Redis kaydı silindi`);
    await yazmaIsaretle(req);
    res.json({ id });
  } catch (err) {
    throw sqlHatasiniCevir(err);
  }
}

module.exports = { rapor, yemekler, menuGetir, menuOlustur, menuGuncelle };
