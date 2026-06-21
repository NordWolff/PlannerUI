import { Router } from 'express';
import { store, sanitizeUser, getUserOnlineStatus } from '../data/store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const VALID_ROLES = ['admin', 'owner', 'user'];

const router = Router();
router.use(authenticateToken);

function withStatus(user, requestingUserId) {
  return { ...sanitizeUser(user), onlineStatus: getUserOnlineStatus(user.id, requestingUserId) };
}

router.get('/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (q.length < 2) return res.json([]);
  const results = store.users
    .filter((u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    .slice(0, 10)
    .map(u => withStatus(u, req.user.id));
  return res.json(results);
});

router.get('/', (req, res) => {
  return res.json(store.users.map(u => withStatus(u, req.user.id)));
});

router.get('/:id', (req, res) => {
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json(withStatus(user, req.user.id));
});

router.put('/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Ungültige Rolle. Erlaubt: ${VALID_ROLES.join(', ')}` });
  }
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  const prevRole = user.role;
  user.role = role;

  // System-Support Planner + Team Mitgliedschaft automatisch synchronisieren
  const supportPlanner = store.planners.find(p => p.isSystemSupport);
  const supportTeam = store.teams.find(t => t.plannerId === supportPlanner?.id && t.isSystemSupport);
  if (supportPlanner) {
    if (role === 'admin') {
      if (!supportPlanner.members.some(m => m.userId === user.id)) {
        supportPlanner.members.push({ userId: user.id, role: 'admin' });
      }
      if (supportTeam && !supportTeam.members.some(m => m.userId === user.id)) {
        supportTeam.members.push({ userId: user.id, role: 'user' });
      }
    } else if (prevRole === 'admin') {
      supportPlanner.members = supportPlanner.members.filter(m => m.userId !== user.id);
      if (supportTeam) {
        supportTeam.members = supportTeam.members.filter(m => m.userId !== user.id);
      }
    }
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

  const { teamId, projectId, boardId, plannerId } = req.body;
  const user = store.users[userIndex];

  user.favorites = {
    teamId:    teamId    !== undefined ? teamId    : user.favorites.teamId,
    projectId: projectId !== undefined ? projectId : user.favorites.projectId,
    boardId:   boardId   !== undefined ? boardId   : user.favorites.boardId,
    plannerId: plannerId !== undefined ? plannerId : (user.favorites.plannerId ?? null),
  };

  store.users[userIndex] = user;
  return res.json(sanitizeUser(user));
});

export default router;
