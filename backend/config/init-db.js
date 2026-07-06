const pool = require('./database');
const bcrypt = require('bcryptjs');

const initDB = async () => {
  try {
    // Users table with role
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add role column if it doesn't exist
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`);
    } catch (e) {
      // Column might already exist
    }

    // Posts table with visibility and name
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        version VARCHAR(20) NOT NULL,
        seed VARCHAR(100) NOT NULL,
        name VARCHAR(100),
        description TEXT,
        visibility VARCHAR(20) DEFAULT 'public',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add visibility column if it doesn't exist
    try {
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public'`);
    } catch (e) {
      // Column might already exist
    }

    // Add name column if it doesn't exist
    try {
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS name VARCHAR(100)`);
    } catch (e) {
      // Column might already exist
    }

    // Post images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_images (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        image_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tags table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      )
    `);

    // Post tags junction table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
      )
    `);

    // Likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `);

    // Reports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        reason VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default tags
    const defaultTags = [
      'Dungeon',
      'Stronghold',
      'Mansion',
      'Monument',
      'Pillager Outpost',
      'Mineshaft',
      'Ruined Portal',
      'Igloo',
      'Ravine',
      'Ancient City',
      'Village',
      'Trial Chamber'
    ];

    for (const tagName of defaultTags) {
      await pool.query(
        'INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [tagName]
      );
    }

    // Create or update admin account
    const adminEmail = 'admin@minecraft.com';
    const adminUsername = 'admin';
    const adminPassword = 'Admin@123';
    
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [adminEmail, adminUsername]
    );

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (existingAdmin.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)',
        [adminUsername, adminEmail, hashedPassword, 'admin']
      );
      console.log('Admin account created: admin@minecraft.com / Admin@123');
    } else {
      // Update existing admin account to ensure it has admin role and correct password
      await pool.query(
        'UPDATE users SET role = $1, password = $2 WHERE email = $3 OR username = $4',
        ['admin', hashedPassword, adminEmail, adminUsername]
      );
      console.log('Admin account updated: admin@minecraft.com / Admin@123');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initDB();
