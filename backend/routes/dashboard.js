import { Router } from 'express';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// Helper: alle Datensätze auf einen Planner einschränken (plannerId optional = ungefiltert)
function scopedToPlanner(plannerId) {
  const teams = plannerId ? store.teams.filter((t) => t.plannerId === plannerId) : store.teams;
  const projects = plannerId ? store.projects.filter((p) => p.plannerId === plannerId) : store.projects;
  const boards = plannerId ? store.boards.filter((b) => b.plannerId === plannerId) : store.boards;
  const sprints = plannerId ? store.sprints.filter((s) => s.plannerId === plannerId) : store.sprints;
  const projectIds = projects.map((p) => p.id);
  const tickets = plannerId ? store.tickets.filter((t) => projectIds.includes(t.projectId)) : store.tickets;
  return { teams, projects, boards, sprints, tickets };
}

router.get('/stats', (req, res) => {
  const now = new Date();
  const { teams, projects, boards, sprints, tickets } = scopedToPlanner(req.query.plannerId);

  const byStatus = {};
  for (const ticket of tickets) {
    byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;
  }

  const currentSprint = sprints.find((s) => {
    if (!s.startDate || !s.endDate) return false;
    return new Date(s.startDate) <= now && now <= new Date(s.endDate);
  });

  return res.json({
    teams: { total: teams.length },
    projects: {
      total: projects.length,
      active: projects.filter((p) => p.status === 'active').length,
    },
    tickets: { total: tickets.length, byStatus },
    boards: { total: boards.length },
    sprints: { total: sprints.length, current: currentSprint || null },
  });
});

router.get('/activity', (req, res) => {
  const { tickets } = scopedToPlanner(req.query.plannerId);
  const activity = [...tickets]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 20);

  return res.json(activity);
});

export default router;
