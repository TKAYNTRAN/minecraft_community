const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

// Render and some hosts cannot reach Supabase direct IPv6 endpoints (ENETUNREACH)
dns.setDefaultResultOrder('ipv4first');

function getPoolConfig() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const url = new URL(connectionString);

  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1) || 'postgres',
    ssl: { rejectUnauthorized: false },
    family: 4,
  };
}

const pool = new Pool(getPoolConfig());

// Test connection
pool.on('connect', () => {
  console.log('Connected to database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
