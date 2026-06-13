import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  return res.json(store.teams);
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const newTeam = {
    id: uuidv4(),
    name,
    description: description || '',
    boardId: null,
    members: [{ userId: req.user.id, role: 'owner' }],
    createdAt: new Date().toISOString(),
  };

  store.teams.push(newTeam);
  return res.status(201).json(newTeam);
});

router.get('/:id', (req, res) => {
  const team = store.teams.find((t) => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  return res.json(team);
});

router.put('/:id', (req, res) => {
  const index = store.teams.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const { name, description, boardId } = req.body;
  const team = store.teams[index];

  if (name) team.name = name;
  if (description !== undefined) team.description = description;
  if (boardId !== undefined) team.boardId = boardId;

  store.teams[index] = team;
  return res.json(team);
});

router.delete('/:id', (req, res) => {
  const index = store.teams.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Team not found' });
  }

  store.teams.splice(index, 1);
  return res.status(204).send();
});

router.get('/:id/members', (req, res) => {
  const team = store.teams.find((t) => t.id === req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const members = team.members.map((m) => {
    const user = store.users.find((u) => u.id === m.userId);
    if (!user) return { userId: m.userId, role: m.role };
    const { passwordHash, ...safeUser } = user;
    return { ...safeUser, role: m.role };
  });

  return res.json(members);
});

router.post('/:id/members', (req, res) => {
  const index = store.teams.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const { userId, role } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const userExists = store.users.find((u) => u.id === userId);
  if (!userExists) {
    return res.status(404).json({ error: 'User not found' });
  }

  const team = store.teams[index];
  const alreadyMember = team.members.find((m) => m.userId === userId);
  if (alreadyMember) {
    return res.status(409).json({ error: 'User is already a member' });
  }

  team.members.push({ userId, role: role || 'member' });
  store.teams[index] = team;
  return res.status(201).json(team);
});

router.delete('/:id/members/:userId', (req, res) => {
  const index = store.teams.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const team = store.teams[index];
  const memberIndex = team.members.findIndex((m) => m.userId === req.params.userId);
  if (memberIndex === -1) {
    return res.status(404).json({ error: 'Member not found' });
  }

  team.members.splice(memberIndex, 1);
  store.teams[index] = team;
  return res.status(204).send();
});

export default router;
