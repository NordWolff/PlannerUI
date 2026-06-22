import { Router } from 'express';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, (req, res) => {
  const { q, plannerId } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 10, 20);

  if (!q || q.trim().length < 2 || !plannerId) {
    return res.json({ tickets: [], projects: [], users: [] });
  }

  const term = q.trim().toLowerCase();

  const planner = store.planners.find(p => p.id === plannerId);
  if (!planner) return res.json({ tickets: [], projects: [], users: [] });

  const plannerProjects = store.projects.filter(p => p.plannerId === plannerId);
  const plannerProjectIds = new Set(plannerProjects.map(p => p.id));

  const tickets = store.tickets
    .filter(t => plannerProjectIds.has(t.projectId))
    .filter(t =>
      (t.ticketNumber || '').toLowerCase().includes(term) ||
      (t.title || '').toLowerCase().includes(term) ||
      (t.description || '').toLowerCase().includes(term)
    )
    .slice(0, limit);

  const projects = plannerProjects
    .filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term)
    )
    .slice(0, 5);

  const plannerMemberIds = new Set((planner.members || []).map(m => m.userId));
  const users = store.users
    .filter(u => plannerMemberIds.has(u.id))
    .filter(u =>
      (u.username || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    )
    .slice(0, 5)
    .map(({ id, username, email, role }) => ({ id, username, email, role }));

  return res.json({ tickets, projects, users });
});

export default router;
