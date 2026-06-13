import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  return res.json(store.sprints);
});

router.post('/', (req, res) => {
  const { name, description, startDate, endDate, projectIds, ticketIds } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const newSprint = {
    id: uuidv4(),
    name,
    description: description || '',
    startDate: startDate || null,
    endDate: endDate || null,
    projectIds: projectIds || [],
    ticketIds: ticketIds || [],
    createdAt: new Date().toISOString(),
  };

  store.sprints.push(newSprint);
  return res.status(201).json(newSprint);
});

// /current muss VOR /:id registriert sein
router.get('/current', (req, res) => {
  const now = new Date();
  const currentSprint = store.sprints.find((s) => {
    if (!s.startDate || !s.endDate) return false;
    return new Date(s.startDate) <= now && now <= new Date(s.endDate);
  });

  if (!currentSprint) {
    return res.status(404).json({ error: 'No active sprint found' });
  }
  return res.json(currentSprint);
});

router.get('/:id', (req, res) => {
  const sprint = store.sprints.find((s) => s.id === req.params.id);
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }
  return res.json(sprint);
});

router.put('/:id', (req, res) => {
  const index = store.sprints.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  const { name, description, startDate, endDate, projectIds, ticketIds } = req.body;
  const sprint = store.sprints[index];

  if (name) sprint.name = name;
  if (description !== undefined) sprint.description = description;
  if (startDate !== undefined) sprint.startDate = startDate;
  if (endDate !== undefined) sprint.endDate = endDate;
  if (projectIds !== undefined) sprint.projectIds = projectIds;
  if (ticketIds !== undefined) sprint.ticketIds = ticketIds;

  store.sprints[index] = sprint;
  return res.json(sprint);
});

router.delete('/:id', (req, res) => {
  const index = store.sprints.findIndex((s) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  store.sprints.splice(index, 1);
  return res.status(204).send();
});

export default router;
