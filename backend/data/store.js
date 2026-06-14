import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const store = {
  users: [],
  teams: [],
  projects: [],
  tickets: [],
  boards: [],
  sprints: [],
  messages: [],
  adminRequests: [],
  settings: {
    ticketPrefix: 'TKT',
    ticketCounter: 1,
  },
  onlineStatus: {}, // { [userId]: { online: bool, lastSeen: number (ms) } }
};

// Online-Status: lastSeen älter als 2 Minuten → offline
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function setUserOnline(userId) {
  store.onlineStatus[userId] = { online: true, lastSeen: Date.now() };
}

export function setUserOffline(userId) {
  if (store.onlineStatus[userId]) {
    store.onlineStatus[userId].online = false;
  }
}

export function getUserOnlineStatus(userId, requestingUserId) {
  const user = store.users.find(u => u.id === userId);
  const entry = store.onlineStatus[userId];
  if (!entry || !entry.online) return 'offline';
  if (Date.now() - entry.lastSeen > ONLINE_THRESHOLD_MS) return 'offline';
  // Datenschutz: eigener Status immer sichtbar, für andere ggf. verborgen
  if (user?.privacyHideOnline && userId !== requestingUserId) return 'hidden';
  return 'online';
}

export function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function seedData() {
  const now = new Date().toISOString();
  const today = new Date();

  const adminHash  = await bcrypt.hash('admin123', 10);
  const ownerHash  = await bcrypt.hash('owner123', 10);
  const userHash   = await bcrypt.hash('user123',  10);

  // ── IDs ──────────────────────────────────────────────────────────────────
  const adminId        = uuidv4();
  const miladId        = uuidv4();
  const kayId          = uuidv4();
  const thomasWolffId  = uuidv4();
  const torstenKloseId = uuidv4();
  const cindyId        = uuidv4();
  const haraldId       = uuidv4();
  const mircoId        = uuidv4();
  const thomasWId      = uuidv4();
  const lisaId         = uuidv4();
  const kevinId        = uuidv4();
  const sandraId       = uuidv4();
  const felixId        = uuidv4();

  // ── Benutzer ──────────────────────────────────────────────────────────────
  const makeUser = (id, username, email, hash, role) => ({
    id,
    username,
    email,
    passwordHash: hash,
    role,
    avatar: null,
    language: 'de',
    theme: 'light',
    privacyHideOnline: false,
    favorites: { teamId: null, projectId: null, boardId: null },
    createdAt: now,
  });

  store.users.push(
    makeUser(adminId,        'admin',             'admin@planner.dev',           adminHash,  'admin'),
    makeUser(miladId,        'Milad',             'milad@planner.dev',           ownerHash,  'owner'),
    makeUser(kayId,          'Kay',               'kay@planner.dev',             ownerHash,  'owner'),
    makeUser(thomasWolffId,  'Thomas Wolff',      'thomas.wolff@planner.dev',    userHash,   'user'),
    makeUser(torstenKloseId, 'Torsten Klose',     'torsten.klose@planner.dev',   userHash,   'user'),
    makeUser(cindyId,        'Cindy Scholka',     'cindy.scholka@planner.dev',   userHash,   'user'),
    makeUser(haraldId,       'Harald Hübner',     'harald.huebner@planner.dev',  userHash,   'user'),
    makeUser(mircoId,        'Mirco Martin',      'mirco.martin@planner.dev',    userHash,   'user'),
    makeUser(thomasWId,      'Thomas Wunderlich', 'thomas.wunderlich@planner.dev', userHash, 'user'),
    makeUser(lisaId,         'Lisa Hartmann',     'lisa.hartmann@planner.dev',   userHash,   'user'),
    makeUser(kevinId,        'Kevin Müller',      'kevin.mueller@planner.dev',   userHash,   'user'),
    makeUser(sandraId,       'Sandra Braun',      'sandra.braun@planner.dev',    userHash,   'user'),
    makeUser(felixId,        'Felix Schmidt',     'felix.schmidt@planner.dev',   userHash,   'user'),
  );

  // ── Teams ─────────────────────────────────────────────────────────────────
  const team1Id = uuidv4(); // Entwicklung
  const team2Id = uuidv4(); // Design
  const team3Id = uuidv4(); // Management
  const team4Id = uuidv4(); // QA & Testing

  store.teams.push(
    {
      id: team1Id,
      name: 'Entwicklung',
      description: 'Backend- und Frontend-Entwicklung',
      boardId: null,
      members: [
        { userId: miladId,        role: 'owner'  },
        { userId: thomasWolffId,  role: 'member' },
        { userId: torstenKloseId, role: 'member' },
        { userId: mircoId,        role: 'member' },
        { userId: felixId,        role: 'member' },
      ],
      createdAt: now,
    },
    {
      id: team2Id,
      name: 'Design',
      description: 'UX/UI Design und Kreation',
      boardId: null,
      members: [
        { userId: kayId,     role: 'owner'  },
        { userId: cindyId,   role: 'member' },
        { userId: lisaId,    role: 'member' },
        { userId: sandraId,  role: 'member' },
      ],
      createdAt: now,
    },
    {
      id: team3Id,
      name: 'Management',
      description: 'Projektleitung und Koordination',
      boardId: null,
      members: [
        { userId: miladId,   role: 'owner'  },
        { userId: kayId,     role: 'member' },
        { userId: thomasWId, role: 'member' },
        { userId: haraldId,  role: 'member' },
      ],
      createdAt: now,
    },
    {
      id: team4Id,
      name: 'QA & Testing',
      description: 'Qualitätssicherung und Testautomatisierung',
      boardId: null,
      members: [
        { userId: torstenKloseId, role: 'owner'  },
        { userId: kevinId,        role: 'member' },
        { userId: thomasWId,      role: 'member' },
        { userId: felixId,        role: 'member' },
      ],
      createdAt: now,
    },
  );

  // ── Sprint ────────────────────────────────────────────────────────────────
  const sprintId = uuidv4();
  const sprintStart = new Date(today);
  sprintStart.setDate(today.getDate() - 3);
  const sprintEnd = new Date(today);
  sprintEnd.setDate(today.getDate() + 11);

  // ── Projekte ──────────────────────────────────────────────────────────────
  const project1Id = uuidv4();
  const project2Id = uuidv4();
  const project3Id = uuidv4();

  // Projektdaten relativ zu heute
  const p1Start = new Date(today); p1Start.setDate(p1Start.getDate() - 30);
  const p1End   = new Date(today); p1End.setDate(p1End.getDate() + 90);
  const p2Start = new Date(today); p2Start.setDate(p2Start.getDate() - 14);
  const p2End   = new Date(today); p2End.setDate(p2End.getDate() + 45);
  const p3Start = new Date(today); p3Start.setDate(p3Start.getDate() + 14);
  // p3 hat kein festes Enddatum (offenes Ende)

  store.projects.push(
    {
      id: project1Id,
      name: 'Planner MVP',
      description: 'Das MVP-Projekt für Planner',
      status: 'active',
      sprintIds: [sprintId],
      teamId: team1Id,
      startDate: p1Start.toISOString(),
      endDate: p1End.toISOString(),
      createdAt: now,
    },
    {
      id: project2Id,
      name: 'UI Redesign',
      description: 'Neugestaltung der Benutzeroberfläche',
      status: 'active',
      sprintIds: [sprintId],
      teamId: team2Id,
      startDate: p2Start.toISOString(),
      endDate: p2End.toISOString(),
      createdAt: now,
    },
    {
      id: project3Id,
      name: 'API Integration',
      description: 'Integration externer APIs',
      status: 'active',
      sprintIds: [],
      teamId: team1Id,
      startDate: p3Start.toISOString(),
      endDate: null,
      createdAt: now,
    },
  );

  // ── Board ─────────────────────────────────────────────────────────────────
  const boardId = uuidv4();
  store.boards.push({
    id: boardId,
    name: 'Haupt-Board',
    description: 'Das zentrale Planungs-Board',
    startDate: sprintStart.toISOString(),
    endDate: sprintEnd.toISOString(),
    teamIds: [team1Id, team2Id, team4Id],
    projectIds: [project1Id, project2Id],
    createdAt: now,
  });

  store.teams[0].boardId = boardId;

  // ── Tickets ───────────────────────────────────────────────────────────────
  const t = (n) => `TKT-${String(n).padStart(4, '0')}`;
  const ids = Array.from({ length: 8 }, () => uuidv4());
  store.settings.ticketCounter = 9;

  store.tickets.push(
    {
      id: ids[0], ticketNumber: t(1),
      title: 'Backend API aufsetzen',
      description: 'Express.js Backend mit allen Endpunkten implementieren',
      status: 'done', priority: 'high',
      assigneeId: miladId, createdBy: miladId, projectId: project1Id, boardId, sprintId, teamId: team1Id,
      checklist: [
        { id: uuidv4(), text: 'Express einrichten',    done: true },
        { id: uuidv4(), text: 'Routen implementieren', done: true },
      ],
      dependencies: [], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'draft', to: 'done', changedBy: miladId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[1], ticketNumber: t(2),
      title: 'Frontend Login-Seite',
      description: 'Login und Registrierung im Frontend implementieren',
      status: 'in_progress', priority: 'high',
      assigneeId: thomasWolffId, createdBy: miladId, projectId: project1Id, boardId, sprintId, teamId: team1Id,
      checklist: [
        { id: uuidv4(), text: 'Login-Formular erstellen', done: true },
        { id: uuidv4(), text: 'JWT speichern',            done: false },
      ],
      dependencies: [ids[0]], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'planned', to: 'in_progress', changedBy: thomasWolffId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[2], ticketNumber: t(3),
      title: 'Dashboard Statistiken',
      description: 'KPI-Karten auf dem Dashboard anzeigen',
      status: 'planned', priority: 'medium',
      assigneeId: mircoId, createdBy: miladId, projectId: project1Id, boardId, sprintId, teamId: team1Id,
      checklist: [], dependencies: [ids[1]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[3], ticketNumber: t(4),
      title: 'Design System erstellen',
      description: 'Komponenten-Bibliothek und Design-Tokens definieren',
      status: 'review', priority: 'medium',
      assigneeId: cindyId, createdBy: kayId, projectId: project2Id, boardId, sprintId, teamId: team2Id,
      checklist: [
        { id: uuidv4(), text: 'Farben definieren',          done: true  },
        { id: uuidv4(), text: 'Typografie festlegen',       done: true  },
        { id: uuidv4(), text: 'Komponenten dokumentieren',  done: false },
      ],
      dependencies: [], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'in_progress', to: 'review', changedBy: cindyId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[4], ticketNumber: t(5),
      title: 'API-Dokumentation',
      description: 'Alle Endpunkte dokumentieren',
      status: 'draft', priority: 'low',
      assigneeId: null, createdBy: adminId, projectId: project3Id, boardId: null, sprintId: null, teamId: team1Id,
      checklist: [], dependencies: [ids[0]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[5], ticketNumber: t(6),
      title: 'Testautomatisierung einrichten',
      description: 'Unit- und Integrationstests mit Vitest aufsetzen',
      status: 'planned', priority: 'high',
      assigneeId: torstenKloseId, createdBy: torstenKloseId, projectId: project1Id, boardId, sprintId, teamId: team4Id,
      checklist: [
        { id: uuidv4(), text: 'Vitest konfigurieren', done: false },
        { id: uuidv4(), text: 'Erste Tests schreiben', done: false },
      ],
      dependencies: [ids[0], ids[1]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[6], ticketNumber: t(7),
      title: 'Onboarding-Flow für neue Mitglieder',
      description: 'Willkommensseite und Ersteinrichtung vereinfachen',
      status: 'in_progress', priority: 'medium',
      assigneeId: lisaId, createdBy: kayId, projectId: project2Id, boardId, sprintId, teamId: team2Id,
      checklist: [
        { id: uuidv4(), text: 'Wireframes erstellen', done: true  },
        { id: uuidv4(), text: 'Prototyp bauen',       done: false },
      ],
      dependencies: [ids[3]], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'draft', to: 'in_progress', changedBy: lisaId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[7], ticketNumber: t(8),
      title: 'Performance-Analyse Q3',
      description: 'Ladezeiten messen und Engpässe identifizieren',
      status: 'draft', priority: 'medium',
      assigneeId: kevinId, createdBy: torstenKloseId, projectId: project3Id, boardId: null, sprintId: null, teamId: team4Id,
      checklist: [], dependencies: [ids[5]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
  );

  // ── Sprint ────────────────────────────────────────────────────────────────
  store.sprints.push({
    id: sprintId,
    name: 'Sprint 1',
    description: 'Erster Sprint des Projekts',
    status: 'active',
    startDate: sprintStart.toISOString(),
    endDate: sprintEnd.toISOString(),
    projectIds: [project1Id, project2Id],
    ticketIds: [ids[0], ids[1], ids[2], ids[3], ids[5], ids[6]],
    createdAt: now,
  });

  console.log(`Seed-Daten angelegt: ${store.users.length} Benutzer, ${store.teams.length} Teams, ${store.tickets.length} Tickets`);
}
