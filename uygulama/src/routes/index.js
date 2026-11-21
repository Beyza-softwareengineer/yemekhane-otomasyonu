// Yol tanımları: URL -> middleware -> controller. Apache yalnızca /api/ ile başlayanları buraya iletir.
const express = require('express');
const { oturumGerekli, rolGerekli } = require('../middleware/oturum');

const auth = require('../controllers/authController');
const menu = require('../controllers/menuController');
const rezervasyon = require('../controllers/rezervasyonController');
const bakiye = require('../controllers/bakiyeController');
const degerlendirme = require('../controllers/degerlendirmeController');
const yonetici = require('../controllers/yoneticiController');
const profil = require('../controllers/profilController');

// Express 4'te async controller hataları next'e iletilsin
const a = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const r = express.Router();

// Sağlık kontrolü (oturum gerekmez)
r.get('/', (req, res) => res.json({ durum: 'ok' }));

// Kimlik
r.post('/giris', a(auth.giris));
r.post('/cikis', oturumGerekli, a(auth.cikis));
r.get('/ben', oturumGerekli, a(auth.ben));

// Menü
r.get('/secimler', oturumGerekli, a(menu.secimler));
r.get('/menu', oturumGerekli, a(menu.gunMenusu));
r.get('/haftalik', oturumGerekli, a(menu.haftalik));

// Profil (alerjen tercihleri)
r.get('/profil', oturumGerekli, a(profil.goster));
r.put('/profil/alerjenler', oturumGerekli, a(profil.alerjenKaydet));

// Rezervasyon
r.get('/rezervasyonlar', oturumGerekli, a(rezervasyon.listele));
r.post('/rezervasyonlar', oturumGerekli, a(rezervasyon.yap));
r.post('/rezervasyonlar/:id/iptal', oturumGerekli, a(rezervasyon.iptal));

// Bakiye
r.get('/bakiye', oturumGerekli, a(bakiye.goster));
r.post('/bakiye/yukle', oturumGerekli, a(bakiye.yukle));

// Değerlendirme
r.get('/degerlendirmeler', oturumGerekli, a(degerlendirme.listele));
r.post('/degerlendirmeler', oturumGerekli, a(degerlendirme.ekle));

// Yönetici paneli
const yon = [oturumGerekli, rolGerekli('yonetici')];
r.get('/yonetici/rapor', ...yon, a(yonetici.rapor));
r.get('/yonetici/yemekler', ...yon, a(yonetici.yemekler));
r.get('/yonetici/menuler/:id', ...yon, a(yonetici.menuGetir));
r.post('/yonetici/menuler', ...yon, a(yonetici.menuOlustur));
r.put('/yonetici/menuler/:id', ...yon, a(yonetici.menuGuncelle));

module.exports = r;
