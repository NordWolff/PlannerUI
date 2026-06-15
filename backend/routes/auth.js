import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { store, sanitizeUser, setUserOnline, setUserOffline } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }

    const existingUser = store.users.find(
      (u) => u.email === email || u.username === username
    );
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      username,
      email,
      passwordHash,
      avatar: null,
      language: 'de',
      theme: 'light',
      favorites: { teamId: null, projectId: null, boardId: null },
      createdAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    const token = generateToken(newUser.id);

    return res.status(201).json({ token, user: sanitizeUser(newUser) });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/login', (req, res) => {
  res.set('Allow', 'POST').status(405).json({ error: 'Use POST /api/auth/login with { email, password }' });
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = store.users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    setUserOnline(user.id);
    const token = generateToken(user.id);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  setUserOffline(req.user.id);
  return res.json({ ok: true });
});

router.post('/heartbeat', authenticateToken, (req, res) => {
  setUserOnline(req.user.id);
  return res.json({ ok: true });
});

router.get('/me', authenticateToken, (req, res) => {
  return res.json(sanitizeUser(req.user));
});

router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { username, email, password, avatar, language, theme } = req.body;
    const userIndex = store.users.findIndex((u) => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = store.users[userIndex];

    if (username) user.username = username;
    if (email) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;
    if (language) user.language = language;
    if (theme) user.theme = theme;
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    store.users[userIndex] = user;
    return res.json(sanitizeUser(user));
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me/privacy', authenticateToken, (req, res) => {
  const user = store.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (typeof req.body.privacyHideOnline === 'boolean') {
    user.privacyHideOnline = req.body.privacyHideOnline;
  }
  return res.json(sanitizeUser(user));
});

export default router;
