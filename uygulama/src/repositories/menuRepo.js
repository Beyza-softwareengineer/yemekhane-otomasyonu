// Veri katmanı: menüler. Hazır view'lar (v_menu_detay, v_menu_doluluk, v_menu_puan) kullanılır.
const { yazma } = require('../db');
const menuOnbellek = require('./menuOnbellekRepo');
const config = require('../config');

// Rol'e göre gösterilecek fiyat. (Ücreti asıl keser sp_rezervasyon_yap; bu yalnızca gösterim.)
function fiyatSec(rol, menu) {
  return rol === 'ogrenci' ? menu.ogrenci_fiyati : menu.personel_fiyati;
}

// Yarım porsiyon gösterim fiyatı. Oran NULL ise (kahvaltı) yarım porsiyon yoktur.
// (Ücreti asıl keser sp_rezervasyon_yap: ROUND(fiyat * oran, 2).)
function yarimFiyat(fiyat, oran) {
  if (oran === null || oran === undefined) return null;
  return Math.round(Math.round(fiyat * 100) * oran) / 100;
}

async function secimler(havuz) {
  const [yemekhaneler] = await havuz.query('SELECT id, ad, kapasite FROM yemekhaneler ORDER BY id');
  const [ogunler] = await havuz.query('SELECT id, ad, son_saat FROM ogunler ORDER BY sira');
  return { yemekhaneler, ogunler };
}

async function menuBul(havuz, yemekhaneId, tarih, ogunId) {
  const [satirlar] = await havuz.query(
    'SELECT id FROM menuler WHERE yemekhane_id = ? AND tarih = ? AND ogun_id = ?',
    [yemekhaneId, tarih, ogunId]
  );
  return satirlar[0] ? satirlar[0].id : null;
}

// Kullanıcıdan bağımsız menü içeriği (ileride Redis'te önbelleğe alınacak kısım).
// Yemekler kategori sırasıyla gelir, toplam kaloriyi uygulama toplar.
async function icerik(havuz, menuId) {
  const [satirlar] = await havuz.query(
    `SELECT menu_id, tarih, yemekhane_id, yemekhane, ogun_id, ogun, rezervasyon_son,
            ogrenci_fiyati, personel_fiyati,
            yemek_id, yemek, kategori, kalori, vejetaryen, yarim_porsiyon_orani
       FROM v_menu_detay
      WHERE menu_id = ?
      ORDER BY kategori_sira, yemek`,
    [menuId]
  );
  if (satirlar.length === 0) return null;
  const ilk = satirlar[0];

  // Yemeklerin alerjenleri (id + ad birlikte): kullanıcıya özel uyarı, kullanıcının alerjen id'leriyle eşleştirilerek yapılır.
  const [alerjenSatirlari] = await havuz.query(
    `SELECT ya.yemek_id, a.id, a.ad
       FROM menu_yemekleri my
       JOIN yemek_alerjenleri ya ON ya.yemek_id = my.yemek_id
       JOIN alerjenler a         ON a.id = ya.alerjen_id
      WHERE my.menu_id = ?
      ORDER BY a.ad`,
    [menuId]
  );
  const alerjenHaritasi = new Map();
  for (const s of alerjenSatirlari) {
    if (!alerjenHaritasi.has(s.yemek_id)) alerjenHaritasi.set(s.yemek_id, []);
    alerjenHaritasi.get(s.yemek_id).push({ id: s.id, ad: s.ad });
  }

  const yemekler = satirlar.map((s) => ({
    id: s.yemek_id,
    ad: s.yemek,
    kategori: s.kategori,
    kalori: s.kalori,
    vejetaryen: Boolean(s.vejetaryen),
    alerjenler: alerjenHaritasi.get(s.yemek_id) || [], // [{ id, ad }]
  }));
  return {
    id: ilk.menu_id,
    tarih: ilk.tarih,
    yemekhane_id: ilk.yemekhane_id,
    yemekhane: ilk.yemekhane,
    ogun_id: ilk.ogun_id,
    ogun: ilk.ogun,
    rezervasyon_son: ilk.rezervasyon_son,
    ogrenci_fiyati: ilk.ogrenci_fiyati,
    personel_fiyati: ilk.personel_fiyati,
    yarim_porsiyon_orani: ilk.yarim_porsiyon_orani, // null: bu öğünde yarım porsiyon yok
    onbellek_surumu: config.menuOnbellekSurumu,
    yemekler,
    toplam_kalori: yemekler.reduce((t, y) => t + y.kalori, 0),
    tamami_vejetaryen: yemekler.every((y) => y.vejetaryen),
  };
}

