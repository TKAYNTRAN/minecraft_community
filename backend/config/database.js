const { Pool } = require('pg');
require('dotenv').config();

// Parse DATABASE_URL to force IPv4 connection
let poolConfig;

if (process.env.DATABASE_URL) {
  // Parse connection string and force IPv4
  const dbUrl = new URL(process.env.DATABASE_URL);
  poolConfig = {
    host: dbUrl.hostname,
    port: dbUrl.port || 5432,
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
