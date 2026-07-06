const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// Get user's liked posts
router.get('/:id/likes', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const result = await pool.query(`
      SELECT p.*, u.username, 
             COUNT(DISTINCT l.id) as like_count,
             ARRAY_AGG(DISTINCT t.name) as tags,
             ARRAY_AGG(DISTINCT pi.image_url) as images
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN likes l ON p.id = l.post_id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN post_images pi ON p.id = pi.post_id
      WHERE l.user_id = $1 AND (p.visibility = 'public' OR p.user_id = $1)
      GROUP BY p.id, u.username
      ORDER BY l.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get user likes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user liked a post
router.get('/:id/likes/:postId', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    const postId = req.params.postId;
    
    const result = await pool.query(
      'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    res.json({ liked: result.rows.length > 0 });
  } catch (error) {
    console.error('Check like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
