// Veri katmanı: kullanıcı ve bakiye. SQL yalnızca bu klasörde bulunur.
const { yazma, okuma } = require('../db');

async function epostaIleBul(eposta) {
  const [satirlar] = await okuma.query(
    'SELECT id, ad, soyad, eposta, sifre_hash, rol, aktif FROM kullanicilar WHERE eposta = ?',
    [eposta]
  );
  return satirlar[0] || null;
}

// Bakiye para ile ilgili olduğu için her zaman KAYNAKTAN okunur (replika geride kalabilir).
async function bakiyeOku(kullaniciId) {
  const [satirlar] = await yazma.query('SELECT bakiye FROM kullanicilar WHERE id = ?', [kullaniciId]);
  return satirlar[0] ? satirlar[0].bakiye : null;
}

// Para hareketi yeniden SQL ile yazılmaz: stored procedure çağrılır (kaynakta).
async function bakiyeYukle(kullaniciId, tutar) {
  const [sonuc] = await yazma.query('CALL sp_bakiye_yukle(?, ?)', [kullaniciId, tutar]);
  return sonuc[0][0]; // { hareket_id, bakiye }
}

async function hareketler(havuz, kullaniciId, limit = 50) {
  const [satirlar] = await havuz.query(
    `SELECT id, tur, tutar, aciklama, olusturma
       FROM bakiye_hareketleri
      WHERE kullanici_id = ?
      ORDER BY olusturma DESC, id DESC
      LIMIT ?`,
    [kullaniciId, limit]
  );
  return satirlar;
}

module.exports = { epostaIleBul, bakiyeOku, bakiyeYukle, hareketler };
