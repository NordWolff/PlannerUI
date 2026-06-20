import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

export function createNotification(userId, { title, message, type = 'info', meta = {} }) {
  const notification = {
    id: uuidv4(),
    userId,
    title,
    message,
    type,
    meta,
    read: false,
    createdAt: new Date().toISOString(),
  };
  store.notifications.push(notification);
  return notification;
}

// GET /api/notifications — eigene Benachrichtigungen
router.get('/', (req, res) => {
  const list = store.notifications
    .filter(n => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50);
  res.json(list);
});

// PUT /api/notifications/:id/read — einzelne als gelesen markieren
router.put('/:id/read', (req, res) => {
  const n = store.notifications.find(n => n.id === req.params.id && n.userId === req.user.id);
  if (!n) return res.status(404).json({ error: 'Nicht gefunden' });
  n.read = true;
  res.json(n);
});

// PUT /api/notifications/read-all — alle als gelesen markieren
router.put('/read-all', (req, res) => {
  store.notifications
    .filter(n => n.userId === req.user.id && !n.read)
    .forEach(n => { n.read = true; });
  res.json({ ok: true });
});

// DELETE /api/notifications/:id
router.delete('/:id', (req, res) => {
  const idx = store.notifications.findIndex(n => n.id === req.params.id && n.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Nicht gefunden' });
  store.notifications.splice(idx, 1);
  res.status(204).send();
});

export default router;
