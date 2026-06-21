import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';

const router = Router();
router.use(authenticateToken);

const VALID_STATUSES = ['draft', 'planned', 'in_progress', 'review', 'done'];
const VALID_TYPES = ['task', 'bug', 'feature', 'improvement', 'question', 'epic'];

const ALLOWED_MIME = [
  'image/png', 'image/jpeg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Dateityp nicht erlaubt'));
  },
});

router.get('/', (req, res) => {
  let tickets = store.tickets;

  if (req.query.plannerId) {
    const plannerProjectIds = store.projects
      .filter(p => p.plannerId === req.query.plannerId)
      .map(p => p.id);
    tickets = tickets.filter(t => plannerProjectIds.includes(t.projectId));
  }
  if (req.query.boardId) tickets = tickets.filter((t) => t.boardId === req.query.boardId);
  if (req.query.teamId) tickets = tickets.filter((t) => t.teamId === req.query.teamId);
  if (req.query.sprintId) tickets = tickets.filter((t) => t.sprintId === req.query.sprintId);
  if (req.query.projectId) tickets = tickets.filter((t) => t.projectId === req.query.projectId);
  if (req.query.assigneeId) tickets = tickets.filter((t) => t.assigneeId === req.query.assigneeId);
  if (req.query.myTickets === 'true') {
    const uid = req.user.id;
    tickets = tickets.filter(t => t.assigneeId === uid || t.createdBy === uid);
  }

  return res.json(tickets);
});

// Zuletzt erstellte oder bearbeitete Tickets des aktuellen Benutzers
router.get('/recent', (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const recent = store.tickets
    .filter((t) =>
      t.createdBy === userId ||
      t.assigneeId === userId ||
      (t.history || []).some((h) => h.changedBy === userId)
    )
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit);

  return res.json(recent);
});

router.post('/', (req, res) => {
  const { title, description, status, priority, type, assigneeId, projectId, boardId, sprintId, teamId, checklist, dependencies } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  // Planner-spezifischen Präfix ermitteln (Fallback: globale Einstellungen)
  let prefix = store.settings.ticketPrefix;
  let counter = store.settings.ticketCounter;
  let usePlanner = null;
  if (projectId) {
    const project = store.projects.find(p => p.id === projectId);
    if (project?.plannerId) {
      usePlanner = store.planners.find(pl => pl.id === project.plannerId);
      if (usePlanner?.ticketPrefix) {
        prefix = usePlanner.ticketPrefix;
        counter = usePlanner.ticketCounter ?? 1;
      }
    }
  }
  const ticketNumber = `${prefix}-${String(counter).padStart(4, '0')}`;
  if (usePlanner) {
    usePlanner.ticketCounter = (usePlanner.ticketCounter ?? 1) + 1;
  } else {
    store.settings.ticketCounter += 1;
  }

  const now = new Date().toISOString();
  const newTicket = {
    id: uuidv4(),
    ticketNumber,
    title,
    description: description || '',
    status: status || 'draft',
    priority: priority || 'medium',
    type: VALID_TYPES.includes(type) ? type : 'task',
    assigneeId: assigneeId || null,
    createdBy: req.user.id,
    projectId: projectId || null,
    boardId: boardId || null,
    sprintId: sprintId || null,
    teamId: teamId || null,
    checklist: checklist || [],
    dependencies: dependencies || [],
    attachments: [],
    history: [],
    createdAt: now,
    updatedAt: now,
  };

  store.tickets.push(newTicket);
  return res.status(201).json(newTicket);
});

router.get('/:id', (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  return res.json(ticket);
});

router.put('/:id', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const ticket = store.tickets[index];
  const { title, description, status, priority, type, assigneeId, projectId, boardId, sprintId, teamId, checklist, dependencies } = req.body;
  const now = new Date().toISOString();

  if (status && status !== ticket.status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    ticket.history.push({
      id: uuidv4(),
      changedAt: now,
      field: 'status',
      from: ticket.status,
      to: status,
      changedBy: req.user.id,
    });
    ticket.status = status;
  }

  if (title) ticket.title = title;
  if (description !== undefined) ticket.description = description;
  if (priority) ticket.priority = priority;
  if (type && VALID_TYPES.includes(type)) ticket.type = type;
  if (assigneeId !== undefined) ticket.assigneeId = assigneeId;
  if (projectId !== undefined) ticket.projectId = projectId;
  if (boardId !== undefined) ticket.boardId = boardId;
  if (sprintId !== undefined) ticket.sprintId = sprintId;
  if (teamId !== undefined) ticket.teamId = teamId;
  if (checklist !== undefined) ticket.checklist = checklist;
  if (dependencies !== undefined) ticket.dependencies = dependencies;

  ticket.updatedAt = now;
  store.tickets[index] = ticket;
  return res.json(ticket);
});

router.delete('/:id', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  store.tickets.splice(index, 1);
  return res.status(204).send();
});

