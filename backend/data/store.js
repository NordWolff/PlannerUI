import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const store = {
  users: [],
  teams: [],
  projects: [],
  tickets: [],
  boards: [],
  sprints: [],
};

export function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function seedData() {
  const now = new Date().toISOString();
  const today = new Date();

  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);

  const adminId = uuidv4();
  const userId = uuidv4();

  store.users.push(
    {
      id: adminId,
      username: 'admin',
      email: 'admin@planner.dev',
      passwordHash: adminHash,
      avatar: null,
      language: 'de',
      theme: 'light',
      favorites: { teamId: null, projectId: null, boardId: null },
      createdAt: now,
    },
    {
      id: userId,
      username: 'user',
      email: 'user@planner.dev',
      passwordHash: userHash,
      avatar: null,
      language: 'de',
      theme: 'light',
      favorites: { teamId: null, projectId: null, boardId: null },
      createdAt: now,
    }
  );

  const team1Id = uuidv4();
  const team2Id = uuidv4();

  store.teams.push(
    {
      id: team1Id,
      name: 'Entwicklung',
      description: 'Das Entwicklungsteam',
      boardId: null,
      members: [
        { userId: adminId, role: 'owner' },
        { userId: userId, role: 'member' },
      ],
      createdAt: now,
    },
    {
      id: team2Id,
      name: 'Design',
      description: 'Das Designteam',
      boardId: null,
      members: [{ userId: userId, role: 'owner' }],
      createdAt: now,
    }
  );

  const project1Id = uuidv4();
  const project2Id = uuidv4();
  const project3Id = uuidv4();
  const sprintId = uuidv4();

  const sprintStart = new Date(today);
  sprintStart.setDate(today.getDate() - 3);
  const sprintEnd = new Date(today);
  sprintEnd.setDate(today.getDate() + 11);

  store.projects.push(
    {
      id: project1Id,
      name: 'Planner MVP',
      description: 'Das MVP-Projekt für Planner',
      status: 'active',
      sprintId: sprintId,
      teamId: team1Id,
      createdAt: now,
    },
    {
      id: project2Id,
      name: 'UI Redesign',
      description: 'Neugestaltung der Benutzeroberfläche',
      status: 'active',
      sprintId: sprintId,
      teamId: team2Id,
      createdAt: now,
    },
    {
      id: project3Id,
      name: 'API Integration',
      description: 'Integration externer APIs',
      status: 'active',
      sprintId: null,
      teamId: team1Id,
      createdAt: now,
    }
  );

  const boardId = uuidv4();
  store.boards.push({
    id: boardId,
    name: 'Haupt-Board',
    description: 'Das zentrale Planungs-Board',
    startDate: sprintStart.toISOString(),
    endDate: sprintEnd.toISOString(),
    teamIds: [team1Id, team2Id],
    projectIds: [project1Id, project2Id],
    createdAt: now,
  });

  store.teams[0].boardId = boardId;

  const ticket1Id = uuidv4();
  const ticket2Id = uuidv4();
  const ticket3Id = uuidv4();
  const ticket4Id = uuidv4();
  const ticket5Id = uuidv4();

  store.tickets.push(
    {
      id: ticket1Id,
      title: 'Backend API aufsetzen',
      description: 'Express.js Backend mit allen Endpunkten implementieren',
      status: 'done',
      priority: 'high',
      assigneeId: adminId,
      projectId: project1Id,
      boardId: boardId,
      sprintId: sprintId,
      teamId: team1Id,
      checklist: [
        { id: uuidv4(), text: 'Express einrichten', done: true },
        { id: uuidv4(), text: 'Routen implementieren', done: true },
      ],
      dependencies: [],
      history: [
        { id: uuidv4(), changedAt: now, field: 'status', from: 'draft', to: 'done', changedBy: adminId },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ticket2Id,
      title: 'Frontend Login-Seite',
      description: 'Login und Registrierung im Frontend implementieren',
      status: 'in_progress',
      priority: 'high',
      assigneeId: userId,
      projectId: project1Id,
      boardId: boardId,
      sprintId: sprintId,
      teamId: team1Id,
      checklist: [
        { id: uuidv4(), text: 'Login-Formular erstellen', done: true },
        { id: uuidv4(), text: 'JWT speichern', done: false },
      ],
      dependencies: [ticket1Id],
      history: [
        { id: uuidv4(), changedAt: now, field: 'status', from: 'planned', to: 'in_progress', changedBy: userId },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ticket3Id,
      title: 'Dashboard Statistiken',
      description: 'KPI-Karten auf dem Dashboard anzeigen',
      status: 'planned',
      priority: 'medium',
      assigneeId: adminId,
      projectId: project1Id,
      boardId: boardId,
      sprintId: sprintId,
      teamId: team1Id,
      checklist: [],
      dependencies: [],
      history: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ticket4Id,
      title: 'Design System erstellen',
      description: 'Komponenten-Bibliothek und Design-Tokens definieren',
      status: 'review',
      priority: 'medium',
      assigneeId: userId,
      projectId: project2Id,
      boardId: boardId,
      sprintId: sprintId,
      teamId: team2Id,
      checklist: [
        { id: uuidv4(), text: 'Farben definieren', done: true },
        { id: uuidv4(), text: 'Typografie festlegen', done: true },
        { id: uuidv4(), text: 'Komponenten dokumentieren', done: false },
      ],
      dependencies: [],
      history: [
        { id: uuidv4(), changedAt: now, field: 'status', from: 'in_progress', to: 'review', changedBy: userId },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: ticket5Id,
      title: 'API-Dokumentation',
      description: 'Alle Endpunkte dokumentieren',
      status: 'draft',
      priority: 'low',
      assigneeId: null,
      projectId: project3Id,
      boardId: null,
      sprintId: null,
      teamId: team1Id,
      checklist: [],
      dependencies: [],
      history: [],
      createdAt: now,
      updatedAt: now,
    }
  );

  store.sprints.push({
    id: sprintId,
    name: 'Sprint 1',
    description: 'Erster Sprint des Projekts',
    startDate: sprintStart.toISOString(),
    endDate: sprintEnd.toISOString(),
    projectIds: [project1Id, project2Id],
    ticketIds: [ticket1Id, ticket2Id, ticket3Id, ticket4Id],
    createdAt: now,
  });

  console.log('Seed-Daten erfolgreich angelegt.');
}
