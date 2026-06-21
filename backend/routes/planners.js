import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { createNotification } from './notifications.js';

const router = Router();
router.use(authenticateToken);

function memberIds(planner) {
  return (planner.members ?? []).map(m => m.userId);
}

function enrich(planner) {
  return {
    ...planner,
    teamCount: store.teams.filter(t => t.plannerId === planner.id).length,
  };
}

function canManagePlanner(user, planner) {
  if (user.role === 'admin') return true
  if (planner.createdBy === user.id) return true
  const member = (planner.members ?? []).find(m => m.userId === user.id)
  return member?.role === 'admin'
}

// GET /api/planners — nur eigene Planner (Mitglied). ?all=true → Admin: alle.
router.get('/', (req, res) => {
  if (req.user.role === 'admin' && req.query.all === 'true') {
    return res.json(store.planners.map(enrich));
  }
  // System-Support Planner für Nicht-Admins grundsätzlich ausblenden
  return res.json(store.planners.filter(p =>
    memberIds(p).includes(req.user.id) &&
    (req.user.role === 'admin' || !p.isSystemSupport)
  ).map(enrich));
});

router.get('/:id', (req, res) => {
  const planner = store.planners.find(p => p.id === req.params.id);
  if (!planner) return res.status(404).json({ error: 'Planner not found' });
  if (req.user.role !== 'admin' && !memberIds(planner).includes(req.user.id)) {
    return res.status(403).json({ error: 'Zugriff verweigert' });
  }
  return res.json(enrich(planner));
});

// POST /api/planners — jeder angemeldete Nutzer darf einen eigenen Planner erstellen
router.post('/', (req, res) => {
  const { name, description, color, ticketPrefix } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const prefix = ticketPrefix
    ? String(ticketPrefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
    : name.trim().replace(/\s+/g, '').slice(0, 3).toUpperCase() || 'PLN';

  const newPlanner = {
    id: uuidv4(),
    name: name.trim(),
    description: description || '',
    color: color || '#E20074',
    members: [{ userId: req.user.id, role: 'admin' }],
    ticketPrefix: prefix,
    ticketCounter: 1,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
  };

  store.planners.push(newPlanner);
  return res.status(201).json(enrich(newPlanner));
});

// PUT /api/planners/:id — Admin oder Ersteller
router.put('/:id', (req, res) => {
  const planner = store.planners.find(p => p.id === req.params.id);
  if (!planner) return res.status(404).json({ error: 'Planner not found' });
  if (!canManagePlanner(req.user, planner)) return res.status(403).json({ error: 'Zugriff verweigert' });

  const { name, description, members, color, ticketPrefix } = req.body;
  if (name !== undefined) planner.name = name;
  if (description !== undefined) planner.description = description;
  if (members !== undefined) planner.members = members;
  if (color !== undefined) planner.color = color;
  if (ticketPrefix !== undefined) planner.ticketPrefix = ticketPrefix;

  return res.json(enrich(planner));
});

// DELETE /api/planners/:id — Admin oder Ersteller
router.delete('/:id', (req, res) => {
  const index = store.planners.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Planner not found' });
  if (!canManagePlanner(req.user, store.planners[index])) return res.status(403).json({ error: 'Zugriff verweigert' });
  store.planners.splice(index, 1);
  return res.status(204).send();
});

// PUT /api/planners/:id/members — Mitgliederliste setzen (Admin oder Ersteller)
router.put('/:id/members', (req, res) => {
  const planner = store.planners.find(p => p.id === req.params.id);
  if (!planner) return res.status(404).json({ error: 'Planner not found' });
  if (!canManagePlanner(req.user, planner)) return res.status(403).json({ error: 'Zugriff verweigert' });

  const { members } = req.body;
  if (!Array.isArray(members)) return res.status(400).json({ error: 'members must be an array' });

  const existingIds = new Set((planner.members ?? []).map(m => m.userId));
  planner.members = members;

  // Benachrichtigung für neu hinzugefügte Mitglieder
  const roleLabels = { admin: 'Admin', owner: 'Verantwortlicher', user: 'Mitglied', member: 'Mitglied' };
  members.forEach(m => {
    if (!existingIds.has(m.userId) && m.userId !== req.user.id) {
      const roleName = roleLabels[m.role] ?? m.role;
      createNotification(m.userId, {
        title: `Einladung: ${planner.name}`,
        message: `Du wurdest zum Planner „${planner.name}" hinzugefügt. Deine Rolle: ${roleName}. Du findest ihn jetzt unter „Meine Planner".`,
        type: 'planner-invite',
        meta: { plannerId: planner.id, plannerName: planner.name, role: m.role },
      });
    }
  });

  return res.json(planner);
});

// PUT /api/planners/:id/settings — Ticket-Präfix (Admin oder Ersteller)
router.put('/:id/settings', (req, res) => {
  const planner = store.planners.find(p => p.id === req.params.id);
  if (!planner) return res.status(404).json({ error: 'Planner not found' });
  if (!canManagePlanner(req.user, planner)) return res.status(403).json({ error: 'Zugriff verweigert' });

  const { ticketPrefix } = req.body;
  if (ticketPrefix !== undefined) {
    const clean = String(ticketPrefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return res.status(400).json({ error: 'ticketPrefix darf nicht leer sein' });
    planner.ticketPrefix = clean;
  }

  return res.json(planner);
});

export default router;
