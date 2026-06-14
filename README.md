# PlannerUI

Projektmanagement-Anwendung mit Vue 3 Frontend und Node.js Backend — entwickelt als MVP für Team-Planung, Kanban-Boards, Ticketsystem und Teamverwaltung.

---

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | Vue 3 (Composition API), Vite 8, Pinia, Vue Router, TailwindCSS |
| Backend | Node.js, Express.js, JWT-Authentifizierung |
| Datenhaltung | In-Memory-Store (kein Datenbankserver notwendig) |
| Authentifizierung | JWT + Cookie (30 Tage) / SessionStorage |

---

## Projektstruktur

```
PlannerUI/
├── backend/
│   ├── data/
│   │   └── store.js          # In-Memory-Datenbank + Seed-Daten
│   ├── middleware/
│   │   └── auth.js           # JWT-Middleware, requireAdmin
│   ├── routes/
│   │   ├── auth.js           # Login, Register, Me
│   │   ├── users.js          # Benutzerverwaltung, Rollenänderung, Suche
│   │   ├── teams.js          # Teams, Mitglieder, Ownership-Transfer
│   │   ├── projects.js       # Projekte
│   │   ├── tickets.js        # Tickets, Kommentare, Checklisten, Clone
│   │   ├── boards.js         # Kanban-Boards
│   │   ├── sprints.js        # Sprints
│   │   ├── chat.js           # Zentraler Chat mit @mentions
│   │   ├── settings.js       # Ticket-Präfix & Zähler
│   │   └── dashboard.js      # Statistiken
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── common/       # BaseModal, ToastContainer, PriorityBadge …
│       │   ├── kanban/       # TicketCard
│       │   ├── layout/       # AppHeader, AppLayout
│       │   └── tickets/      # TicketModal, ChecklistItem
│       ├── composables/
│       │   └── useToast.js   # Toast-Singleton
│       ├── router/
│       │   └── index.js      # Vue Router mit Auth-Guard
│       ├── services/
│       │   └── api.js        # Axios-Instanz mit Token-Interceptor
│       ├── stores/           # Pinia Stores (auth, teams, boards, …)
│       └── views/            # Alle Seiten-Komponenten
└── .gitignore
```

---

## Installation & Start

### Voraussetzungen
- Node.js ≥ 18
- npm ≥ 9

### Backend starten

```bash
cd backend
npm install
node server.js
# → http://localhost:3000
```

### Frontend starten

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Demo-Zugangsdaten

| Rolle | E-Mail | Passwort |
|---|---|---|
| Admin | admin@planner.dev | admin123 |
| Owner (Milad) | milad@planner.dev | owner123 |
| Owner (Kay) | kay@planner.dev | owner123 |
| Benutzer | thomas.wolff@planner.dev | user123 |
| Benutzer | torsten.klose@planner.dev | user123 |
| Benutzer | cindy.scholka@planner.dev | user123 |

Alle weiteren Benutzer (`user123`): `harald.huebner`, `mirco.martin`, `thomas.wunderlich`, `lisa.hartmann`, `kevin.mueller`, `sandra.braun`, `felix.schmidt` — jeweils `@planner.dev`

---

## Rollen & Berechtigungen

| Rolle | Beschreibung |
|---|---|
| **admin** | Systemadministrator — verwaltet Benutzer, Rollen, Teams, Boards, Ticket-Einstellungen. Gehört zu keinem Team. |
| **owner** | Product Owner — leitet ein Team. Pro Team genau ein Owner. |
| **user** | Standardmitglied — kann Tickets, Kommentare, Checklisten bearbeiten. |

---

## Features

### Authentifizierung
- Login mit E-Mail und Passwort
- **„Angemeldet bleiben"** — Token wird als Cookie (30 Tage) gespeichert, E-Mail wird vorausgefüllt
- Ohne „Angemeldet bleiben" — Token nur in SessionStorage (Sitzung)
- Passwort-Anzeige (Auge-Icon) im Login-Formular

### Dashboard
- KPI-Karten: offene Tickets, aktive Sprints, Teammitglieder
- Aktivitäts-Feed

### Kanban-Board
- Drag & Drop zwischen Status-Spalten
- Ticket-Nummern auf jeder Karte (z. B. `TKT-0001`)
- Ticket-Modal mit Details, Checkliste und Verlauf

