// GraphQL endpoint — Introspection abuse, no depth limiting, no field auth
const express = require('express');
const router = express.Router();
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');
const { pool } = require('../config/database');

const schema = buildSchema(`
  type User {
    id: ID
    username: String
    email: String
    role: String
    nickname: String
    bio: String
    balance: Float
    privateKey: String
    passwordHash: String
    isVerified: Boolean
    address: String
    createdAt: String
    orders: [Order]
    messages: [Message]
  }

  type Product {
    id: ID
    productId: String
    name: String
    category: String
    tier: String
    price: Float
    description: String
    specs: String
    sellerId: Int
    seller: User
    reviews: [Review]
    isHidden: Boolean
  }

  type Order {
    id: ID
    orderId: String
    userId: Int
    total: Float
    status: String
    paymentMethod: String
    shippingAddress: String
    createdAt: String
    buyer: User
    items: [OrderItem]
  }

  type OrderItem {
    id: ID
    productId: Int
    quantity: Int
    price: Float
    product: Product
  }

  type Review {
    id: ID
    productId: String
    username: String
    rating: Int
    comment: String
    createdAt: String
  }

  type Message {
    id: ID
    senderId: Int
    recipientId: Int
    subject: String
    body: String
    isRead: Boolean
    createdAt: String
    sender: User
  }

  type SiteConfig {
    key: String
    value: String
  }

  type Query {
    user(id: ID, username: String): User
    users(search: String, role: String, limit: Int): [User]
    product(id: ID, productId: String): Product
    products(search: String, category: String, limit: Int): [Product]
    orders(userId: Int, status: String): [Order]
    messages(userId: Int): [Message]
    reviews(productId: String): [Review]
    siteConfig: [SiteConfig]
    secretConfig: String
    systemInfo: String
  }

  type Mutation {
    login(username: String!, password: String!): String
    updateUser(id: ID!, data: String!): User
    createReview(productId: String!, rating: Int!, comment: String!): Review
  }
`);

