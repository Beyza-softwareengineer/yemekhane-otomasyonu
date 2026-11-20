// İki bağlantı havuzu: yazma -> mysql-primary (kaynak), okuma -> mysql-replica.
// Veritabanı ile konuşan tek yer repositories/ klasörüdür; havuzlar buradan alınır.
const mysql = require('mysql2/promise');
const config = require('./config');

function havuzOlustur(host) {
  return mysql.createPool({
    host,
    port: config.db.port,
    user: config.db.kullanici,
    password: config.db.sifre,
    database: config.db.adi,
    charset: 'utf8mb4',
    timezone: '+03:00',
    dateStrings: true,     // DATE/DATETIME metin olarak gelir: "2026-11-19 10:00:00"
    decimalNumbers: true,  // DECIMAL alanları string yerine sayı gelir
    waitForConnections: true,
    connectionLimit: 10,
  });
}

const yazma = havuzOlustur(config.db.yazmaHost); // INSERT/UPDATE/CALL
const okuma = havuzOlustur(config.db.okumaHost); // SELECT (listeleme, rapor)

module.exports = { yazma, okuma };
