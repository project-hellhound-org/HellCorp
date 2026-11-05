// Redis configuration for session storage and caching
const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => {
  console.error('[CACHE] Redis error:', err.message);
});

redisClient.on('connect', () => {
  console.log('[CACHE] Redis connected successfully');
});

async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('[CACHE] Redis connection failed:', err.message);
    setTimeout(connectRedis, 5000);
  }
}

module.exports = { redisClient, connectRedis };
