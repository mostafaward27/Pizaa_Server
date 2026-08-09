import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initSocket } from './socket';

import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import branchRoutes from './routes/branches';
import offerRoutes from './routes/offers';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Allowed origins in production
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// REST API Routes
app.use(['/api/products', '/products'], productRoutes);
app.use(['/api/categories', '/categories'], categoryRoutes);
app.use(['/api/branches', '/branches'], branchRoutes);
app.use(['/api/offers', '/offers'], offerRoutes);
app.use(['/api/orders', '/orders'], orderRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);

// Health Check Endpoint
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({
    status: 'ok',
    brand: 'ALFRIDO PIZZA Production API',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// One-click Database Seed Endpoint
app.get(['/api/seed', '/seed'], async (_req, res) => {
  try {
    const { runSeed } = await import('./seed');
    await runSeed();
    res.json({ status: 'success', message: 'Database successfully seeded with demo products, categories, branches, offers, and orders!' });
  } catch (error: any) {
    console.error('API Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed database', details: error.message });
  }
});

// Locate client build directory flexibly for production
const clientDistCandidates = [
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), './client/dist'),
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
];

let clientDistPath = clientDistCandidates.find((p) => fs.existsSync(p)) || clientDistCandidates[0];

console.log(`📁 Static files path resolved: ${clientDistPath}`);
app.use(express.static(clientDistPath));

// Root Landing Endpoint
app.get('/', (_req, res) => {
  res.json({
    message: '🍕 ALFRIDO PIZZA Backend API is running live!',
    status: 'active',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      categories: '/api/categories',
      branches: '/api/branches',
      offers: '/api/offers',
      orders: '/api/orders',
      seed: '/api/seed',
    },
    note: 'The React Frontend is hosted in its separate repository and Vercel project.',
  });
});

const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 ALFRIDO PIZZA Production Server running on port ${PORT}`);
    console.log(`📡 Realtime Socket.IO active`);
    console.log(`🌐 Serving Client Web App from: ${clientDistPath}`);
  });
}

module.exports = app;
module.exports.default = app;
export default app;


