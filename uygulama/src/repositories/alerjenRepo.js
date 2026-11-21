// Veri katmanı: alerjenler ve kullanıcının alerjen tercihleri (Aşama 4).
const { yazma } = require('../db');

async function tumu(havuz) {
  const [satirlar] = await havuz.query('SELECT id, ad FROM alerjenler ORDER BY ad');
  return satirlar;
}

async function kullaniciIdleri(havuz, kullaniciId) {
  const [satirlar] = await havuz.query('SELECT alerjen_id FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
  return satirlar.map((s) => s.alerjen_id);
}

// Kullanıcının alerjen listesini bütünüyle değiştirir (kaynakta, tek transaction).
async function kullaniciKaydet(kullaniciId, alerjenIdleri) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    await baglanti.query('DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
    if (alerjenIdleri.length > 0) {
      await baglanti.query('INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?', [
        alerjenIdleri.map((a) => [kullaniciId, a]),
      ]);
    }
    await baglanti.commit();
  } catch (err) {
    await baglanti.rollback();
    throw err;
  } finally {
    baglanti.release();
  }
}

module.exports = { tumu, kullaniciIdleri, kullaniciKaydet };
