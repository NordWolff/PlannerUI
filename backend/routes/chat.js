import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// Alle Konversationspartner des eingeloggten Benutzers mit letzter Nachricht
router.get('/conversations', (req, res) => {
  const userId = req.user.id;

  const myMessages = store.messages.filter(
    (m) => m.recipientId && (m.authorId === userId || m.recipientId === userId)
  );

  const partnerIds = [...new Set(
    myMessages.map((m) => (m.authorId === userId ? m.recipientId : m.authorId))
  )];

  const conversations = partnerIds.map((partnerId) => {
    const conv = myMessages.filter(
      (m) =>
        (m.authorId === userId && m.recipientId === partnerId) ||
        (m.authorId === partnerId && m.recipientId === userId)
    );
    const last = conv.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const partner = store.users.find((u) => u.id === partnerId);
    return {
      partnerId,
      partner: partner ? { id: partner.id, username: partner.username } : null,
      lastMessage: last
        ? { text: last.text, createdAt: last.createdAt, isMine: last.authorId === userId }
        : null,
    };
  });

  return res.json(
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return b.lastMessage.createdAt.localeCompare(a.lastMessage.createdAt);
    })
  );
});

// Nachrichten einer Konversation zwischen mir und einem Partner
router.get('/messages', (req, res) => {
  const { partnerId } = req.query;
  if (!partnerId) return res.status(400).json({ error: 'partnerId required' });

  const userId = req.user.id;
  const conv = store.messages
    .filter(
      (m) =>
        m.recipientId &&
        ((m.authorId === userId && m.recipientId === partnerId) ||
          (m.authorId === partnerId && m.recipientId === userId))
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const enriched = conv.map((msg) => {
    const author = store.users.find((u) => u.id === msg.authorId);
    return {
      ...msg,
      sender: author ? { id: author.id, username: author.username } : null,
    };
  });

  return res.json(enriched);
});

// Direktnachricht senden
router.post('/messages', (req, res) => {
  const { text, recipientId } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  if (!recipientId) return res.status(400).json({ error: 'recipientId is required' });

  const recipient = store.users.find((u) => u.id === recipientId);
  if (!recipient) return res.status(404).json({ error: 'Empfänger nicht gefunden' });

  const mentionMatches = [...text.matchAll(/@(\w+)/g)];
  const mentions = mentionMatches
    .map((m) => store.users.find((u) => u.username === m[1]))
    .filter(Boolean)
    .map((u) => u.id);

  const ticketMatches = [...text.matchAll(/#([A-Z]+-\d+)/g)];
  const ticketRefs = ticketMatches
    .map((m) => store.tickets.find((t) => t.ticketNumber === m[1]))
    .filter(Boolean)
    .map((t) => ({ ticketId: t.id, ticketNumber: t.ticketNumber, title: t.title }));

  const now = new Date().toISOString();
  const message = {
    id: uuidv4(),
    authorId: req.user.id,
    recipientId,
    text,
    createdAt: now,
    mentions,
    ticketRefs,
  };

  store.messages.push(message);

  const sender = store.users.find((u) => u.id === req.user.id);
  return res.status(201).json({
    ...message,
    sender: sender ? { id: sender.id, username: sender.username } : null,
  });
});

export default router;