// Günün menüsü içeriği, önce Redis'e bakılır (Aşama 3).
//  - Önbellekte varsa: veritabanına hiç gidilmez.
//  - Yoksa: veritabanından okunur ve önbelleğe yazılır.
// Yönetici bu menüyü az önce değiştirdiyse okuma kaynaktan yapılır (replika henüz geride olabilir).
// Redis'e ulaşılamazsa önbellek atlanır, uygulama veritabanıyla çalışmaya devam eder.
async function onbellekliIcerik(okumaHavuzu, yemekhaneId, tarih, ogunId) {
  const anahtar = menuOnbellek.anahtar(yemekhaneId, tarih, ogunId);
  try {
    const onbellekte = await menuOnbellek.oku(yemekhaneId, tarih, ogunId);
    if (onbellekte) {
      console.log(`[önbellek] ${anahtar} VAR -> Redis'ten geldi`);
      return onbellekte;
    }
  } catch (err) {
    console.error(`[önbellek] okuma hatası, veritabanına geçiliyor: ${err.message}`);
  }

  let havuz = okumaHavuzu;
  let kaynakAdi = 'replika';
  try {
    if (await menuOnbellek.yakindaDegisti(yemekhaneId, tarih, ogunId)) {
      havuz = yazma;
      kaynakAdi = 'kaynak (menü az önce değişti)';
    }
  } catch (err) {
    console.error(`[önbellek] işaret kontrolü hatası: ${err.message}`);
  }

  const menuId = await menuBul(havuz, yemekhaneId, tarih, ogunId);
  if (!menuId) return null; // olmayan menü önbelleğe yazılmaz
  const icerikVerisi = await icerik(havuz, menuId);
  console.log(`[önbellek] ${anahtar} YOK -> veritabanından okundu (${kaynakAdi}), Redis'e yazılıyor`);
  try {
    await menuOnbellek.yaz(yemekhaneId, tarih, ogunId, icerikVerisi);
  } catch (err) {
    console.error(`[önbellek] yazma hatası: ${err.message}`);
  }
  return icerikVerisi;
}

// Anlık doluluk ve son saat (önbelleğe ALINMAZ). kapandi'yı veritabanı hesaplar.
async function doluluk(havuz, menuId) {
  const [satirlar] = await havuz.query(
    `SELECT kapasite, rezerve, bos_yer, doluluk_yuzde, rezervasyon_son,
            (NOW() >= rezervasyon_son) AS kapandi
       FROM v_menu_doluluk WHERE menu_id = ?`,
    [menuId]
  );
  const s = satirlar[0];
  return s ? { ...s, kapandi: Boolean(s.kapandi) } : null;
}

async function kullanicininRezervasyonu(havuz, kullaniciId, menuId) {
  const [satirlar] = await havuz.query(
    'SELECT id, durum FROM rezervasyonlar WHERE kullanici_id = ? AND menu_id = ?',
    [kullaniciId, menuId]
  );
  return satirlar[0] || null;
}

// Haftalık menü: başlangıç tarihinden itibaren 7 gün, seçili yemekhane.
async function haftalik(havuz, { yemekhaneId, baslangic, kullaniciId, rol }) {
  const [satirlar] = await havuz.query(
    `SELECT m.id AS menu_id, m.tarih, o.id AS ogun_id, o.ad AS ogun,
            d.kapasite, d.bos_yer, d.rezervasyon_son,
            (NOW() >= d.rezervasyon_son) AS kapandi,
            IF(? = 'ogrenci', m.ogrenci_fiyati, m.personel_fiyati) AS fiyat,
            ROUND(IF(? = 'ogrenci', m.ogrenci_fiyati, m.personel_fiyati) * o.yarim_porsiyon_orani, 2) AS yarim_fiyat,
            (SELECT GROUP_CONCAT(DISTINCT a.ad ORDER BY a.ad SEPARATOR ', ')
               FROM menu_yemekleri my
               JOIN yemek_alerjenleri ya       ON ya.yemek_id = my.yemek_id
               JOIN kullanici_alerjenleri ka   ON ka.alerjen_id = ya.alerjen_id AND ka.kullanici_id = ?
               JOIN alerjenler a               ON a.id = ya.alerjen_id
              WHERE my.menu_id = m.id) AS uyari_alerjenler,
            r.id AS rezervasyon_id, r.durum AS rezervasyon_durum, r.porsiyon AS rezervasyon_porsiyon,
            (SELECT GROUP_CONCAT(x.yemek ORDER BY x.kategori_sira, x.yemek SEPARATOR ', ')
               FROM v_menu_detay x WHERE x.menu_id = m.id) AS yemekler
       FROM menuler m
       JOIN ogunler o            ON o.id = m.ogun_id
       JOIN v_menu_doluluk d     ON d.menu_id = m.id
       LEFT JOIN rezervasyonlar r ON r.menu_id = m.id AND r.kullanici_id = ?
      WHERE m.yemekhane_id = ?
        AND m.tarih >= ? AND m.tarih < DATE_ADD(?, INTERVAL 7 DAY)
      ORDER BY m.tarih, o.sira`,
    [rol, rol, kullaniciId, kullaniciId, yemekhaneId, baslangic, baslangic]
  );
  return satirlar.map(({ uyari_alerjenler, ...s }) => ({
    ...s,
    kapandi: Boolean(s.kapandi),
    yarim_fiyat: s.yarim_fiyat === undefined ? null : s.yarim_fiyat, // null: yarım porsiyon yok
    uyari_alerjenleri: uyari_alerjenler ? uyari_alerjenler.split(', ') : [],
  }));
}

