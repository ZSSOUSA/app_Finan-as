const dns = require('dns');
const { Pool } = require('pg');
require('dotenv').config();

// Evita ENETUNREACH no Render: força IPv4 ao conectar ao Supabase
if (process.env.DATABASE_URL?.includes('supabase') || process.env.DB_HOST?.includes('supabase')) {
  dns.setDefaultResultOrder('ipv4first');
}

const isSupabase = process.env.DB_HOST?.includes('supabase') || process.env.DATABASE_URL?.includes('supabase');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'financaspro',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...(isSupabase && { ssl: { rejectUnauthorized: false } }),
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões:', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('Query executada:', { text: text.substring(0, 60), duration: `${duration}ms`, rows: res.rowCount });
  }
  return res;
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
