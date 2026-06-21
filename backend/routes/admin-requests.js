import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();
router.use(authenticateToken);

const VALID_TYPES = ['bug', 'feature'];
const VALID_STATUSES = ['open', 'in_progress', 'done', 'rejected'];

router.post('/', (req, res) => {
  const { title, description, type } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const resolvedType = VALID_TYPES.includes(type) ? type : 'feature';
  const now = new Date().toISOString();

  const request = {
    id: uuidv4(),
    title,
    description: description || '',
    type: resolvedType,
    status: 'open',
    submittedBy: req.user.id,
    adminNote: '',
    createdAt: now,
    updatedAt: now,
  };

  store.adminRequests.push(request);

  // Ticket im System-Support Planner anlegen
  const supportPlanner = store.planners.find(p => p.isSystemSupport);
  if (supportPlanner) {
    const supportProject = store.projects.find(p => p.plannerId === supportPlanner.id);
    const submitter = store.users.find(u => u.id === req.user.id);

    const prefix = supportPlanner.ticketPrefix ?? 'SUP';
    const counter = supportPlanner.ticketCounter ?? 1;
    const ticketNumber = `${prefix}-${String(counter).padStart(4, '0')}`;
    supportPlanner.ticketCounter = counter + 1;

    const submitterInfo = submitter
      ? `${submitter.username} (${submitter.email})`
      : 'Unbekannt';
    const ticketDescription = description
      ? `${description}\n\n---\n*Eingereicht von: ${submitterInfo}*`
      : `*Eingereicht von: ${submitterInfo}*`;

    const ticket = {
      id: uuidv4(),
      ticketNumber,
      title: `[${resolvedType === 'bug' ? 'Bug' : 'Feature'}] ${title}`,
      description: ticketDescription,
      status: 'planned',
      priority: resolvedType === 'bug' ? 'high' : 'medium',
      type: resolvedType,
      assigneeId: null,
      createdBy: req.user.id,
      projectId: supportProject?.id ?? null,
      boardId: null,
      sprintId: null,
      teamId: null,
      checklist: [],
      dependencies: [],
      attachments: [],
      history: [],
      createdAt: now,
      updatedAt: now,
    };

    store.tickets.push(ticket);

    // Alle System-Admins über die neue Anfrage benachrichtigen
    store.users
      .filter(u => u.role === 'admin' && u.id !== req.user.id)
      .forEach(admin => {
        createNotification(admin.id, {
          title: 'Neue Support-Anfrage',
          message: `${submitter?.username ?? 'Unbekannt'} hat eine ${resolvedType === 'bug' ? 'Bug-Meldung' : 'Feature-Anfrage'} eingereicht: „${title}"`,
          type: 'info',
          meta: { ticketId: ticket.id, requestId: request.id, ticketNumber },
        });
      });
  }

  return res.status(201).json(request);
});

router.get('/', requireAdmin, (req, res) => {
  const requests = store.adminRequests.map((r) => {
    const user = store.users.find((u) => u.id === r.submittedBy);
    return {
      ...r,
      submittedByUser: user ? { id: user.id, username: user.username, email: user.email } : null,
    };
  });
  return res.json(requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.put('/:id', requireAdmin, (req, res) => {
  const entry = store.adminRequests.find((r) => r.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Request not found' });

  const { status, adminNote } = req.body;
  if (status && VALID_STATUSES.includes(status)) entry.status = status;
  if (adminNote !== undefined) entry.adminNote = adminNote;
  entry.updatedAt = new Date().toISOString();

  const user = store.users.find((u) => u.id === entry.submittedBy);
  return res.json({ ...entry, submittedByUser: user ? { id: user.id, username: user.username, email: user.email } : null });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const idx = store.adminRequests.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Request not found' });
  store.adminRequests.splice(idx, 1);
  return res.json({ ok: true });
});

export default router;
