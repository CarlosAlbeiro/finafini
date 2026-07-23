const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

let isPostgres = false;
let pool = null;
let sqliteDb = null;

if (connectionString) {
  isPostgres = true;
  pool = new Pool({
    connectionString,
    ssl: false
  });
  console.log('🔗 Configurada conexión a PostgreSQL finafini.');
} else {
  const dbPath = path.resolve(__dirname, '../../database.sqlite');
  sqliteDb = new sqlite3.Database(dbPath);
  console.log('📁 Configurada conexión a SQLite local.');
}

// Convertidor de consultas SQL de '?' a '$1, $2, $3...' para PostgreSQL
const convertSqlToPg = (sql) => {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
};

const initSchema = async () => {
  const initSql = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      password_hash VARCHAR(255) NOT NULL,
      default_currency VARCHAR(10) DEFAULT 'COP',
      avatar_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS debts (
      id VARCHAR(100) PRIMARY KEY,
      creditor_id VARCHAR(100) NOT NULL,
      debtor_id VARCHAR(100),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      total_amount NUMERIC(14,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'COP',
      installments_count INTEGER DEFAULT 1,
      installment_amount NUMERIC(14,2) NOT NULL,
      interest_rate NUMERIC(5,2) DEFAULT 0,
      start_date DATE NOT NULL,
      due_day INTEGER,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS installments (
      id VARCHAR(100) PRIMARY KEY,
      debt_id VARCHAR(100) NOT NULL,
      number INTEGER NOT NULL,
      amount NUMERIC(14,2) NOT NULL,
      due_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      paid_amount NUMERIC(14,2) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(100) PRIMARY KEY,
      debt_id VARCHAR(100) NOT NULL,
      installment_id VARCHAR(100),
      amount NUMERIC(14,2) NOT NULL,
      paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      registered_by VARCHAR(100) NOT NULL,
      receipt_url TEXT,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS debt_participants (
      id VARCHAR(100) PRIMARY KEY,
      debt_id VARCHAR(100) NOT NULL,
      user_id VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL,
      invited_by VARCHAR(100) NOT NULL,
      accepted INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount NUMERIC(14,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'COP',
      date DATE NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      type VARCHAR(20) DEFAULT 'in_app',
      message TEXT NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) DEFAULT 'sent'
    );
  `;

  if (isPostgres) {
    try {
      await pool.query(initSql);
      await pool.query('ALTER TABLE debts ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5,2) DEFAULT 0;');
      // Corregir registros antiguos donde total_amount fue guardado con el interés incluido
      await pool.query(`
        UPDATE debts 
        SET total_amount = ROUND(total_amount / (1 + (interest_rate / 100)), 2)
        WHERE interest_rate > 0 
          AND total_amount > 0 
          AND ABS(total_amount - (installment_amount * installments_count)) < 0.5;
      `);
      console.log('✅ Tablas y esquema de datos verificados exitosamente en PostgreSQL finafini.');
    } catch (err) {
      console.error('Error inicializando tablas en PostgreSQL:', err.message);
    }
  } else {
    sqliteDb.serialize(() => {
      sqliteDb.exec(initSql);
      sqliteDb.run('ALTER TABLE debts ADD COLUMN interest_rate REAL DEFAULT 0;', () => {});
      sqliteDb.run(`
        UPDATE debts 
        SET total_amount = ROUND(total_amount / (1 + (interest_rate / 100)), 2)
        WHERE interest_rate > 0 
          AND total_amount > 0 
          AND ABS(total_amount - (installment_amount * installments_count)) < 0.5;
      `, () => {});
    });
  }
};

initSchema();

// Métodos helpers agnósticos (PG / SQLite)
const query = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = convertSqlToPg(sql);
    const res = await pool.query(pgSql, params);
    return res.rows.map(row => {
      // Normalización de tipos numéricos para JavaScript si vienen de NUMERIC
      const formatted = { ...row };
      Object.keys(formatted).forEach(k => {
        if (typeof formatted[k] === 'string' && !isNaN(formatted[k]) && formatted[k].trim() !== '' && (k.includes('amount') || k.includes('paid') || k.includes('rate'))) {
          formatted[k] = parseFloat(formatted[k]);
        }
      });
      return formatted;
    });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

const get = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const run = async (sql, params = []) => {
  if (isPostgres) {
    const pgSql = convertSqlToPg(sql);
    const res = await pool.query(pgSql, params);
    return { changes: res.rowCount };
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

module.exports = {
  query,
  get,
  run,
  isPostgres
};
