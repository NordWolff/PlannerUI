import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const store = {
  users: [],
  teams: [],
  planners: [],
  projects: [],
  tickets: [],
  boards: [],
  sprints: [],
  messages: [],
  adminRequests: [],
  notifications: [],
  settings: {
    ticketPrefix: 'TKT',
    ticketCounter: 1,
  },
  onlineStatus: {}, // { [userId]: { online: bool, lastSeen: number (ms) } }
};

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

  const ownerHash  = await bcrypt.hash('owner123', 10);
  const userHash   = await bcrypt.hash('user123',  10);

  // ── IDs ──────────────────────────────────────────────────────────────────
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
    favorites: { teamId: null, projectId: null, boardId: null, plannerId: null },
    createdAt: now,
  });

  store.users.push(
    makeUser(miladId,        'Milad',             'milad@planner.dev',             ownerHash,  'owner'),
    makeUser(kayId,          'Kay',               'kay@planner.dev',               ownerHash,  'owner'),
    makeUser(thomasWolffId,  'Thomas Wolff',      'thomas.wolff@planner.dev',      userHash,   'admin'),
    makeUser(torstenKloseId, 'Torsten Klose',     'torsten.klose@planner.dev',     userHash,   'user'),
    makeUser(cindyId,        'Cindy Scholka',     'cindy.scholka@planner.dev',     userHash,   'user'),
    makeUser(haraldId,       'Harald Hübner',     'harald.huebner@planner.dev',    userHash,   'user'),
    makeUser(mircoId,        'Mirco Martin',      'mirco.martin@planner.dev',      userHash,   'user'),
    makeUser(thomasWId,      'Thomas Wunderlich', 'thomas.wunderlich@planner.dev', userHash,   'user'),
    makeUser(lisaId,         'Lisa Hartmann',     'lisa.hartmann@planner.dev',     userHash,   'user'),
    makeUser(kevinId,        'Kevin Müller',      'kevin.mueller@planner.dev',     userHash,   'user'),
    makeUser(sandraId,       'Sandra Braun',      'sandra.braun@planner.dev',      userHash,   'user'),
    makeUser(felixId,        'Felix Schmidt',     'felix.schmidt@planner.dev',     userHash,   'user'),
  );

  // ── Planner-IDs (müssen vor Teams deklariert sein) ───────────────────────
  const planner1Id = uuidv4(); // Entwicklungs-Planner
  const planner2Id = uuidv4(); // Design-Planner
  const planner3Id = uuidv4(); // Management-Planner
  const systemSupportPlannerId = uuidv4(); // System-Support Planner (Systemstandard)

  // ── Teams ─────────────────────────────────────────────────────────────────
  const team1Id = uuidv4(); // Entwicklung
  const team2Id = uuidv4(); // Design
  const team3Id = uuidv4(); // Management
  const team4Id = uuidv4(); // QA & Testing
  const systemSupportTeamId = uuidv4(); // System-Support Team

  store.teams.push(
    {
      id: team1Id,
      name: 'Entwicklung',
      description: 'Backend- und Frontend-Entwicklung',
      plannerId: planner1Id,
      boardId: null,
      members: [
        { userId: miladId,        role: 'owner'  },
        { userId: thomasWolffId,  role: 'user' },
        { userId: torstenKloseId, role: 'user' },
        { userId: mircoId,        role: 'user' },
        { userId: felixId,        role: 'user' },
      ],
      createdAt: now,
    },
    {
      id: team2Id,
      name: 'Design',
      description: 'UX/UI Design und Kreation',
      plannerId: planner2Id,
      boardId: null,
      members: [
        { userId: kayId,     role: 'owner'  },
        { userId: cindyId,   role: 'user' },
        { userId: lisaId,    role: 'user' },
        { userId: sandraId,  role: 'user' },
      ],
      createdAt: now,
    },
    {
      id: team3Id,
      name: 'Management',
      description: 'Projektleitung und Koordination',
      plannerId: planner3Id,
      boardId: null,
      members: [
        { userId: miladId,   role: 'owner'  },
        { userId: kayId,     role: 'user' },
        { userId: thomasWId, role: 'user' },
        { userId: haraldId,  role: 'user' },
      ],
      createdAt: now,
    },
    {
      id: team4Id,
      name: 'QA & Testing',
      description: 'Qualitätssicherung und Testautomatisierung',
      plannerId: planner1Id,
      boardId: null,
      members: [
        { userId: torstenKloseId, role: 'owner'  },
        { userId: kevinId,        role: 'user' },
        { userId: thomasWId,      role: 'user' },
        { userId: felixId,        role: 'user' },
      ],
      createdAt: now,
    },
    {
      id: systemSupportTeamId,
      name: 'System-Support',
      description: 'Das Support-Team — alle System-Admins sind automatisch Mitglied.',
      plannerId: systemSupportPlannerId,
      isSystemSupport: true,
      boardId: null,
      members: store.users.filter(u => u.role === 'admin').map(u => ({ userId: u.id, role: 'user' })),
      createdAt: now,
    },
  );

  // ── Planner ───────────────────────────────────────────────────────────────
  store.planners.push(
    {
      id: planner1Id,
      name: 'Entwicklungs-Planner',
      description: 'Planner für das Entwicklungs- und QA-Team',
      createdBy: miladId,
      members: [
        { userId: miladId,        role: 'admin'  },
        { userId: thomasWolffId,  role: 'user' },
        { userId: torstenKloseId, role: 'user' },
        { userId: mircoId,        role: 'user' },
        { userId: felixId,        role: 'user' },
        { userId: kevinId,        role: 'user' },
        { userId: thomasWId,      role: 'user' },
      ],
      ticketPrefix: 'ENT',
      ticketCounter: 15,
      createdAt: now,
    },
    {
      id: planner2Id,
      name: 'Design-Planner',
      description: 'Planner für das Design-Team',
      createdBy: kayId,
      members: [
        { userId: kayId,    role: 'admin'  },
        { userId: cindyId,  role: 'user' },
        { userId: lisaId,   role: 'user' },
        { userId: sandraId, role: 'user' },
      ],
      ticketPrefix: 'DSN',
      ticketCounter: 15,
      createdAt: now,
    },
    {
      id: planner3Id,
      name: 'Management-Planner',
      description: 'Planner für Projektleitung und übergreifende Koordination',
      createdBy: miladId,
      members: [
        { userId: miladId,   role: 'admin'  },
        { userId: kayId,     role: 'user' },
        { userId: thomasWId, role: 'user' },
        { userId: haraldId,  role: 'user' },
      ],
      ticketPrefix: 'MGT',
      ticketCounter: 1,
      createdAt: now,
    },
    {
      id: systemSupportPlannerId,
      name: 'System-Support',
      description: 'Systemstandard-Planner für Support-Anfragen und internes Feedback. Alle System-Admins sind automatisch Mitglied.',
      createdBy: thomasWolffId,
      isSystemSupport: true,
      members: store.users.filter(u => u.role === 'admin').map(u => ({ userId: u.id, role: 'admin' })),
      ticketPrefix: 'SUP',
      ticketCounter: 1,
      color: '#6366f1',
      createdAt: now,
    },
  );

  // ── System-Support Projekt ────────────────────────────────────────────────
  const supportProjectId = uuidv4();
  store.projects.push({
    id: supportProjectId,
    name: 'Support-Anfragen',
    description: 'Eingehende Benutzeranfragen und Feedback aus dem Anfrage-Formular',
    status: 'active',
    plannerId: systemSupportPlannerId,
    sprintIds: [],
    startDate: null,
    endDate: null,
    createdAt: now,
  });

  // ── Sprints ───────────────────────────────────────────────────────────────
  const sprint1Id = uuidv4(); // für planner1
  const sprint2Id = uuidv4(); // für planner2
  const sprint3Id = uuidv4(); // für planner3 (noch nicht gestartet)

  const sprintStart = new Date(today);
  sprintStart.setDate(today.getDate() - 3);
  const sprintEnd = new Date(today);
  sprintEnd.setDate(today.getDate() + 11);

  // ── Projekte ──────────────────────────────────────────────────────────────
  const project1Id = uuidv4();
  const project2Id = uuidv4();
  const project3Id = uuidv4();
  const project4Id = uuidv4();
  const project5Id = uuidv4();

  const p1Start = new Date(today); p1Start.setDate(p1Start.getDate() - 30);
  const p1End   = new Date(today); p1End.setDate(p1End.getDate() + 90);
  const p2Start = new Date(today); p2Start.setDate(p2Start.getDate() - 14);
  const p2End   = new Date(today); p2End.setDate(p2End.getDate() + 45);
  const p3Start = new Date(today); p3Start.setDate(p3Start.getDate() + 14);
  const p4Start = new Date(today); p4Start.setDate(p4Start.getDate() - 7);
  const p4End   = new Date(today); p4End.setDate(p4End.getDate() + 60);
  const p5Start = new Date(today); p5Start.setDate(p5Start.getDate() - 5);
  const p5End   = new Date(today); p5End.setDate(p5End.getDate() + 30);

  store.projects.push(
    {
      id: project1Id,
      name: 'Planner MVP',
      description: 'Das MVP-Projekt für den Planner',
      status: 'active',
      plannerId: planner1Id,
      sprintIds: [sprint1Id],
      startDate: p1Start.toISOString(),
      endDate: p1End.toISOString(),
      createdAt: now,
    },
    {
      id: project2Id,
      name: 'UI Redesign',
      description: 'Neugestaltung der Benutzeroberfläche',
      status: 'active',
      plannerId: planner2Id,
      sprintIds: [sprint2Id],
      startDate: p2Start.toISOString(),
      endDate: p2End.toISOString(),
      createdAt: now,
    },
    {
      id: project3Id,
      name: 'API Integration',
      description: 'Integration externer APIs und Drittanbieter-Services',
      status: 'active',
      plannerId: planner1Id,
      sprintIds: [],
      startDate: p3Start.toISOString(),
      endDate: null,
      createdAt: now,
    },
    {
      id: project4Id,
      name: 'Brand Guidelines',
      description: 'Markenrichtlinien und Corporate Identity festlegen',
      status: 'active',
      plannerId: planner2Id,
      sprintIds: [sprint2Id],
      startDate: p4Start.toISOString(),
      endDate: p4End.toISOString(),
      createdAt: now,
    },
    {
      id: project5Id,
      name: 'Q3 Roadmap',
      description: 'Quartalsziele und Meilensteine für Q3',
      status: 'active',
      plannerId: planner3Id,
      sprintIds: [],
      startDate: p5Start.toISOString(),
      endDate: p5End.toISOString(),
      createdAt: now,
    },
  );

  // ── Boards ────────────────────────────────────────────────────────────────
  const board1Id = uuidv4(); // für planner1
  const board2Id = uuidv4(); // für planner2
  const board3Id = uuidv4(); // für planner3

  store.boards.push(
    {
      id: board1Id,
      name: 'Entwicklungs-Board',
      description: 'Das zentrale Board für Entwicklung und QA',
      plannerId: planner1Id,
      startDate: sprintStart.toISOString(),
      endDate: sprintEnd.toISOString(),
      teamIds: [team1Id, team4Id],
      projectIds: [project1Id, project3Id],
      createdAt: now,
    },
    {
      id: board2Id,
      name: 'Design-Board',
      description: 'Das Board für das Design-Team',
      plannerId: planner2Id,
      startDate: sprintStart.toISOString(),
      endDate: sprintEnd.toISOString(),
      teamIds: [team2Id],
      projectIds: [project2Id, project4Id],
      createdAt: now,
    },
    {
      id: board3Id,
      name: 'Management-Board',
      description: 'Übergreifende Aufgaben und Koordination',
      plannerId: planner3Id,
      startDate: sprintStart.toISOString(),
      endDate: sprintEnd.toISOString(),
      teamIds: [team3Id],
      projectIds: [project5Id],
      createdAt: now,
    },
  );

  store.teams[0].boardId = board1Id;

  // ── Tickets ───────────────────────────────────────────────────────────────
  const e = (n) => `ENT-${String(n).padStart(4, '0')}`;
  const d = (n) => `DSN-${String(n).padStart(4, '0')}`;
  const m = (n) => `MGT-${String(n).padStart(4, '0')}`;
  const ids = Array.from({ length: 14 }, () => uuidv4());
  // Globaler Zähler bleibt als Fallback; Planner-Zähler stehen im Planner-Objekt

  store.tickets.push(
    {
      id: ids[0], ticketNumber: e(1),
      title: 'Backend API aufsetzen',
      description: 'Express.js Backend mit allen Endpunkten implementieren',
      status: 'done', priority: 'high',
      assigneeId: miladId, createdBy: miladId, projectId: project1Id, boardId: board1Id, sprintId: sprint1Id, teamId: team1Id,
      checklist: [
        { id: uuidv4(), text: 'Express einrichten',    done: true },
        { id: uuidv4(), text: 'Routen implementieren', done: true },
      ],
      dependencies: [], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'draft', to: 'done', changedBy: miladId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[1], ticketNumber: e(2),
      title: 'Frontend Login-Seite',
      description: 'Login und Registrierung im Frontend implementieren',
      status: 'in_progress', priority: 'high',
      assigneeId: thomasWolffId, createdBy: miladId, projectId: project1Id, boardId: board1Id, sprintId: sprint1Id, teamId: team1Id,
      checklist: [
        { id: uuidv4(), text: 'Login-Formular erstellen', done: true },
        { id: uuidv4(), text: 'JWT speichern',            done: false },
      ],
      dependencies: [ids[0]], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'planned', to: 'in_progress', changedBy: thomasWolffId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[2], ticketNumber: e(3),
      title: 'Dashboard Statistiken',
      description: 'KPI-Karten auf dem Dashboard anzeigen',
      status: 'planned', priority: 'medium',
      assigneeId: mircoId, createdBy: miladId, projectId: project1Id, boardId: board1Id, sprintId: sprint1Id, teamId: team1Id,
      checklist: [], dependencies: [ids[1]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[3], ticketNumber: d(1),
      title: 'Design System erstellen',
      description: 'Komponenten-Bibliothek und Design-Tokens definieren',
      status: 'review', priority: 'medium',
      assigneeId: cindyId, createdBy: kayId, projectId: project2Id, boardId: board2Id, sprintId: sprint2Id, teamId: team2Id,
      checklist: [
        { id: uuidv4(), text: 'Farben definieren',         done: true  },
        { id: uuidv4(), text: 'Typografie festlegen',      done: true  },
        { id: uuidv4(), text: 'Komponenten dokumentieren', done: false },
      ],
      dependencies: [], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'in_progress', to: 'review', changedBy: cindyId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[4], ticketNumber: e(4),
      title: 'API-Dokumentation',
      description: 'Alle Endpunkte dokumentieren',
      status: 'draft', priority: 'low',
      assigneeId: null, createdBy: thomasWolffId, projectId: project3Id, boardId: null, sprintId: null, teamId: team1Id,
      checklist: [], dependencies: [ids[0]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[5], ticketNumber: e(5),
      title: 'Testautomatisierung einrichten',
      description: 'Unit- und Integrationstests mit Vitest aufsetzen',
      status: 'planned', priority: 'high',
      assigneeId: torstenKloseId, createdBy: torstenKloseId, projectId: project1Id, boardId: board1Id, sprintId: sprint1Id, teamId: team4Id,
      checklist: [
        { id: uuidv4(), text: 'Vitest konfigurieren',  done: false },
        { id: uuidv4(), text: 'Erste Tests schreiben', done: false },
      ],
      dependencies: [ids[0], ids[1]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[6], ticketNumber: d(2),
      title: 'Onboarding-Flow für neue Mitglieder',
      description: 'Willkommensseite und Ersteinrichtung vereinfachen',
      status: 'in_progress', priority: 'medium',
      assigneeId: lisaId, createdBy: kayId, projectId: project2Id, boardId: board2Id, sprintId: sprint2Id, teamId: team2Id,
      checklist: [
        { id: uuidv4(), text: 'Wireframes erstellen', done: true  },
        { id: uuidv4(), text: 'Prototyp bauen',       done: false },
      ],
      dependencies: [ids[3]], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'draft', to: 'in_progress', changedBy: lisaId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[7], ticketNumber: e(6),
      title: 'Performance-Analyse Q3',
      description: 'Ladezeiten messen und Engpässe identifizieren',
      status: 'draft', priority: 'medium',
      assigneeId: kevinId, createdBy: torstenKloseId, projectId: project3Id, boardId: board1Id, sprintId: null, teamId: team4Id,
      checklist: [], dependencies: [ids[5]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    // planner1 – weitere Tickets
    {
      id: ids[8], ticketNumber: e(7),
      title: 'Dark-Mode implementieren',
      description: 'Vollständige Dark-Mode-Unterstützung für alle Komponenten',
      status: 'in_progress', priority: 'medium',
      assigneeId: thomasWolffId, createdBy: miladId, projectId: project1Id, boardId: board1Id, sprintId: sprint1Id, teamId: team1Id,
      checklist: [
        { id: uuidv4(), text: 'Tailwind dark: Klassen ergänzen', done: true },
        { id: uuidv4(), text: 'Theme-Store anlegen',              done: true },
        { id: uuidv4(), text: 'Persistenz in localStorage',       done: false },
      ],
      dependencies: [], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'planned', to: 'in_progress', changedBy: thomasWolffId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[9], ticketNumber: e(8),
      title: 'Datenbankschema migrieren',
      description: 'In-Memory-Store auf persistente Datenbank vorbereiten',
      status: 'draft', priority: 'low',
      assigneeId: mircoId, createdBy: miladId, projectId: project3Id, boardId: board1Id, sprintId: null, teamId: team1Id,
      checklist: [], dependencies: [ids[0]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[10], ticketNumber: e(9),
      title: 'Testabdeckung erhöhen (>80 %)',
      description: 'Fehlende Unit-Tests ergänzen und Coverage-Report auswerten',
      status: 'planned', priority: 'high',
      assigneeId: torstenKloseId, createdBy: torstenKloseId, projectId: project1Id, boardId: board1Id, sprintId: sprint1Id, teamId: team4Id,
      checklist: [
        { id: uuidv4(), text: 'API-Routen testen',      done: false },
        { id: uuidv4(), text: 'Store-Logik testen',     done: false },
        { id: uuidv4(), text: 'Coverage-Badge einbinden', done: false },
      ],
      dependencies: [ids[5]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    // planner2 – weitere Tickets
    {
      id: ids[11], ticketNumber: d(3),
      title: 'Iconset auswählen und integrieren',
      description: 'Einheitliches Icon-System für die gesamte Anwendung definieren',
      status: 'done', priority: 'medium',
      assigneeId: sandraId, createdBy: kayId, projectId: project4Id, boardId: board2Id, sprintId: sprint2Id, teamId: team2Id,
      checklist: [
        { id: uuidv4(), text: 'Heroicons evaluieren', done: true },
        { id: uuidv4(), text: 'Icons einbinden',       done: true },
      ],
      dependencies: [], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'review', to: 'done', changedBy: kayId }],
      createdAt: now, updatedAt: now,
    },
    {
      id: ids[12], ticketNumber: d(4),
      title: 'Animationskonzept erstellen',
      description: 'Micro-Animationen und Übergänge für bessere UX definieren',
      status: 'planned', priority: 'low',
      assigneeId: cindyId, createdBy: kayId, projectId: project2Id, boardId: board2Id, sprintId: sprint2Id, teamId: team2Id,
      checklist: [], dependencies: [ids[3]], comments: [], chatRefs: [], history: [],
      createdAt: now, updatedAt: now,
    },
    // planner3 – Management-Tickets
    {
      id: ids[13], ticketNumber: m(1),
      title: 'Q3-Ziele mit Stakeholdern abstimmen',
      description: 'Workshop zur Priorisierung der Quartalsziele durchführen',
      status: 'in_progress', priority: 'high',
      assigneeId: thomasWId, createdBy: miladId, projectId: project5Id, boardId: board3Id, sprintId: null, teamId: team3Id,
      checklist: [
        { id: uuidv4(), text: 'Teilnehmer einladen',   done: true  },
        { id: uuidv4(), text: 'Agenda vorbereiten',     done: true  },
        { id: uuidv4(), text: 'Ergebnisse dokumentieren', done: false },
      ],
      dependencies: [], comments: [], chatRefs: [],
      history: [{ id: uuidv4(), changedAt: now, field: 'status', from: 'planned', to: 'in_progress', changedBy: thomasWId }],
      createdAt: now, updatedAt: now,
    },
  );

  // ── Sprints (nach Tickets, damit ticketIds korrekt befüllt werden können) ──
  const sprint3Start = new Date(today); sprint3Start.setDate(today.getDate() + 7);
  const sprint3End   = new Date(today); sprint3End.setDate(today.getDate() + 21);

  store.sprints.push(
    {
      id: sprint1Id,
      name: 'Sprint 1 – Entwicklung',
      description: 'Erster Sprint des Entwicklungs-Planners',
      status: 'active',
      plannerId: planner1Id,
      startDate: sprintStart.toISOString(),
      endDate: sprintEnd.toISOString(),
      projectIds: [project1Id],
      ticketIds: [ids[0], ids[1], ids[2], ids[5], ids[8], ids[10]],
      createdAt: now,
    },
    {
      id: sprint2Id,
      name: 'Sprint 1 – Design',
      description: 'Erster Sprint des Design-Planners',
      status: 'active',
      plannerId: planner2Id,
      startDate: sprintStart.toISOString(),
      endDate: sprintEnd.toISOString(),
      projectIds: [project2Id, project4Id],
      ticketIds: [ids[3], ids[6], ids[11], ids[12]],
      createdAt: now,
    },
    {
      id: sprint3Id,
      name: 'Sprint 1 – Management',
      description: 'Kick-off Sprint für den Management-Planner',
      status: 'planned',
      plannerId: planner3Id,
      startDate: sprint3Start.toISOString(),
      endDate: sprint3End.toISOString(),
      projectIds: [project5Id],
      ticketIds: [],
      createdAt: now,
    },
    {
      id: uuidv4(),
      name: 'Support Sprint 1',
      description: 'Erster Sprint des System-Support Planners',
      status: 'active',
      plannerId: systemSupportPlannerId,
      teamId: systemSupportTeamId,
      startDate: sprintStart.toISOString(),
      endDate: sprintEnd.toISOString(),
      projectIds: [supportProjectId],
      ticketIds: [],
      createdAt: now,
    },
  );

  console.log(`Seed-Daten angelegt: ${store.users.length} Benutzer, ${store.teams.length} Teams, ${store.planners.length} Planner, ${store.projects.length} Projekte, ${store.tickets.length} Tickets`);
}
