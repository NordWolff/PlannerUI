import { Router } from 'express';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/stats', (req, res) => {
  const now = new Date();

  const byStatus = {};
  for (const ticket of store.tickets) {
    byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
  }

  const currentSprint = store.sprints.find((s) => {
    if (!s.startDate || !s.endDate) return false;
    return new Date(s.startDate) <= now && now <= new Date(s.endDate);
  });

  return res.json({
    teams: { total: store.teams.length },
    projects: {
      total: store.projects.length,
      active: store.projects.filter((p) => p.status === 'active').length,
    },
    tickets: { total: store.tickets.length, byStatus },
    boards: { total: store.boards.length },
    sprints: { total: store.sprints.length, current: currentSprint || null },
  });
});

router.get('/activity', (req, res) => {
  const activity = [...store.tickets]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 20);

  return res.json(activity);
});

export default router;
