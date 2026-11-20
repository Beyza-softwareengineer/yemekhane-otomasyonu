const { yazma } = require('../db');

// Değerlendirilebilecek menüler: kullanıcının KULLANDIĞI ve henüz oy vermediği menüler.
async function bekleyenler(havuz, kullaniciId) {
  const [satirlar] = await havuz.query(
    `SELECT m.id AS menu_id, m.tarih, o.ad AS ogun, yh.ad AS yemekhane
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
      WHERE r.kullanici_id = ? AND r.durum = 'kullanildi'
        AND NOT EXISTS (SELECT 1 FROM degerlendirmeler d
                         WHERE d.kullanici_id = r.kullanici_id AND d.menu_id = r.menu_id)
      ORDER BY m.tarih DESC, o.sira DESC`,
    [kullaniciId]
  );
  return satirlar;
}

async function benimkiler(havuz, kullaniciId) {
  const [satirlar] = await havuz.query(
    `SELECT d.menu_id, d.puan, d.yorum, d.olusturma, m.tarih, o.ad AS ogun, yh.ad AS yemekhane
       FROM degerlendirmeler d
       JOIN menuler m       ON m.id  = d.menu_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
      WHERE d.kullanici_id = ?
      ORDER BY d.olusturma DESC`,
    [kullaniciId]
  );
  return satirlar;
}

// "Yalnızca kullanılmış menü değerlendirilir" kuralı uygulamaya aittir (şemada yok).
// INSERT ... SELECT tek ifadede hem kuralı hem kaydı yapar: kullanılmış rezervasyon
// yoksa hiçbir satır eklenmez (affectedRows = 0).
// Dönüş: 'eklendi' | 'kullanilmamis' | 'tekrar'
async function ekle(kullaniciId, menuId, puan, yorum) {
  try {
    const [sonuc] = await yazma.query(
      `INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum)
       SELECT r.kullanici_id, r.menu_id, ?, ?
         FROM rezervasyonlar r
        WHERE r.kullanici_id = ? AND r.menu_id = ? AND r.durum = 'kullanildi'`,
      [puan, yorum, kullaniciId, menuId]
    );
    return sonuc.affectedRows === 1 ? 'eklendi' : 'kullanilmamis';
  } catch (err) {
    if (err.errno === 1062) return 'tekrar'; // kişi başına menü başına tek oy
    throw err;
  }
}

module.exports = { bekleyenler, benimkiler, ekle };
