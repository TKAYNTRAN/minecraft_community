const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Configure Supabase for storage
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configure multer for memory storage (for Supabase upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Helper function to upload image to Supabase Storage
const uploadToSupabase = async (buffer, filename) => {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'post-images';
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(`${Date.now()}-${filename}`, buffer, {
      contentType: 'image/jpeg',
      upsert: false
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
  
  return publicUrl;
};

// Get all posts with filters and sorting (only public posts)
router.get('/', async (req, res) => {
  try {
    const { version, tags, sortBy = 'created_at', page = 1, limit = 10 } = req.query;
    
    let query = `
      SELECT p.*, u.username, 
             COUNT(DISTINCT l.id) as like_count,
             ARRAY_AGG(DISTINCT t.name) as tags,
             ARRAY_AGG(DISTINCT pi.image_url) as images
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
    `;
    
    const conditions = ['p.visibility = $1'];
    const params = ['public'];
    let paramCount = 2;

    if (version) {
      conditions.push(`p.version = $${paramCount}`);
      params.push(version);
      paramCount++;
    }

    if (tags) {
      const tagArray = tags.split(',');
      conditions.push(`EXISTS (
        SELECT 1 FROM post_tags pt2 
        JOIN tags t2 ON pt2.tag_id = t2.id 
        WHERE pt2.post_id = p.id AND t2.name = ANY($${paramCount})
      )`);
      params.push(tagArray);
      paramCount++;
    }

    query += ' WHERE ' + conditions.join(' AND ');
    query += ` GROUP BY p.id, u.username`;
    
    if (sortBy === 'likes') {
      query += ' ORDER BY like_count DESC';
    } else if (sortBy === 'date') {
      query += ' ORDER BY p.created_at DESC';
    }

    const offset = (page - 1) * limit;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending reports count (admin only)
router.get('/reports/count', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM reports WHERE status = $1',
      ['pending']
    );

    res.json({ count: result.rows[0].count });
  } catch (error) {
    console.error('Get reports count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username, 
             COUNT(DISTINCT l.id) as like_count,
             ARRAY_AGG(DISTINCT t.name) as tags,
             ARRAY_AGG(DISTINCT pi.image_url) as images
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
      WHERE p.id = $1
      GROUP BY p.id, u.username
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new post
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { version, seed, name, description, tags } = req.body;
    const userId = req.user.userId;
    
    // Validate tags (max 4)
    const tagArray = tags ? JSON.parse(tags) : [];
    if (tagArray.length > 4) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Maximum 4 tags allowed' });
    }

    // Insert post
    const postResult = await client.query(
      'INSERT INTO posts (user_id, version, seed, name, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, version, seed, name, description]
    );

    const postId = postResult.rows[0].id;

    // Insert images (upload to Supabase Storage)
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imageUrl = await uploadToSupabase(file.buffer, file.originalname);
        await client.query(
          'INSERT INTO post_images (post_id, image_url) VALUES ($1, $2)',
          [postId, imageUrl]
        );
      }
    }

    // Insert tags
    if (tagArray.length > 0) {
      for (const tagName of tagArray) {
        const tagResult = await client.query(
          'SELECT id FROM tags WHERE name = $1',
          [tagName]
        );
        
        if (tagResult.rows.length > 0) {
          await client.query(
            'INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2)',
            [postId, tagResult.rows[0].id]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ message: 'Post created successfully', postId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// Like/Unlike post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const postId = req.params.id;

    // Check if user owns the post
    const postResult = await pool.query(
      'SELECT user_id FROM posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (postResult.rows[0].user_id === userId) {
      return res.status(400).json({ message: 'You cannot like your own post' });
    }

    // Check if already liked
    const existingLike = await pool.query(
      'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    if (existingLike.rows.length > 0) {
      // Unlike
      await pool.query(
        'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );
      res.json({ message: 'Post unliked', liked: false });
    } else {
      // Like
      await pool.query(
        'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );
      res.json({ message: 'Post liked', liked: true });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tags
router.get('/tags/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tags ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's own posts
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (userId !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(`
      SELECT p.*, u.username, 
             COUNT(DISTINCT l.id) as like_count,
             ARRAY_AGG(DISTINCT t.name) as tags,
             ARRAY_AGG(DISTINCT pi.image_url) as images
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
      WHERE p.user_id = $1
      GROUP BY p.id, u.username
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update post visibility
router.patch('/:id/visibility', auth, async (req, res) => {
  try {
    const { visibility } = req.body;
    const postId = req.params.id;
    const userId = req.user.userId;

    // Check if user owns the post
    const postResult = await pool.query(
      'SELECT user_id FROM posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (postResult.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await pool.query(
      'UPDATE posts SET visibility = $1 WHERE id = $2',
      [visibility, postId]
    );

    res.json({ message: 'Visibility updated successfully' });
  } catch (error) {
    console.error('Update visibility error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete post (owner or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.userId;

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    const isAdmin = userResult.rows[0].role === 'admin';

    // Check if user owns the post (unless admin)
    if (!isAdmin) {
      const postResult = await pool.query(
        'SELECT user_id FROM posts WHERE id = $1',
        [postId]
      );

      if (postResult.rows.length === 0) {
        return res.status(404).json({ message: 'Post not found' });
      }

      if (postResult.rows[0].user_id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Report post
router.post('/:id/report', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const postId = req.params.id;
    const userId = req.user.userId;

    // Check if post exists
    const postResult = await pool.query(
      'SELECT id FROM posts WHERE id = $1',
      [postId]
    );

    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user already reported this post
    const existingReport = await pool.query(
      'SELECT id FROM reports WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({ message: 'You have already reported this post' });
    }

    await pool.query(
      'INSERT INTO reports (user_id, post_id, reason) VALUES ($1, $2, $3)',
      [userId, postId, reason]
    );

    res.json({ message: 'Post reported successfully' });
  } catch (error) {
    console.error('Report post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all reports (admin only)
router.get('/reports/all', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(`
      SELECT r.*, p.seed, p.name, p.version, u.username as reporter_username, 
             pu.username as post_author_username
      FROM reports r
      JOIN posts p ON r.post_id = p.id
      JOIN users u ON r.user_id = u.id
      JOIN users pu ON p.user_id = pu.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resolve report (admin only)
router.patch('/reports/:id/resolve', auth, async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.userId;

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await pool.query(
      'UPDATE reports SET status = $1 WHERE id = $2',
      ['resolved', reportId]
    );

    res.json({ message: 'Report resolved successfully' });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
