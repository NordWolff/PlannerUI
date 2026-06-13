import { Router } from 'express';
import { store, sanitizeUser } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  return res.json(store.users.map(sanitizeUser));
});

router.get('/:id', (req, res) => {
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json(sanitizeUser(user));
});

router.put('/:id/favorites', (req, res) => {
  const userIndex = store.users.findIndex((u) => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { teamId, projectId, boardId } = req.body;
  const user = store.users[userIndex];

  user.favorites = {
    teamId: teamId !== undefined ? teamId : user.favorites.teamId,
    projectId: projectId !== undefined ? projectId : user.favorites.projectId,
    boardId: boardId !== undefined ? boardId : user.favorites.boardId,
  };

  store.users[userIndex] = user;
  return res.json(sanitizeUser(user));
});

export default router;
