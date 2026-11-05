// Reviews API (MongoDB) — NoSQL Injection, Stored XSS
const express = require('express');
const router = express.Router();

// GET /api/v1/reviews/:productId — NoSQL Injection via query params
router.get('/:productId', async (req, res) => {
  try {
    const { getDb } = require('../config/mongodb');
    const db = getDb();

    // VULNERABLE: NoSQL Injection — query params passed to find()
    // If rating is sent as {"$gt": 0}, it becomes a MongoDB operator
    const filter = { productId: req.params.productId };

    if (req.query.rating) filter.rating = req.query.rating;
    if (req.query.username) filter.username = req.query.username;

    const reviews = await db.collection('reviews')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit) || 50)
      .toArray();

    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/reviews — Stored XSS via review content
router.post('/', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const { getDb } = require('../config/mongodb');
    const db = getDb();

    // VULNERABLE: Stored XSS — all fields stored raw
    const review = {
      productId: req.body.productId,
      userId: req.session.userId,
      username: req.session.username,
      rating: parseInt(req.body.rating) || 5,
      title: req.body.title,     // Raw HTML allowed
      comment: req.body.comment, // Raw HTML/JS stored
      createdAt: new Date().toISOString()
    };

    await db.collection('reviews').insertOne(review);
    res.json({ success: true, message: 'Review posted', review });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/reviews/search — NoSQL Injection via $where
router.get('/search/query', async (req, res) => {
  try {
    const { getDb } = require('../config/mongodb');
    const db = getDb();

    const searchTerm = req.query.q || '';

    // VULNERABLE: NoSQL Injection via $where clause
    // The $where clause executes JavaScript on the server
    // Payload: q=1; return true  → returns all documents
    // Payload: q=1; sleep(5000)  → time-based blind injection
    const reviews = await db.collection('reviews')
      .find({
        $where: `this.comment.indexOf('${searchTerm}') !== -1 || this.title.indexOf('${searchTerm}') !== -1`
      })
      .limit(50)
      .toArray();

    res.json({ success: true, reviews, query: searchTerm });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
