import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import authRoutes from './routes/auth.routes';
import postRoutes from './routes/post.routes';
import matchRoutes from './routes/match.routes';
import voteRoutes from './routes/vote.routes';
import userRoutes from './routes/user.routes';
import notificationRoutes from './routes/notification.routes';
import tournamentRoutes from './routes/tournament.routes';
import categoryRoutes from './routes/category.routes';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/matches', matchRoutes);
app.use('/votes', voteRoutes);
app.use('/users', userRoutes);
app.use('/notifications', notificationRoutes);
app.use('/tournaments', tournamentRoutes);
app.use('/categories', categoryRoutes);

export default app;