// ---------------------------------------------------------------------
// Yönetici: rapor ve menü yönetimi
// ---------------------------------------------------------------------

// Menü bazında doluluk ve ortalama puan (hazır view'lar birleştirilir).
async function rapor(havuz, { baslangic, bitis }) {
  const [satirlar] = await havuz.query(
    `SELECT d.menu_id, d.tarih, d.yemekhane_id, d.yemekhane, d.ogun_id, d.ogun,
            d.kapasite, d.rezerve, d.bos_yer, d.doluluk_yuzde,
            p.oy_sayisi, p.ortalama_puan
       FROM v_menu_doluluk d
       JOIN v_menu_puan p ON p.menu_id = d.menu_id
      WHERE d.tarih BETWEEN ? AND ?
      ORDER BY d.tarih DESC, d.ogun_id, d.yemekhane_id
      LIMIT 500`,
    [baslangic, bitis]
  );
  return satirlar;
}

async function tumYemekler(havuz) {
  const [satirlar] = await havuz.query(
    `SELECT y.id, y.ad, k.ad AS kategori, y.kalori
       FROM yemekler y JOIN yemek_kategorileri k ON k.id = y.kategori_id
      ORDER BY k.sira, y.ad`
  );
  return satirlar;
}

async function menuDuzenleme(havuz, menuId) {
  const [menuler] = await havuz.query(
    `SELECT id, yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati
       FROM menuler WHERE id = ?`,
    [menuId]
  );
  if (!menuler[0]) return null;
  const [yemekler] = await havuz.query('SELECT yemek_id FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
  return { ...menuler[0], yemek_idler: yemekler.map((y) => y.yemek_id) };
}

async function olustur({ yemekhaneId, tarih, ogunId, ogrenciFiyati, personelFiyati, yemekIdler }) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const [sonuc] = await baglanti.query(
      `INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati)
       VALUES (?, ?, ?, ?, ?)`,
      [yemekhaneId, tarih, ogunId, ogrenciFiyati, personelFiyati]
    );
    const menuId = sonuc.insertId;
    await baglanti.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [
      yemekIdler.map((y) => [menuId, y]),
    ]);
    await baglanti.commit();
    return menuId;
  } catch (err) {
    await baglanti.rollback();
    throw err;
  } finally {
    baglanti.release();
  }
}

// Fiyatları ve yemek listesini günceller. Yemekhane/tarih/öğün değişmez.
// Döndürdüğü nesne, önbellek anahtarını (Aşama 3) kurmak için gereken alanları içerir.
async function guncelle(menuId, { ogrenciFiyati, personelFiyati, yemekIdler }) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const [mevcut] = await baglanti.query(
      'SELECT yemekhane_id, tarih, ogun_id FROM menuler WHERE id = ? FOR UPDATE',
      [menuId]
    );
    if (!mevcut[0]) {
      await baglanti.rollback();
      return null;
    }
    await baglanti.query('UPDATE menuler SET ogrenci_fiyati = ?, personel_fiyati = ? WHERE id = ?', [
      ogrenciFiyati,
      personelFiyati,
      menuId,
    ]);
    await baglanti.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
    await baglanti.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [
      yemekIdler.map((y) => [menuId, y]),
    ]);
    await baglanti.commit();
    return { menuId, ...mevcut[0] };
  } catch (err) {
    await baglanti.rollback();
    throw err;
  } finally {
    baglanti.release();
  }
}

module.exports = {
  fiyatSec, yarimFiyat, secimler, menuBul, icerik, onbellekliIcerik, doluluk, kullanicininRezervasyonu, haftalik,
  rapor, tumYemekler, menuDuzenleme, olustur, guncelle,
};
