const express = require('express');
const config = require('./config');
const routes = require('./routes');
const hataYakala = require('./middleware/hataYakala');
const redis = require('./redis');
const menuOnbellekRepo = require('./repositories/menuOnbellekRepo');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

// İstek günlüğü
app.use((req, res, next) => {
  const baslangic = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - baslangic} ms)`);
  });
  next();
});

app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ hata: true, mesaj: 'Böyle bir adres yok.' }));
app.use(hataYakala);

const sunucu = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Uygulama ${config.port} portunda dinliyor.`);
  // Aşama 4: eski yapıdaki menü kayıtlarını Redis'ten temizle (uygulamayı engellemez)
  menuOnbellekRepo.eskiKayitlariTemizle().catch((err) => console.error(`[önbellek] açılış temizliği hatası: ${err.message}`));
});

function kapat() {
  sunucu.close(() => {
    redis.quit().finally(() => process.exit(0));
  });
}
process.on('SIGTERM', kapat);
process.on('SIGINT', kapat);
