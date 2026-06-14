import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  let projects = store.projects;

  if (req.query.teamId) {
    projects = projects.filter((p) => p.teamId === req.query.teamId);
  }
  if (req.query.sprintId) {
    projects = projects.filter((p) => (p.sprintIds ?? []).includes(req.query.sprintId));
  }

  return res.json(projects);
});

router.post('/', (req, res) => {
  const { name, description, status, sprintIds, teamId, startDate, endDate } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const newProject = {
    id: uuidv4(),
    name,
    description: description || '',
    status: status || 'active',
    sprintIds: Array.isArray(sprintIds) ? sprintIds : [],
    teamId: teamId || null,
    startDate: startDate || null,
    endDate: endDate || null,
    createdAt: new Date().toISOString(),
  };

  store.projects.push(newProject);
  return res.status(201).json(newProject);
});

router.get('/:id', (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  return res.json(project);
});

router.put('/:id', (req, res) => {
  const index = store.projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { name, description, status, sprintIds, teamId, startDate, endDate } = req.body;
  const project = store.projects[index];

  if (name) project.name = name;
  if (description !== undefined) project.description = description;
  if (status) project.status = status;
  if (sprintIds !== undefined) project.sprintIds = Array.isArray(sprintIds) ? sprintIds : [];
  if (teamId !== undefined) project.teamId = teamId;
  if (startDate !== undefined) project.startDate = startDate;
  if (endDate !== undefined) project.endDate = endDate;

  store.projects[index] = project;
  return res.json(project);
});

router.delete('/:id', (req, res) => {
  const index = store.projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  store.projects.splice(index, 1);
  return res.status(204).send();
});

export default router;
