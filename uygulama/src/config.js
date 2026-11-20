// Tüm ayarlar ortam değişkenlerinden okunur (docker-compose.yml içinde tanımlıdır).
const env = process.env;

module.exports = {
  port: Number(env.PORT || 8000),
  db: {
    yazmaHost: env.DB_YAZMA_HOST || 'localhost',
    okumaHost: env.DB_OKUMA_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    adi: env.DB_ADI || 'yemekhane',
    kullanici: env.DB_KULLANICI || 'yemekhane_app',
    sifre: env.DB_SIFRE || '',
  },
  redis: {
    host: env.REDIS_HOST || 'localhost',
    port: Number(env.REDIS_PORT || 6379),
  },
  oturum: {
    cerezAdi: 'oturum',
    sureSaniye: 30 * 60, // 30 dakika, her istekte yenilenir
  },
  // Kendi yazdığımız veriyi hemen görebilmek için: yazmadan sonra bu süre boyunca
  // okumalar kaynak sunucuya gider (replikasyon gecikmesine karşı).
  yazdiktanSonraKaynakMs: 3000,
  // Yönetici bir menüyü değiştirdikten sonra bu süre boyunca menü önbelleği kaynaktan doldurulur.
  // Böylece replikasyon gecikmesi yüzünden eski içerik tekrar önbelleğe yazılmaz.
  menuDegisiklikPenceresiMs: 5000,
};
