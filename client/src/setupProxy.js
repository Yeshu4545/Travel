const { createProxyMiddleware } = require('http-proxy-middleware');

// Local Node server (npm start in /server). Override in .env.development.local for EC2.
const target = process.env.REACT_APP_PROXY_TARGET || 'http://127.0.0.1:5000';

module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'debug',
      onError(err, req, res) {
        console.error('[proxy]', target, err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: `Backend not reachable at ${target}. Start the server: cd server && npm start`,
              details: err.message,
            })
          );
        }
      },
    })
  );
};
