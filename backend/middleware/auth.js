import jwt from 'jsonwebtoken';
import { store } from '../data/store.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = store.users.find((u) => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = { ...user };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Nur Administratoren dürfen diese Aktion ausführen' });
  }
  next();
}

export function requireAdminOrOwner(req, res, next) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Nur Admins und Owners dürfen diese Aktion ausführen' });
  }
  next();
}
