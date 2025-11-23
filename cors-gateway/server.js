// Minimal API Gateway to bypass CORS by proxying frontend requests to backend
// Usage envs:
// - TARGET_URL: the real backend base URL (e.g. https://ichiban-backend-...run.app)
// - FRONTEND_ORIGIN: the allowed browser origin (e.g. https://ichiban-frontend-...run.app)

const express = require('express');
const cors = require('cors');
const proxy = require('express-http-proxy');

const app = express();
const PORT = process.env.PORT || 8080;
const TARGET = process.env.TARGET_URL || 'https://ichiban-backend-510223165951.us-central1.run.app';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://ichiban-frontend-248630813908.us-central1.run.app';

// Absolute safeguard: set CORS headers for every request from the allowed origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin === FRONTEND_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
  }
  next();
});

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}));

// Preflight response
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

// Health endpoints BEFORE proxy so they are not intercepted
app.get('/', (req, res) => res.status(200).send('gateway ok'));
app.get('/healthz', (req, res) => res.status(200).send('ok'));
app.get('/api/healthz', (req, res) => res.status(200).send('ok'));

// Proxy /api/* to TARGET/api/v1/* with express-http-proxy for robust header control
app.use('/api', (req, res, next) => {
  const local = req.url.startsWith('/') ? req.url : ('/' + req.url);
  req._upstreamPath = local.startsWith('/api/v1') ? local : (local === '/' ? '/api/v1' : '/api/v1' + local);
  next();
}, proxy(TARGET, {
  https: true,
  timeout: 15000,
  proxyReqPathResolver: (req) => {
    console.log(`[proxy] ${req.method} ${req.originalUrl} -> ${TARGET}${req._upstreamPath}`);
    return req._upstreamPath;
  },
  // Parse and forward request bodies (JSON form) and let proxy set Content-Length
  parseReqBody: true,
  reqBodyEncoding: null,
  proxyReqBodyDecorator: (bodyContent, srcReq) => {
    const ct = srcReq.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      if (Buffer.isBuffer(bodyContent)) {
        return bodyContent.toString('utf8');
      }
      if (typeof bodyContent === 'string') return bodyContent;
      try { return JSON.stringify(bodyContent); } catch { return bodyContent; }
    }
    return bodyContent;
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    // Remove any existing content-length and let the proxy recompute
    if (proxyReqOpts.headers) {
      delete proxyReqOpts.headers['content-length'];
      // Ensure JSON Content-Type is preserved
      if (srcReq.headers['content-type']) {
        proxyReqOpts.headers['content-type'] = srcReq.headers['content-type'];
      }
      // For empty-body POST/PUT/PATCH, explicitly set Content-Length: 0 to satisfy Google Frontend
      const m = (srcReq.method || '').toUpperCase();
      const mayHaveBody = m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
      const hasLen = srcReq.headers['content-length'] !== undefined && srcReq.headers['content-length'] !== null;
      const te = (srcReq.headers['transfer-encoding'] || '').toLowerCase();
      if (mayHaveBody && !hasLen && !te) {
        proxyReqOpts.headers['content-length'] = '0';
      }
    }
    return proxyReqOpts;
  },
  proxyErrorHandler: (err, res, next) => {
    try {
      if (!res.headersSent) {
        res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Vary', 'Origin');
      }
      res.status(502).send('bad gateway');
    } catch (_) {}
    console.error('[proxy] error:', err?.message || err);
  },
  userResHeaderDecorator: (headers, userReq, userRes, proxyReq, proxyRes) => {
    const out = { ...headers };
    Object.keys(out).forEach((k) => { if (k.toLowerCase().startsWith('access-control-')) delete out[k]; });
    out['Access-Control-Allow-Origin'] = FRONTEND_ORIGIN;
    out['Access-Control-Allow-Credentials'] = 'true';
    out['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
    out['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    out['Vary'] = 'Origin';
    return out;
  }
}));

app.listen(PORT, () => console.log(`Gateway listening on ${PORT}. target=${TARGET}`));
