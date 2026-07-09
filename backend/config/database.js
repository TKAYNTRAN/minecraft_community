const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

// Force DNS to use IPv4 only
dns.setDefaultResultOrder('ipv4first');

// Use connection string with IPv4 parameters
const pool = new Pool({
  connectionString: process.env.DATABASE_URL + '?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
