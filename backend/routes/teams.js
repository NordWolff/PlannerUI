import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

router.get('/', (req, res) => {
  return res.json(store.teams);
});

// Admin erstellt Team — kein Auto-Owner, optional ownerId mitgeben
router.post('/', requireAdmin, (req, res) => {
  const { name, description, ownerId } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const members = [];
  if (ownerId) {
    const owner = store.users.find((u) => u.id === ownerId);
    if (!owner) return res.status(404).json({ error: 'Owner-Benutzer nicht gefunden' });
    if (owner.role === 'admin') return res.status(400).json({ error: 'Administratoren können keine Team-Mitglieder sein' });
    members.push({ userId: ownerId, role: 'owner' });
  }

  const newTeam = {
    id: uuidv4(),
    name,
    description: description || '',
    boardId: null,
    members,
    createdAt: new Date().toISOString(),
  };

  store.teams.push(newTeam);
  return res.status(201).json(newTeam);
});

router.get('/:id', (req, res) => {
  const team = store.teams.find((t) => t.id === req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  return res.json(team);
});

router.put('/:id', (req, res) => {
  const index = store.teams.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Team not found' });

  const { name, description, boardId } = req.body;
  const team = store.teams[index];
  if (name) team.name = name;
  if (description !== undefined) team.description = description;
  if (boardId !== undefined) team.boardId = boardId;

  store.teams[index] = team;
  return res.json(team);
});

router.delete('/:id', requireAdmin, (req, res) => {
  const index = store.teams.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Team not found' });
  store.teams.splice(index, 1);
  return res.status(204).send();
});

router.get('/:id/members', (req, res) => {
  const team = store.teams.find((t) => t.id === req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  const members = team.members.map((m) => {
    const user = store.users.find((u) => u.id === m.userId);
    if (!user) return { userId: m.userId, role: m.role };
    const { passwordHash, ...safeUser } = user;
    return { ...safeUser, teamRole: m.role };
  });
  return res.json(members);
});

router.post('/:id/members', (req, res) => {
  const index = store.teams.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Team not found' });

  const { userId, role } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const userExists = store.users.find((u) => u.id === userId);
  if (!userExists) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  // Admin darf kein Team-Mitglied sein
  if (userExists.role === 'admin') {
    return res.status(400).json({ error: 'Administratoren können keine Team-Mitglieder sein' });
  }

  const team = store.teams[index];

  if (team.members.find((m) => m.userId === userId)) {
    return res.status(409).json({ error: 'Benutzer ist bereits Mitglied dieses Teams' });
  }

  const memberRole = role || 'member';

  // Nur ein Owner pro Team
  if (memberRole === 'owner' && team.members.some((m) => m.role === 'owner')) {
    return res.status(409).json({ error: 'Das Team hat bereits einen Product Owner' });
  }

  team.members.push({ userId, role: memberRole });
  store.teams[index] = team;
  return res.status(201).json(team);
});

// Ownership übertragen: bisheriger Owner wird Mitglied, neuer wird Owner
router.put('/:id/members/:userId/role', (req, res) => {
  const index = store.teams.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Team not found' });

  const { role } = req.body;
  if (!role || !['owner', 'member'].includes(role)) {
    return res.status(400).json({ error: 'role muss "owner" oder "member" sein' });
  }

  const team = store.teams[index];
  const memberEntry = team.members.find((m) => m.userId === req.params.userId);
  if (!memberEntry) return res.status(404).json({ error: 'Mitglied nicht gefunden' });

  if (role === 'owner') {
    // Bisherigen Owner auf member setzen
    team.members.forEach((m) => { if (m.role === 'owner') m.role = 'member'; });
  }

  memberEntry.role = role;
  store.teams[index] = team;
  return res.json(team);
});

router.delete('/:id/members/:userId', (req, res) => {
  const index = store.teams.findIndex((t) => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Team not found' });

  const team = store.teams[index];
  const memberIndex = team.members.findIndex((m) => m.userId === req.params.userId);
  if (memberIndex === -1) return res.status(404).json({ error: 'Mitglied nicht gefunden' });

  if (team.members[memberIndex].role === 'owner') {
    return res.status(400).json({ error: 'Der Product Owner kann nicht direkt entfernt werden. Bitte zuerst Ownership übertragen.' });
  }

  team.members.splice(memberIndex, 1);
  store.teams[index] = team;
  return res.status(204).send();
});

export default router;
