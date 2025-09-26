import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { connectToDatabase } from './lib/mongoose';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

async function start() {
  // DB bağlantısını başlat; başarısız olsa bile sunucu ayağa kalksın
  connectToDatabase()
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection failed:', err?.message || err));

  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});


