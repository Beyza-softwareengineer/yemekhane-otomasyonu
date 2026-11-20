const { UygulamaHatasi } = require('../hatalar');

// Tüm hatalar buraya düşer ve { hata: true, mesaj } biçiminde JSON olarak döner.
// Stored procedure'lerin SIGNAL ile döndürdüğü Türkçe mesajlar (MySQL hata kodu 1644)
// DEĞİŞTİRİLMEDEN arayüze iletilir.
module.exports = function hataYakala(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof UygulamaHatasi) {
    return res.status(err.durum).json({ hata: true, mesaj: err.message });
  }
  if (err && err.errno === 1644) {
    return res.status(422).json({ hata: true, mesaj: err.sqlMessage });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ hata: true, mesaj: 'İstek gövdesi geçersiz.' });
  }

  // CHECK kısıtı ihlali (3819) ve diğer beklenmeyen hatalar bir programlama hatasıdır:
  // ham mesaj kullanıcıya gösterilmez, ayrıntı günlüğe yazılır.
  console.error('[HATA]', req.method, req.originalUrl, err && (err.sqlMessage || err.stack || err));
  res.status(500).json({ hata: true, mesaj: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.' });
};
