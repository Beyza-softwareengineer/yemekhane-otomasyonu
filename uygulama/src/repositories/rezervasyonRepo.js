const { yazma } = require('../db');

// Rezervasyon ve iptal para hareketidir: iş kuralı stored procedure'dedir.
async function yap(kullaniciId, menuId, porsiyon) {
  const [sonuc] = await yazma.query('CALL sp_rezervasyon_yap(?, ?, ?)', [kullaniciId, menuId, porsiyon]);
  return sonuc[0][0]; // { rezervasyon_id, ucret, bakiye, porsiyon }
}

async function iptal(kullaniciId, rezervasyonId) {
  const [sonuc] = await yazma.query('CALL sp_rezervasyon_iptal(?, ?)', [kullaniciId, rezervasyonId]);
  return sonuc[0][0]; // { rezervasyon_id, iade, bakiye }
}

// Kullanıcının rezervasyonları (listeleme: havuz çağıran tarafından seçilir).
// iptal_edilebilir: durum aktif VE son saat geçmemiş. Karşılaştırma veritabanında yapılır.
async function listele(havuz, kullaniciId) {
  const [satirlar] = await havuz.query(
    `SELECT r.id, r.menu_id, r.durum, r.porsiyon, r.ucret, r.olusturma, r.iptal_zamani, r.kullanma_zamani,
            m.tarih, o.ad AS ogun, yh.ad AS yemekhane,
            TIMESTAMP(m.tarih, o.son_saat) AS rezervasyon_son,
            (r.durum = 'aktif' AND NOW() < TIMESTAMP(m.tarih, o.son_saat)) AS iptal_edilebilir
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
      WHERE r.kullanici_id = ?
      ORDER BY m.tarih DESC, o.sira DESC, r.id DESC`,
    [kullaniciId]
  );
  return satirlar.map((s) => ({ ...s, iptal_edilebilir: Boolean(s.iptal_edilebilir) }));
}

module.exports = { yap, iptal, listele };
