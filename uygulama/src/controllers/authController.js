const bcrypt = require('bcryptjs');
const oturum = require('../oturum');
const kullaniciRepo = require('../repositories/kullaniciRepo');
const { UygulamaHatasi } = require('../hatalar');
const { cerezYaz, cerezSil } = require('../middleware/oturum');

async function giris(req, res) {
  const eposta = String((req.body && req.body.eposta) || '').trim();
  const sifre = String((req.body && req.body.sifre) || '');
  if (!eposta || !sifre) throw new UygulamaHatasi(400, 'E-posta ve şifre gereklidir.');

  const kullanici = await kullaniciRepo.epostaIleBul(eposta);
  // Hangisinin yanlış olduğunu belli etmeyen tek mesaj
  const gecerli = kullanici && kullanici.aktif && (await bcrypt.compare(sifre, kullanici.sifre_hash));
  if (!gecerli) throw new UygulamaHatasi(401, 'E-posta veya şifre hatalı.');

  const token = await oturum.olustur({
    id: kullanici.id,
    ad: kullanici.ad,
    soyad: kullanici.soyad,
    rol: kullanici.rol,
    sonYazma: 0,
  });
  cerezYaz(res, token);
  res.json({ id: kullanici.id, ad: kullanici.ad, soyad: kullanici.soyad, rol: kullanici.rol });
}

async function cikis(req, res) {
  await oturum.sil(req.token);
  cerezSil(res);
  res.json({ tamam: true });
}

async function ben(req, res) {
  const bakiye = await kullaniciRepo.bakiyeOku(req.kullanici.id);
  const { id, ad, soyad, rol } = req.kullanici;
  res.json({ id, ad, soyad, rol, bakiye });
}

module.exports = { giris, cikis, ben };
