// Minimal API Gateway to bypass CORS by proxying frontend requests to backend
// Usage envs:
// - TARGET_URL: the real backend base URL (e.g. https://ichiban-backend-...run.app)
// - FRONTEND_ORIGIN: the allowed browser origin (e.g. https://ichiban-frontend-...run.app)

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;
const TARGET = process.env.TARGET_URL || 'https://ichiban-backend-510223165951.us-central1.run.app';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://ichiban-frontend-248630813908.us-central1.run.app';

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// Preflight response
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// Proxy /api/* to TARGET, stripping the /api prefix
app.use('/api', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  xfwd: true,
  cookieDomainRewrite: '', // keep cookies on current domain if backend sets domain
  // Remove the /api prefix when forwarding: /api/foo -> TARGET/foo
  pathRewrite: { '^/api': '' },
}));

// Simple health endpoints
app.get('/', (req, res) => res.status(200).send('gateway ok'));
app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.get('/api/healthz', (req, res) => res.status(200).send('ok'));

app.listen(PORT, () => console.log(`Gateway listening on ${PORT}. target=${TARGET}`));
