import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// Helper: memberIds-Array aus members-Array ableiten
function memberIds(planner) {
  return (planner.members ?? []).map(m => m.userId);
}

// GET /api/planners — Admin: alle; andere: nur eigene
router.get('/', (req, res) => {
  if (req.user.role === 'admin') return res.json(store.planners);
  return res.json(store.planners.filter(p => memberIds(p).includes(req.user.id)));
});

router.get('/:id', (req, res) => {
  const planner = store.planners.find(p => p.id === req.params.id);
  if (!planner) return res.status(404).json({ error: 'Planner not found' });
  if (req.user.role !== 'admin' && !memberIds(planner).includes(req.user.id)) {
    return res.status(403).json({ error: 'Zugriff verweigert' });
  }
  return res.json(planner);
});

router.post('/', requireAdmin, (req, res) => {
  const { name, description, teamIds, members } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const newPlanner = {
    id: uuidv4(),
    name,
    description: description || '',
    teamIds: teamIds || [],
    members: members || [],
    ticketPrefix: 'TKT',
    ticketCounter: 1,
    createdAt: new Date().toISOString(),
  };

  store.planners.push(newPlanner);
  return res.status(201).json(newPlanner);
});

router.put('/:id', requireAdmin, (req, res) => {
  const planner = store.planners.find(p => p.id === req.params.id);
  if (!planner) return res.status(404).json({ error: 'Planner not found' });

  const { name, description, teamIds, members } = req.body;
  if (name !== undefined) planner.name = name;
  if (description !== undefined) planner.description = description;
  if (teamIds !== undefined) planner.teamIds = teamIds;
  if (members !== undefined) planner.members = members;

  return res.json(planner);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const index = store.planners.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Planner not found' });
  store.planners.splice(index, 1);
  return res.status(204).send();
});

// PUT /api/planners/:id/members — Mitgliederliste setzen [{userId, role}]
router.put('/:id/members', requireAdmin, (req, res) => {
  const planner = store.planners.find(p => p.id === req.params.id);
  if (!planner) return res.status(404).json({ error: 'Planner not found' });

  const { members } = req.body;
  if (!Array.isArray(members)) return res.status(400).json({ error: 'members must be an array' });

  planner.members = members;
  return res.json(planner);
});

// PUT /api/planners/:id/teams — Team-Zuweisung setzen
router.put('/:id/teams', requireAdmin, (req, res) => {
  const planner = store.planners.find(p => p.id === req.params.id);
  if (!planner) return res.status(404).json({ error: 'Planner not found' });

  const { teamIds } = req.body;
  if (!Array.isArray(teamIds)) return res.status(400).json({ error: 'teamIds must be an array' });

  planner.teamIds = teamIds;
  return res.json(planner);
});

// PUT /api/planners/:id/settings — Ticket-Präfix konfigurieren
router.put('/:id/settings', requireAdmin, (req, res) => {
  const planner = store.planners.find(p => p.id === req.params.id);
  if (!planner) return res.status(404).json({ error: 'Planner not found' });

  const { ticketPrefix } = req.body;
  if (ticketPrefix !== undefined) {
    const clean = String(ticketPrefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return res.status(400).json({ error: 'ticketPrefix darf nicht leer sein' });
    planner.ticketPrefix = clean;
  }

  return res.json(planner);
});

export default router;
