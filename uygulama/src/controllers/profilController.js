const alerjenRepo = require('../repositories/alerjenRepo');
const { UygulamaHatasi } = require('../hatalar');
const { okumaHavuzu, yazmaIsaretle } = require('../middleware/oturum');

// Profil: kullanıcının bilgisi ve alerjen listesi (hepsi, seçili olanlar işaretli)
async function goster(req, res) {
  const havuz = okumaHavuzu(req);
  const [tumu, secili] = await Promise.all([
    alerjenRepo.tumu(havuz),
    alerjenRepo.kullaniciIdleri(havuz, req.kullanici.id),
  ]);
  const seciliKume = new Set(secili);
  const { id, ad, soyad, rol } = req.kullanici;
  res.json({
    kullanici: { id, ad, soyad, rol },
    alerjenler: tumu.map((a) => ({ id: a.id, ad: a.ad, secili: seciliKume.has(a.id) })),
  });
}

// Alerjen listesini kaydeder (yazma: kaynak sunucu)
async function alerjenKaydet(req, res) {
  const gelen = req.body && req.body.alerjen_idler;
  if (!Array.isArray(gelen) || gelen.length > 100) throw new UygulamaHatasi(400, 'Alerjen seçimi geçersiz.');
  const idler = [...new Set(gelen.map(Number))];
  const gecerli = new Set((await alerjenRepo.tumu(okumaHavuzu(req))).map((a) => a.id));
  if (!idler.every((i) => Number.isInteger(i) && gecerli.has(i))) {
    throw new UygulamaHatasi(400, 'Alerjen seçimi geçersiz.');
  }
  await alerjenRepo.kullaniciKaydet(req.kullanici.id, idler);
  await yazmaIsaretle(req); // hemen ardından menüyü kendi seçimiyle görsün
  res.json({ alerjen_idler: idler });
}

module.exports = { goster, alerjenKaydet };
