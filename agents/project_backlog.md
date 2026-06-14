# Planner — Projekt-Backlog

**Zuletzt aktualisiert:** 2026-06-14
**Fortschritt: 100% abgeschlossen**

---

## Legende
| Status | Bedeutung |
|--------|-----------|
| ✅ Abgeschlossen | Implementiert und gebaut |
| ⏳ Ausstehend | Noch nicht begonnen |

---

## Grundinfrastruktur

| Aufgabe | Status | Notizen |
|---------|--------|---------|
| Express.js Server + Middleware | ✅ | server.js, CORS, JWT-Auth |
| In-Memory-Datenspeicher mit Testdaten | ✅ | data/store.js mit seedData() |
| Vue 3 + **Vite 8.0.16** Projektstruktur | ✅ | Upgrade von v4 → v8 am 2026-06-14 |
| TailwindCSS + PostCSS | ✅ | tailwind.config.js |
| Vue Router mit Auth-Guard | ✅ | router/index.js |
| Pinia Store Setup | ✅ | stores/ |

---

## Backend APIs (alle vollständig)

| Route | Status | Endpunkte |
|-------|--------|-----------|
| /api/auth | ✅ | register, login, logout, me |
| /api/users | ✅ | GET/PUT me, GET all |
| /api/teams | ✅ | CRUD, addMember, removeMember |
| /api/projects | ✅ | CRUD, Sprint-Zuweisung |
| /api/tickets | ✅ | CRUD, Status-Update |
| /api/boards | ✅ | CRUD, Ticket-Status auf Board |
| /api/sprints | ✅ | CRUD, start, complete |
| /api/dashboard | ✅ | /stats, /activity |

---

## Frontend Stores (alle vollständig)

| Store | Status |
|-------|--------|
| stores/auth.js | ✅ |
| stores/teams.js | ✅ |
| stores/projects.js | ✅ |
| stores/tickets.js | ✅ |
| stores/boards.js | ✅ |
| stores/sprints.js | ✅ |
| stores/dashboard.js | ✅ |

---

## Frontend Views (alle vollständig)

| View | Status | Notizen |
|------|--------|---------|
| views/auth/LoginView.vue | ✅ | |
| views/auth/RegisterView.vue | ✅ | |
| views/DashboardView.vue | ✅ | KPIs, Board-Management |
| views/MyTeamView.vue | ✅ | Sprint-Autoauswahl, Team-Filter |
| views/TeamsView.vue | ✅ | CRUD, Mitgliedsverwaltung, Toast |
| views/ProjectsView.vue | ✅ | CRUD, Suche, Sprint-Zuordnung, Toast |
| views/KanbanView.vue | ✅ | Drag & Drop, Board-Auswahl, Filter |
| views/ReportsView.vue | ✅ | Statistik-Karten, Ticket-Tabelle |
| views/SettingsView.vue | ✅ | Avatar, Darkmode, Sprache, Profil, Toast |

---

## Frontend Komponenten (alle vollständig)

| Komponente | Status |
|------------|--------|
| components/layout/AppHeader.vue | ✅ |
| components/layout/AppLayout.vue | ✅ |
| components/common/BaseCard.vue | ✅ |
| components/common/BaseModal.vue | ✅ |
| components/common/SearchInput.vue | ✅ |
| components/common/StatusBadge.vue | ✅ |
| components/common/PriorityBadge.vue | ✅ |
| **components/common/ToastContainer.vue** | ✅ | Neu 2026-06-14 |
| components/kanban/KanbanBoard.vue | ✅ |
| components/kanban/KanbanColumn.vue | ✅ |
| components/kanban/TicketCard.vue | ✅ |
| components/tickets/TicketModal.vue | ✅ |
| components/tickets/ChecklistItem.vue | ✅ |

---

## Composables

| Composable | Status | Notizen |
|------------|--------|---------|
| **composables/useToast.js** | ✅ | Neu 2026-06-14 — success/error/info/warning mit Auto-Remove |

---

## Build-Status

| Datum | Vite-Version | Module | Ergebnis |
|-------|-------------|--------|---------|
| 2026-06-14 | 8.0.16 | 118 | ✅ Erfolgreich in 1.01s |

---

## Testdaten (Backend)
- Benutzer: admin@planner.de, thomas@planner.de
- 2 Teams, 3 Projekte mit Tickets, 1 aktiver Sprint
