const config = require('../config');
const oturum = require('../oturum');
const { UygulamaHatasi } = require('../hatalar');
const { okuma, yazma } = require('../db');

function cerezOku(req, ad) {
  const baslik = req.headers.cookie;
  if (!baslik) return null;
  for (const parca of baslik.split(';')) {
    const i = parca.indexOf('=');
    if (i > -1 && parca.slice(0, i).trim() === ad) {
      return decodeURIComponent(parca.slice(i + 1).trim());
    }
  }
  return null;
}

function cerezYaz(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${config.oturum.cerezAdi}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${config.oturum.sureSaniye}`
  );
}

function cerezSil(res) {
  res.setHeader('Set-Cookie', `${config.oturum.cerezAdi}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

// Giriş yapmış kullanıcı zorunlu. req.kullanici ve req.token doldurulur.
async function oturumGerekli(req, res, next) {
  try {
    const token = cerezOku(req, config.oturum.cerezAdi);
    const veri = token ? await oturum.getir(token) : null;
    if (!veri) throw new UygulamaHatasi(401, 'Oturum açmanız gerekiyor.');
    req.token = token;
    req.kullanici = veri;
    cerezYaz(res, token); // çerezin süresini de yenile
    next();
  } catch (err) {
    next(err);
  }
}

function rolGerekli(...roller) {
  return (req, res, next) => {
    if (!roller.includes(req.kullanici.rol)) {
      return next(new UygulamaHatasi(403, 'Bu işlem için yetkiniz yok.'));
    }
    next();
  };
}

// Okuma havuzu seçimi. Normalde okumalar replikaya gider. Kullanıcı az önce yazma
// yaptıysa (rezervasyon, bakiye yükleme...) replikasyon gecikmesi yüzünden kendi
// değişikliğini görememesin diye kısa bir süre okumalar da kaynaktan yapılır.
function okumaHavuzu(req) {
  const son = (req.kullanici && req.kullanici.sonYazma) || 0;
  return Date.now() - son < config.yazdiktanSonraKaynakMs ? yazma : okuma;
}

async function yazmaIsaretle(req) {
  req.kullanici.sonYazma = Date.now();
  await oturum.guncelle(req.token, { sonYazma: req.kullanici.sonYazma });
}

module.exports = { cerezOku, cerezYaz, cerezSil, oturumGerekli, rolGerekli, okumaHavuzu, yazmaIsaretle };
