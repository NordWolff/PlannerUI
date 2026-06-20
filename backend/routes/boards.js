import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

function canManagePlannerBoard(user, plannerId) {
  if (user.role === 'admin') return true;
  if (!plannerId) return false;
  const planner = store.planners.find(p => p.id === plannerId);
  return planner?.createdBy === user.id;
}

router.get('/', (req, res) => {
  let boards = store.boards;
  if (req.query.plannerId) {
    boards = boards.filter(b => b.plannerId === req.query.plannerId);
  } else if (req.user.role !== 'admin') {
    const memberPlannerIds = store.planners
      .filter(p => (p.members ?? []).some(m => m.userId === req.user.id))
      .map(p => p.id);
    boards = boards.filter(b => !b.plannerId || memberPlannerIds.includes(b.plannerId));
  }
  return res.json(boards);
});

router.post('/', (req, res) => {
  const { name, description, startDate, endDate, plannerId, teamIds, projectIds } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!canManagePlannerBoard(req.user, plannerId)) {
    return res.status(403).json({ error: 'Nur System-Admins oder Ersteller des Planners können Boards anlegen' });
  }

  const newBoard = {
    id: uuidv4(),
    name,
    description: description || '',
    plannerId: plannerId || null,
    startDate: startDate || null,
    endDate: endDate || null,
    teamIds: teamIds || [],
    projectIds: projectIds || [],
    createdAt: new Date().toISOString(),
  };

  store.boards.push(newBoard);
  return res.status(201).json(newBoard);
});

router.get('/:id', (req, res) => {
  const board = store.boards.find((b) => b.id === req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  return res.json(board);
});

router.put('/:id', (req, res) => {
  const index = store.boards.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const board = store.boards[index];
  if (!canManagePlannerBoard(req.user, board.plannerId)) {
    return res.status(403).json({ error: 'Nur System-Admins oder Ersteller des Planners können Boards bearbeiten' });
  }

  const { name, description, startDate, endDate, plannerId, teamIds, projectIds } = req.body;

  if (name) board.name = name;
  if (description !== undefined) board.description = description;
  if (startDate !== undefined) board.startDate = startDate;
  if (endDate !== undefined) board.endDate = endDate;
  if (plannerId !== undefined) board.plannerId = plannerId;
  if (teamIds !== undefined) board.teamIds = teamIds;
  if (projectIds !== undefined) board.projectIds = projectIds;

  store.boards[index] = board;
  return res.json(board);
});

router.delete('/:id', (req, res) => {
  const index = store.boards.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const board = store.boards[index];
  if (!canManagePlannerBoard(req.user, board.plannerId)) {
    return res.status(403).json({ error: 'Nur System-Admins oder Ersteller des Planners können Boards löschen' });
  }

  store.boards.splice(index, 1);
  return res.status(204).send();
});

export default router;
