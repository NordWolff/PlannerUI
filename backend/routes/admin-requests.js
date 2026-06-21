import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import multer from 'multer';
import { store } from '../data/store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();
router.use(authenticateToken);

const VALID_TYPES = ['bug', 'feature'];
const VALID_STATUSES = ['open', 'in_progress', 'done', 'rejected'];

const ALLOWED_MIME = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

router.post('/', upload.array('files', 5), (req, res) => {
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
  // (ticketId wird nach Ticket-Erstellung am Request gespeichert)
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

    // Hochgeladene Dateien als Attachments übernehmen
    const attachments = (req.files ?? []).map(f => ({
      id: uuidv4(),
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      url: `/uploads/${f.filename}`,
      uploadedBy: req.user.id,
      uploadedAt: now,
    }));

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
      attachments,
      history: [],
      createdAt: now,
      updatedAt: now,
    };

    store.tickets.push(ticket);

    // Rückverknüpfung: adminRequest → SUP-Ticket
    request.ticketId = ticket.id;
    request.ticketNumber = ticketNumber;

    // Alle System-Admins benachrichtigen
    const attachmentHint = attachments.length
      ? ` (${attachments.length} Anhang${attachments.length > 1 ? 'anhänge' : ''})`
      : '';
    store.users
      .filter(u => u.role === 'admin' && u.id !== req.user.id)
      .forEach(admin => {
        createNotification(admin.id, {
          title: 'Neue Support-Anfrage',
          message: `${submitter?.username ?? 'Unbekannt'} hat eine ${resolvedType === 'bug' ? 'Bug-Meldung' : 'Feature-Anfrage'} eingereicht: „${title}"${attachmentHint}`,
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
