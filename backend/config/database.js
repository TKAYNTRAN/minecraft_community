const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

// Force DNS to use IPv4 only
dns.setDefaultResultOrder('ipv4first');

// Parse DATABASE_URL to force IPv4 connection
let poolConfig;

if (process.env.DATABASE_URL) {
  // Parse connection string and force IPv4
  const dbUrl = new URL(process.env.DATABASE_URL);
  poolConfig = {
    host: dbUrl.hostname,
    // Use Supabase connection pooling port (6543) instead of direct port (5432)
    port: 6543,
    database: dbUrl.pathname.slice(1), // Remove leading slash
    user: dbUrl.username,
    password: dbUrl.password,
    ssl: { rejectUnauthorized: false },
    // Force IPv4
    family: 4
  };
} else {
  poolConfig = {
    connectionString: process.env.DATABASE_URL
  };
}

const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('Connected to database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
