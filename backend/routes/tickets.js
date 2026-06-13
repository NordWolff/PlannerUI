import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../data/store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

const VALID_STATUSES = ['draft', 'planned', 'in_progress', 'review', 'done'];

router.get('/', (req, res) => {
  let tickets = store.tickets;

  if (req.query.boardId) tickets = tickets.filter((t) => t.boardId === req.query.boardId);
  if (req.query.teamId) tickets = tickets.filter((t) => t.teamId === req.query.teamId);
  if (req.query.sprintId) tickets = tickets.filter((t) => t.sprintId === req.query.sprintId);
  if (req.query.projectId) tickets = tickets.filter((t) => t.projectId === req.query.projectId);
  if (req.query.assigneeId) tickets = tickets.filter((t) => t.assigneeId === req.query.assigneeId);

  return res.json(tickets);
});

router.post('/', (req, res) => {
  const { title, description, status, priority, assigneeId, projectId, boardId, sprintId, teamId, checklist, dependencies } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const now = new Date().toISOString();
  const newTicket = {
    id: uuidv4(),
    title,
    description: description || '',
    status: status || 'draft',
    priority: priority || 'medium',
    assigneeId: assigneeId || null,
    projectId: projectId || null,
    boardId: boardId || null,
    sprintId: sprintId || null,
    teamId: teamId || null,
    checklist: checklist || [],
    dependencies: dependencies || [],
    history: [],
    createdAt: now,
    updatedAt: now,
  };

  store.tickets.push(newTicket);
  return res.status(201).json(newTicket);
});

router.get('/:id', (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  return res.json(ticket);
});

router.put('/:id', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const ticket = store.tickets[index];
  const { title, description, status, priority, assigneeId, projectId, boardId, sprintId, teamId, checklist, dependencies } = req.body;
  const now = new Date().toISOString();

  if (status && status !== ticket.status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    ticket.history.push({
      id: uuidv4(),
      changedAt: now,
      field: 'status',
      from: ticket.status,
      to: status,
      changedBy: req.user.id,
    });
    ticket.status = status;
  }

  if (title) ticket.title = title;
  if (description !== undefined) ticket.description = description;
  if (priority) ticket.priority = priority;
  if (assigneeId !== undefined) ticket.assigneeId = assigneeId;
  if (projectId !== undefined) ticket.projectId = projectId;
  if (boardId !== undefined) ticket.boardId = boardId;
  if (sprintId !== undefined) ticket.sprintId = sprintId;
  if (teamId !== undefined) ticket.teamId = teamId;
  if (checklist !== undefined) ticket.checklist = checklist;
  if (dependencies !== undefined) ticket.dependencies = dependencies;

  ticket.updatedAt = now;
  store.tickets[index] = ticket;
  return res.json(ticket);
});

router.delete('/:id', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  store.tickets.splice(index, 1);
  return res.status(204).send();
});

router.put('/:id/status', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const ticket = store.tickets[index];
  const now = new Date().toISOString();

  if (status !== ticket.status) {
    ticket.history.push({
      id: uuidv4(),
      changedAt: now,
      field: 'status',
      from: ticket.status,
      to: status,
      changedBy: req.user.id,
    });
    ticket.status = status;
    ticket.updatedAt = now;
  }

  store.tickets[index] = ticket;
  return res.json(ticket);
});

router.post('/:id/checklist', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  const ticket = store.tickets[index];
  const newItem = { id: uuidv4(), text, done: false };
  ticket.checklist.push(newItem);
  ticket.updatedAt = new Date().toISOString();

  store.tickets[index] = ticket;
  return res.status(201).json(ticket);
});

router.put('/:id/checklist', (req, res) => {
  const index = store.tickets.findIndex((t) => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const { itemId } = req.body;
  if (!itemId) {
    return res.status(400).json({ error: 'itemId is required' });
  }

  const ticket = store.tickets[index];
  const itemIndex = ticket.checklist.findIndex((c) => c.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Checklist item not found' });
  }

  ticket.checklist[itemIndex].done = !ticket.checklist[itemIndex].done;
  ticket.updatedAt = new Date().toISOString();

  store.tickets[index] = ticket;
  return res.json(ticket);
});

router.get('/:id/history', (req, res) => {
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  return res.json(ticket.history);
});

export default router;