### Tickets
- Automatisch aufsteigende Ticketnummer (Präfix konfigurierbar)
- Status: Draft → Geplant → In Arbeit → Review → Abschlossen
- Priorität, Zuweisung, Projekt, Sprint
- Checkliste mit Fortschrittsanzeige
- Kommentare mit `@mention`-Unterstützung
- Klonen mit neuer Ticketnummer
- Verlaufsprotokoll aller Status-Änderungen

### Teams
- Pro Team genau **ein Product Owner**
- Ownership kann per Knopfdruck übertragen werden
- Admin kann kein Team-Mitglied sein (Einzelrolle)
- Mitglieder-Suche mit Debounce; Admins und bereits vorhandene Mitglieder werden automatisch ausgefiltert

### Chat
- Zentraler Team-Chat mit Echtzeit-Polling (5 s)
- `@username` hebt Erwähnungen hervor
- `#TKT-0001` verlinkt auf das entsprechende Ticket

### Admin-Bereich (nur Admins)
- **Benutzer:** Rollen (admin / owner / user) per Dropdown vergeben
- **Teams:** alle Teams einsehen und löschen
- **Boards:** alle Boards einsehen und löschen
- **Einstellungen:** Ticket-Präfix (z. B. `FEED`, `TKG`) und Startzähler anpassen, Vorschau der nächsten Nummer

### Weitere
- Dark / Light Mode
- Toast-Benachrichtigungen (Erfolg, Fehler, Info, Warnung)
- Responsive Design (Mobile-freundlich)

---

## API-Übersicht

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/auth/login` | Anmelden |
| POST | `/api/auth/register` | Registrieren |
| GET | `/api/auth/me` | Aktueller Benutzer |
| GET | `/api/users` | Alle Benutzer |
| GET | `/api/users/search?q=` | Benutzer suchen |
| PUT | `/api/users/:id/role` | Rolle setzen (Admin) |
| GET/POST | `/api/teams` | Teams abrufen / erstellen |
| POST | `/api/teams/:id/members` | Mitglied hinzufügen |
| PUT | `/api/teams/:id/members/:uid/role` | Ownership übertragen |
| DELETE | `/api/teams/:id/members/:uid` | Mitglied entfernen |
| GET/POST | `/api/tickets` | Tickets abrufen / erstellen |
| PUT | `/api/tickets/:id` | Ticket aktualisieren |
| POST | `/api/tickets/:id/clone` | Ticket klonen |
| GET/POST | `/api/tickets/:id/comments` | Kommentare |
| GET/POST | `/api/chat/messages` | Chat-Nachrichten |
| GET | `/api/settings` | Ticket-Einstellungen |
| PUT | `/api/settings/ticket-prefix` | Präfix setzen (Admin) |
| PUT | `/api/settings/ticket-counter` | Zähler setzen (Admin) |

---

## Changelog

### v0.3.0 — Vollausbau MVP
- Rollensystem mit `requireAdmin`-Middleware
- Ticket-Nummern (automatisch, Präfix konfigurierbar)
- Chat mit @mentions und #Ticket-Referenzen
- Admin-Bereich (Benutzer, Teams, Boards, Einstellungen)
- Team-Regeln: ein Owner pro Team, Ownership-Transfer, Admin-Ausschluss
- 13 Seed-Benutzer, 4 Teams, 8 Tickets

### v0.2.0 — Authentifizierung & Navigation
- Login mit „Angemeldet bleiben" (Cookie 30 Tage)
- Rollenbasierte Navigation (Admin sieht Admin-Bereich)
- Toast-System
- TeamsView: Benutzernamen statt UserIDs

### v0.1.0 — Initiales Setup
- Vue 3 + Vite 8 + TailwindCSS
- Express-Backend mit JWT
- Kanban-Board mit Drag & Drop
- Projekte, Teams, Sprints

---

## Bekannte Einschränkungen (MVP)

- Daten liegen **im Arbeitsspeicher** — nach Backend-Neustart werden die Seed-Daten neu geladen
- Kein Datei-Upload für Avatare
- Chat ohne WebSocket (Polling alle 5 Sekunden)
