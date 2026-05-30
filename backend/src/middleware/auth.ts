import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fb-chatbot-super-secret-key-12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
    role: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }
    req.user = user as AuthenticatedRequest['user'];
    next();
  });
}
