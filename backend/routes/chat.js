import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/messages', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const before = req.query.before;

  let messages = store.messages;
  if (before) {
    messages = messages.filter((m) => m.createdAt < before);
  }

  const sorted = [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const sliced = sorted.slice(-limit);

  const enriched = sliced.map((msg) => {
    const author = store.users.find((u) => u.id === msg.authorId);
    return {
      ...msg,
      sender: author
        ? { id: author.id, username: author.username, avatar: author.avatar }
        : null,
    };
  });

  return res.json(enriched);
});

router.post('/messages', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const mentionMatches = [...text.matchAll(/@(\w+)/g)];
  const mentions = mentionMatches
    .map((m) => store.users.find((u) => u.username === m[1]))
    .filter(Boolean)
    .map((u) => u.id);

  const ticketRefMatches = [...text.matchAll(/#(\w+)/g)];
  const ticketRefs = ticketRefMatches
    .map((m) => store.tickets.find((t) => t.id.startsWith(m[1]) || t.id === m[1]))
    .filter(Boolean)
    .map((t) => t.id);

  const message = {
    id: uuidv4(),
    authorId: req.user.id,
    text,
    createdAt: new Date().toISOString(),
    mentions,
    ticketRefs,
  };

  store.messages.push(message);

  for (const ticketId of ticketRefs) {
    const ticket = store.tickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.chatRefs = ticket.chatRefs || [];
      ticket.chatRefs.push(message.id);
    }
  }

  return res.status(201).json(message);
});

export default router;
