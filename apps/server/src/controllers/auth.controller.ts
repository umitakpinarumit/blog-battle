import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { hashPassword, verifyPassword } from '../utils/password';
import { signJwt } from '../utils/jwt';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2),
});

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password, displayName } = parsed.data;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already in use' });
  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, displayName });
  const token = signJwt({ sub: String(user._id), email: user.email, role: user.role });
  return res.status(201).json({ token });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signJwt({ sub: String(user._id), email: user.email, role: user.role });
  return res.json({ token });
}

export async function me(req: Request, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await User.findById(userId).select('email displayName role level stats createdAt');
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}

export async function updateMe(req: Request, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { displayName } = req.body as { displayName?: string };
    const updates: Record<string, unknown> = {};
    if (typeof displayName === 'string' && displayName.trim().length >= 2) {
      updates.displayName = displayName.trim();
    }
    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('email displayName role level stats createdAt');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}


