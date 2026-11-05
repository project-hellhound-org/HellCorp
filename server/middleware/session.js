// Session configuration
const session = require('express-session');
const RedisStore = require('connect-redis').default;

function setupSession(app, redisClient) {
  const store = new RedisStore({ client: redisClient });

  const sessionMiddleware = session({
    store: store,
    name: 'hellcorp_sid',
    secret: process.env.SESSION_SECRET || 's3ss10n_s3cr3t_d0_n0t_l34k',
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,    // Main session cookie is httpOnly
      secure: false,     // No HTTPS in dev — common misconfiguration
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  });

  app.use(sessionMiddleware);

  // VULNERABLE: Set a secondary cart_id cookie WITHOUT HttpOnly
  // This cookie can be stolen via XSS
  app.use((req, res, next) => {
    if (!req.cookies.cart_id) {
      const cartId = 'cart_' + Math.random().toString(36).substring(2, 15);
      // VULNERABLE: no httpOnly flag on this cookie
      res.cookie('cart_id', cartId, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }
    next();
  });

  return sessionMiddleware;
}

module.exports = setupSession;
