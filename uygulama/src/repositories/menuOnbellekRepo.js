// Veri katmanı: menü önbelleği (Redis).
//   Anahtar : menu:{yemekhane_id}:{tarih}:{ogun_id}
//   Süre    : o günün (menünün tarihinin) sonuna kadar
//   Silinme : yönetici o menüyü değiştirdiğinde
// Yalnızca kullanıcıdan bağımsız menü içeriği tutulur. Doluluk, rezervasyon durumu gibi
// anlık veriler önbelleğe ALINMAZ.
const redis = require('../redis');
const config = require('../config');

const anahtar = (yemekhaneId, tarih, ogunId) => `menu:${yemekhaneId}:${tarih}:${ogunId}`;
// "Az önce değişti" işareti. menu: önekini taşımaz, böylece menu:* listelerinde karışmaz.
const degisiklikAnahtari = (yemekhaneId, tarih, ogunId) => `menudegisti:${yemekhaneId}:${tarih}:${ogunId}`;

// Menü tarihinin gece yarısına (23:59:59) kalan saniye. Geçmiş bir tarihse en az 60 sn.
function gunSonunaSaniye(tarih) {
  const gunSonu = new Date(`${tarih}T23:59:59`); // container saat dilimi: Europe/Istanbul
  return Math.max(60, Math.ceil((gunSonu.getTime() - Date.now()) / 1000));
}

async function oku(yemekhaneId, tarih, ogunId) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  const metin = await redis.get(k);
  if (!metin) return null;
  const veri = JSON.parse(metin);
  // Eski yapıdaki (önceki sürümden kalan) kayıt kullanılmaz, silinir; menü veritabanından yeniden okunur.
  if (veri.onbellek_surumu !== config.menuOnbellekSurumu) {
    await redis.del(k);
    console.log(`[önbellek] ${k} eski yapıda -> Redis kaydı silindi`);
    return null;
  }
  return veri;
}

// Uygulama açılırken çalışır: menu:* anahtarlarından eski yapıdakileri siler.
// (menudegisti:* işaretleri bu desene girmez.) Silinen kayıt sayısını döndürür.
async function eskiKayitlariTemizle() {
  let silinen = 0;
  for await (const anahtarlar of redis.scanStream({ match: 'menu:*', count: 100 })) {
    for (const k of anahtarlar) {
      let eski = true;
      try {
        const veri = JSON.parse(await redis.get(k));
        eski = !veri || veri.onbellek_surumu !== config.menuOnbellekSurumu;
      } catch (err) { /* okunamayan kayıt da eski sayılır */ }
      if (eski) {
        await redis.del(k);
        silinen++;
      }
    }
  }
  console.log(`[önbellek] açılışta eski yapıdaki ${silinen} menü kaydı temizlendi`);
  return silinen;
}

async function yaz(yemekhaneId, tarih, ogunId, icerik) {
  await redis.set(anahtar(yemekhaneId, tarih, ogunId), JSON.stringify(icerik), 'EX', gunSonunaSaniye(tarih));
}

// Yönetici menüyü değiştirdi: önbellek kaydını sil ve kısa süreli "değişti" işareti bırak.
// İşaret, kaydı silmeden ÖNCE konur; böylece silmeden hemen sonra gelen bir istek de işareti görür.
async function gecersizlestir(yemekhaneId, tarih, ogunId) {
  const pencereMs = config.menuDegisiklikPenceresiMs;
  await redis
    .multi()
    .set(degisiklikAnahtari(yemekhaneId, tarih, ogunId), '1', 'PX', pencereMs)
    .del(anahtar(yemekhaneId, tarih, ogunId))
    .exec();
}

async function yakindaDegisti(yemekhaneId, tarih, ogunId) {
  return (await redis.exists(degisiklikAnahtari(yemekhaneId, tarih, ogunId))) === 1;
}

module.exports = { anahtar, oku, yaz, gecersizlestir, yakindaDegisti, eskiKayitlariTemizle };