router.put('/:id/status', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const ticket = store.tickets[index];
  const now = new Date().toISOString();

  if (status !== ticket.status) {
    ticket.history.push({
      id: uuidv4(),
      changedAt: now,
      field: 'status',
      from: ticket.status,
      to: status,
      changedBy: req.user.id,
    });
    ticket.status = status;
    ticket.updatedAt = now;
  }

  store.tickets[index] = ticket;
  return res.json(ticket);
});

router.post('/:id/checklist', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  const ticket = store.tickets[index];
  const newItem = { id: uuidv4(), text, done: false };
  ticket.checklist.push(newItem);
  ticket.updatedAt = new Date().toISOString();

  store.tickets[index] = ticket;
  return res.status(201).json(ticket);
});

router.put('/:id/checklist', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { itemId } = req.body;
  if (!itemId) {
    return res.status(400).json({ error: 'itemId is required' });
  }

  const ticket = store.tickets[index];
  const itemIndex = ticket.checklist.findIndex((c) => c.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  ticket.checklist[itemIndex].done = !ticket.checklist[itemIndex].done;
  ticket.updatedAt = new Date().toISOString();

  store.tickets[index] = ticket;
  return res.json(ticket);
});

router.get('/:id/history', (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  return res.json(ticket.history);
});

router.get('/:id/comments', (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const comments = (ticket.comments || []).map((c) => {
    const author = store.users.find((u) => u.id === c.authorId);
    return { ...c, author: author ? { id: author.id, username: author.username, avatar: author.avatar } : null };
  });
  return res.json(comments);
});

router.post('/:id/comments', (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const mentionMatches = [...text.matchAll(/@(\w+)/g)];
  const mentions = mentionMatches
    .map((m) => store.users.find((u) => u.username === m[1]))
    .filter(Boolean)
    .map((u) => u.id);

  const now = new Date().toISOString();
  const comment = { id: uuidv4(), ticketId: ticket.id, authorId: req.user.id, text, createdAt: now, mentions, reactions: [] };

  ticket.comments = ticket.comments || [];
  ticket.comments.push(comment);
  ticket.history.push({ id: uuidv4(), changedAt: now, field: 'comment', from: null, to: comment.id, changedBy: req.user.id });
  ticket.updatedAt = now;

  const author = store.users.find((u) => u.id === req.user.id);
  return res.status(201).json({ ...comment, author: author ? { id: author.id, username: author.username } : null });
});

const ALLOWED_REACTIONS = ['👍', '👎', '❤️'];

router.post('/:id/comments/:commentId/reactions', (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const comment = (ticket.comments || []).find((c) => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const { emoji } = req.body;
  if (!ALLOWED_REACTIONS.includes(emoji)) return res.status(400).json({ error: 'Invalid reaction' });

  comment.reactions = comment.reactions || [];
  const existing = comment.reactions.find((r) => r.emoji === emoji && r.userId === req.user.id);
  if (existing) {
    comment.reactions = comment.reactions.filter((r) => !(r.emoji === emoji && r.userId === req.user.id));
  } else {
    comment.reactions.push({ emoji, userId: req.user.id });
  }

  return res.json(comment.reactions);
});

router.get('/:id/attachments', (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  return res.json(ticket.attachments || []);
});

router.post('/:id/attachments', upload.single('file'), (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

  const attachment = {
    id: uuidv4(),
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`,
    uploadedBy: req.user.id,
    uploadedAt: new Date().toISOString(),
  };

  ticket.attachments = ticket.attachments || [];
  ticket.attachments.push(attachment);
  ticket.updatedAt = new Date().toISOString();

  return res.status(201).json(attachment);
});

router.delete('/:id/attachments/:attachmentId', (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const idx = (ticket.attachments || []).findIndex((a) => a.id === req.params.attachmentId);
  if (idx === -1) return res.status(404).json({ error: 'Attachment not found' });

  ticket.attachments.splice(idx, 1);
  ticket.updatedAt = new Date().toISOString();
  return res.json({ ok: true });
});

router.post('/:id/clone', (req, res) => {
  const original = store.tickets.find((t) => t.id === req.params.id);
  if (!original) return res.status(404).json({ error: 'Ticket not found' });

  let prefix = store.settings.ticketPrefix;
  let counter = store.settings.ticketCounter;
  const project = original.projectId ? store.projects.find(p => p.id === original.projectId) : null;
  const planner = project ? store.planners.find(p => p.id === project.plannerId) : null;
  if (planner?.ticketPrefix) {
    prefix = planner.ticketPrefix;
    counter = planner.ticketCounter ?? 1;
    planner.ticketCounter = counter + 1;
  } else {
    store.settings.ticketCounter += 1;
  }
  const ticketNumber = `${prefix}-${String(counter).padStart(4, '0')}`;

  const now = new Date().toISOString();
  const cloned = { ...original, id: uuidv4(), ticketNumber, title: original.title + ' (Kopie)', status: 'draft', createdBy: req.user.id, history: [], comments: [], chatRefs: [], createdAt: now, updatedAt: now };
  store.tickets.push(cloned);
  return res.status(201).json(cloned);
});

export default router;