// Helper: promisified MySQL query
function dbQuery(sql) {
  return new Promise((resolve, reject) => {
    pool.query(sql, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

const rootValue = {
  // VULNERABLE: No authorization check — any user can query any user's data
  // VULNERABLE: Exposes privateKey and passwordHash fields
  user: async ({ id, username }) => {
    let query;
    if (id) {
      query = `SELECT * FROM users WHERE id = ${id}`;
    } else if (username) {
      // VULNERABLE: SQL Injection via username argument
      query = `SELECT * FROM users WHERE username = '${username}'`;
    } else {
      return null;
    }
    const results = await dbQuery(query);
    if (results.length === 0) return null;
    const u = results[0];
    return {
      id: u.id, username: u.username, email: u.email, role: u.role,
      nickname: u.nickname, bio: u.bio, balance: u.balance,
      privateKey: u.private_key,      // VULNERABLE: Sensitive field exposed
      passwordHash: u.password,       // VULNERABLE: Password hash exposed
      isVerified: u.is_verified, address: u.address,
      createdAt: u.created_at
    };
  },

  // VULNERABLE: SQL Injection in search parameter
  users: async ({ search, role, limit }) => {
    let query = `SELECT * FROM users WHERE 1=1`;
    if (search) query += ` AND (username LIKE '%${search}%' OR email LIKE '%${search}%')`;
    if (role) query += ` AND role = '${role}'`;
    query += ` LIMIT ${limit || 100}`;
    const results = await dbQuery(query);
    return results.map(u => ({
      id: u.id, username: u.username, email: u.email, role: u.role,
      nickname: u.nickname, balance: u.balance,
      privateKey: u.private_key, passwordHash: u.password,
      isVerified: u.is_verified, createdAt: u.created_at
    }));
  },

  product: async ({ id, productId }) => {
    let query;
    if (id) query = `SELECT * FROM products WHERE id = ${id}`;
    else query = `SELECT * FROM products WHERE product_id = '${productId}'`;
    const results = await dbQuery(query);
    if (results.length === 0) return null;
    const p = results[0];
    return {
      id: p.id, productId: p.product_id, name: p.name,
      category: p.category, tier: p.tier, price: p.price,
      description: p.description, specs: JSON.stringify(p.specs),
      sellerId: p.seller_id, isHidden: p.is_hidden
    };
  },

  products: async ({ search, category, limit }) => {
    let query = `SELECT * FROM products WHERE 1=1`;
    if (search) query += ` AND (name LIKE '%${search}%' OR description LIKE '%${search}%')`;
    if (category) query += ` AND category = '${category}'`;
    query += ` ORDER BY id DESC LIMIT ${limit || 100}`;
    const results = await dbQuery(query);
    return results.map(p => ({
      id: p.id, productId: p.product_id, name: p.name,
      category: p.category, tier: p.tier, price: p.price,
      description: p.description, specs: JSON.stringify(p.specs),
      sellerId: p.seller_id, isHidden: p.is_hidden
    }));
  },

  orders: async ({ userId, status }) => {
    let query = `SELECT * FROM orders WHERE 1=1`;
    if (userId) query += ` AND user_id = ${userId}`;
    if (status) query += ` AND status = '${status}'`;
    query += ` ORDER BY created_at DESC`;
    const results = await dbQuery(query);
    return results.map(o => ({
      id: o.id, orderId: o.order_id, userId: o.user_id,
      total: o.total, status: o.status, paymentMethod: o.payment_method,
      shippingAddress: o.shipping_address, createdAt: o.created_at
    }));
  },

  messages: async ({ userId }) => {
    const results = await dbQuery(`SELECT * FROM messages WHERE sender_id = ${userId} OR recipient_id = ${userId} ORDER BY created_at DESC`);
    return results.map(m => ({
      id: m.id, senderId: m.sender_id, recipientId: m.recipient_id,
      subject: m.subject, body: m.body, isRead: m.is_read, createdAt: m.created_at
    }));
  },

  reviews: async ({ productId }) => {
    try {
      const { getDb } = require('../config/mongodb');
      const db = getDb();
      return await db.collection('reviews').find({ productId }).sort({ createdAt: -1 }).toArray();
    } catch { return []; }
  },

  // VULNERABLE: Exposes all site configuration including secrets
  siteConfig: async () => {
    try {
      const { getDb } = require('../config/mongodb');
      const db = getDb();
      return await db.collection('site_config').find({}).toArray();
    } catch { return []; }
  },

  // VULNERABLE: Returns sensitive internal configuration
  secretConfig: () => {
    return JSON.stringify({
      jwtSecret: process.env.JWT_SECRET,
      dbPassword: process.env.DB_PASS,
      adminApiKey: process.env.ADMIN_API_KEY,
      awsKey: process.env.AWS_ACCESS_KEY_ID
    });
  },

  systemInfo: () => {
    return JSON.stringify({
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV
    });
  },

  // Mutations
  login: async ({ username, password }) => {
    const results = await dbQuery(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`);
    return results.length > 0 ? `token_${results[0].id}_${Date.now()}` : 'Authentication failed';
  },

  updateUser: async ({ id, data }) => {
    const parsed = JSON.parse(data);
    const setClauses = Object.entries(parsed).map(([k, v]) => `${k} = '${v}'`).join(', ');
    await dbQuery(`UPDATE users SET ${setClauses} WHERE id = ${id}`);
    const results = await dbQuery(`SELECT * FROM users WHERE id = ${id}`);
    const u = results[0];
    return { id: u.id, username: u.username, email: u.email, role: u.role };
  },

  createReview: async ({ productId, rating, comment }) => {
    try {
      const { getDb } = require('../config/mongodb');
      const db = getDb();
      const review = { productId, rating, comment, createdAt: new Date().toISOString() };
      await db.collection('reviews').insertOne(review);
      return review;
    } catch { return null; }
  }
};

// Mount GraphQL endpoint
// VULNERABLE: Introspection enabled, GraphiQL exposed, no depth limiting
router.use('/', graphqlHTTP({
  schema,
  rootValue,
  graphiql: true,   // GraphiQL IDE exposed — allows interactive query building
  // NO validation rules — no depth limiting, no complexity analysis
  customFormatErrorFn: (error) => ({
    message: error.message,
    locations: error.locations,
    stack: error.stack,  // VULNERABLE: Stack traces in error responses
    path: error.path
  })
}));

module.exports = router;
