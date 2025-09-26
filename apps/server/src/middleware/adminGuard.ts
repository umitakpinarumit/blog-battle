import { Request, Response, NextFunction } from 'express';

export function adminGuard(req: Request, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}


