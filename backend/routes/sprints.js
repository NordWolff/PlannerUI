import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken, requireAdminOrOwner } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  let sprints = store.sprints;
  if (req.query.plannerId) {
    sprints = sprints.filter(s => s.plannerId === req.query.plannerId);
  }
  return res.json(sprints);
});

// /current muss VOR /:id registriert sein
router.get('/current', (req, res) => {
  let sprints = store.sprints;
  if (req.query.plannerId) {
    sprints = sprints.filter(s => s.plannerId === req.query.plannerId);
  }
  const current = sprints.find(s => s.status === 'active');
  if (!current) return res.status(404).json({ error: 'No active sprint found' });
  return res.json(current);
});

router.get('/:id', (req, res) => {
  const sprint = store.sprints.find((s) => s.id === req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  return res.json(sprint);
});

router.post('/', requireAdminOrOwner, (req, res) => {
  const { name, description, startDate, endDate, plannerId, projectIds, ticketIds } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const newSprint = {
    id: uuidv4(),
    name,
    description: description || '',
    status: 'planning',
    plannerId: plannerId || null,
    startDate: startDate || null,
    endDate: endDate || null,
    projectIds: projectIds || [],
    ticketIds: ticketIds || [],
    createdAt: new Date().toISOString(),
  };

  store.sprints.push(newSprint);
  return res.status(201).json(newSprint);
});

router.put('/:id', requireAdminOrOwner, (req, res) => {
  const index = store.sprints.findIndex((s) => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Sprint not found' });

  const { name, description, startDate, endDate, plannerId, projectIds, ticketIds } = req.body;
  const sprint = store.sprints[index];

  if (name) sprint.name = name;
  if (description !== undefined) sprint.description = description;
  if (startDate !== undefined) sprint.startDate = startDate;
  if (endDate !== undefined) sprint.endDate = endDate;
  if (plannerId !== undefined) sprint.plannerId = plannerId;
  if (projectIds !== undefined) sprint.projectIds = projectIds;
  if (ticketIds !== undefined) sprint.ticketIds = ticketIds;

  store.sprints[index] = sprint;
  return res.json(sprint);
});

router.post('/:id/start', requireAdminOrOwner, (req, res) => {
  const sprint = store.sprints.find(s => s.id === req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  if (sprint.status === 'completed') return res.status(400).json({ error: 'Abgeschlossene Sprints können nicht gestartet werden' });

  sprint.status = 'active';
  if (!sprint.startDate) sprint.startDate = new Date().toISOString();
  return res.json(sprint);
});

router.post('/:id/complete', requireAdminOrOwner, (req, res) => {
  const sprint = store.sprints.find(s => s.id === req.params.id);
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
  if (sprint.status === 'planning') return res.status(400).json({ error: 'Sprint wurde noch nicht gestartet' });

  sprint.status = 'completed';
  if (!sprint.endDate) sprint.endDate = new Date().toISOString();
  return res.json(sprint);
});

router.delete('/:id', requireAdminOrOwner, (req, res) => {
  const index = store.sprints.findIndex((s) => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Sprint not found' });
  if (store.sprints[index].status === 'active') {
    return res.status(400).json({ error: 'Aktive Sprints können nicht gelöscht werden' });
  }
  store.sprints.splice(index, 1);
  return res.status(204).send();
});

export default router;
