import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  return res.json(store.boards);
});

router.post('/', (req, res) => {
  const { name, description, startDate, endDate, teamIds, projectIds } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const newBoard = {
    id: uuidv4(),
    name,
    description: description || '',
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

  const { name, description, startDate, endDate, teamIds, projectIds } = req.body;
  const board = store.boards[index];

  if (name) board.name = name;
  if (description !== undefined) board.description = description;
  if (startDate !== undefined) board.startDate = startDate;
  if (endDate !== undefined) board.endDate = endDate;
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

  store.boards.splice(index, 1);
  return res.status(204).send();
});

export default router;
