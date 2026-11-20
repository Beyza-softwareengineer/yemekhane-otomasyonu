// Redis bağlantısı (ioredis). Oturum ve menü önbelleği aynı bağlantıyı kullanır.
const Redis = require('ioredis');
const config = require('./config');

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: 2,   // Redis kapalıysa istek sonsuza kadar beklemesin
  retryStrategy: (deneme) => Math.min(deneme * 200, 2000),
});

redis.on('error', (err) => console.error(`[redis] bağlantı hatası: ${err.message}`));
redis.on('ready', () => console.log('[redis] bağlantı hazır'));

module.exports = redis;
