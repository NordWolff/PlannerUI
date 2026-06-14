import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

const VALID_TYPES = ['bug', 'feature'];
const VALID_STATUSES = ['open', 'in_progress', 'done', 'rejected'];

router.post('/', (req, res) => {
  const { title, description, type } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const request = {
    id: uuidv4(),
    title,
    description: description || '',
    type: VALID_TYPES.includes(type) ? type : 'feature',
    status: 'open',
    submittedBy: req.user.id,
    adminNote: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.adminRequests.push(request);
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
