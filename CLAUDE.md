# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend starten
```bash
cd backend && npm install && node server.js          # Port 3000
cd backend && npm run dev                             # Hot-reload via node --watch
```

### Frontend starten
```bash
cd frontend && npm install && npm run dev             # Port 5173
cd frontend && npm run build                          # Production-Build nach dist/
```

Beide Dienste müssen gleichzeitig laufen — Frontend zeigt keine Daten ohne laufendes Backend.

## Architektur

### Datenhaltung
Das Backend nutzt einen **In-Memory-Store** (`backend/data/store.js`). Es gibt keine Datenbank. Seed-Daten werden beim Start geladen. Nach Backend-Neustart sind alle Änderungen verloren — das ist bekannt und akzeptiert (MVP).

### Authentifizierung
- Token wird als `planner_token` Cookie (30 Tage, bei „Angemeldet bleiben") oder in `sessionStorage` gespeichert.
- Axios-Interceptor in `frontend/src/services/api.js` hängt den Token an alle Requests. Bei 401 → automatischer Logout + Redirect zu `/login`.
- Router-Guard in `frontend/src/router/index.js` prüft Token und Admin-Rolle. `/planner/:id/admin` ist nur für `role === 'admin'` zugänglich.
- Backend-Middleware: `authenticateToken` (alle geschützten Routes), `requireAdmin`, `requireAdminOrOwner` (Sprint-Schreibzugriff).

### Rollen
| Rolle | Berechtigung |
|---|---|
| `admin` | Systemverwaltung, gehört keinem Team an |
| `owner` | Product Owner eines Teams (genau einer pro Team) |
| `user` | Standard-Mitglied |

### Multi-Planner-Konzept (ab v2.0)
- **Planner** ist die oberste Einheit: Admin erstellt Planner, weist Teams und Benutzer zu.
- Jeder Planner hat eigene Projects → Tickets, Sprints, Boards, Kanban, Gantt.
- Benutzer sind global, können mehreren Plannern angehören.
- URL-Struktur: `/planners` (Auswahl) → `/planner/:plannerId/dashboard` (Inhalt).
- Aktiver Planner wird in `localStorage` als `planner_active_id` gespeichert.
- Beim Planner-Wechsel (`setActivePlanner`) werden Projects, Boards, Sprints und Tickets-Stores automatisch geleert.
- Alle Fetch-Funktionen der Stores akzeptieren `filters`-Objekt, das `plannerId` weitergeben kann.
- Seed-Daten: 3 Planner (Entwicklung, Design, Management), je mit eigenen Teams, Projekten und Tickets.
- **Sichtbarkeit:** `GET /api/planners` liefert standardmäßig nur Planner, in denen der angefragende Benutzer Mitglied ist — das gilt auch für `admin`/`owner`. Nur `GET /api/planners?all=true` (admin-only) liefert wirklich alle Planner; das nutzt ausschließlich der Admin-Bereich zur Systemverwaltung (`frontend/src/stores/planners.js`: `planners` = eigene Mitgliedschaft, `allPlanners` = alle Planner für Admin-Verwaltung, beide werden bei Mutationen synchron gehalten).

### Admin-Bereich (`AdminView.vue`, unter `/planner/:plannerId/admin`)
Tabs: Anfragen, **Alle Planner** (Planner anlegen/bearbeiten/löschen, Mitglieder, Teams, Ticket-Präfix pro Planner — system­weit, unabhängig von eigener Mitgliedschaft), Planner-Zugang (Mitglieder des aktuell aktiven Planners), Benutzer (Rollenverwaltung, mit Such­feld für Benutzername/E-Mail), **Teams** (Planner-Filter-Dropdown „Alle Planner“ oder ein bestimmter Planner aus `plannersStore.allPlanners`, um Teams systemweit zu verwalten — Planner-Badge pro Team bei „Alle Planner“), **Boards** (gleicher Planner-Filter-Mechanismus wie Teams; Board-Modal hat jetzt ein Planner-Auswahlfeld), Einstellungen (globaler Ticket-Präfix-Fallback + Präfix je Planner).

### Dashboard, Reports & Planner-Scoping
- **Dashboard** (`DashboardView.vue`) und **Reports** (`ReportsView.vue`) zeigen ausschließlich Daten des/der eigenen Planner — nicht systemweit:
  - Dashboard ist über `/planner/:plannerId/dashboard` immer an einen Planner gebunden; `GET /api/dashboard/stats` und `/activity` akzeptieren jetzt `?plannerId=` (Helper `scopedToPlanner()` in `backend/routes/dashboard.js`), `frontend/src/stores/dashboard.js`: `fetchStats(plannerId)` / `fetchActivity(plannerId)`.
  - Reports hat einen eigenen Planner-Filter ("Alle meine Planner" aggregiert über `plannersStore.planners`, oder ein bestimmter eigener Planner) — nutzt **keinen** gemeinsamen Store für Tickets, sondern lokale State + direkte `api`-Calls pro Planner-ID, um den global geteilten `ticketsStore` (von Kanban/Gantt/MeinTeam genutzt) nicht zu verunreinigen.
  - Admin-Bereich ist die einzige Stelle, an der absichtlich planner-übergreifend (auch ohne eigene Mitgliedschaft) gearbeitet wird (`allPlanners`, Teams-/Boards-Filter „Alle Planner“).

### Frontend-State (Pinia Stores)
Alle Stores liegen in `frontend/src/stores/`. Jeder Store ist selbstständig und ruft die API direkt über `api.js` auf.

### Composables (Singletons)
- `useToast()` — Modulebene-Singleton (`toasts` ref außerhalb der Funktion). Überall importierbar, teilt denselben State.
- `useUsers()` — Benutzer-Cache-Singleton (`fetched`-Flag verhindert doppelte API-Calls). Enthält `avatarUrl()` (generiert via `@dicebear/avataaars@9`) und `getOnlineStatus()`.
- `useHeartbeat()` — Sendet alle 60 s `POST /api/auth/heartbeat`.

### Avatare
Avatare werden **lokal** via `@dicebear/avataaars@9` aus dem Benutzernamen generiert (`frontend/src/utils/avatar.js`). Kein CDN, keine HTTP-Anfragen — Seed = `username`, deterministisch.

### Design-System
- **Primärfarbe:** Telekom-Magenta-Palette, definiert in `frontend/tailwind.config.js` (`theme.extend.colors.primary`), ausgerichtet an den [Telekom Scale Design Guidelines](https://telekom.github.io/scale/?path=/docs/guidelines-colors--page):
  - `primary` (`#E20074`, Telekom Magenta) · `primary-hover` (`#C70062`) · `primary-active` (`#A20050`) · `primary-light` (`#FCE5F1`) · `primary-disabled` (`#F1A8CE`)
  - Dark-Mode-Varianten (aufgehellt für Kontrast auf `#0e0d14`): `primary-dark` (`#FF0A78`) · `primary-dark-hover` (`#FF4FA0`) · `primary-dark-active` (`#E2006A`)
  - Verwendung app-weit über `bg-primary`, `text-primary`, `border-primary`, `ring-primary` (+ `dark:`-Varianten) statt der früheren `indigo-*`-Klassen — siehe `.btn-primary`/`.input-field` in `frontend/src/style.css` sowie `.brand-gradient`, `.app-header::after`, `.btn-create`, `.app-bg` für abgestimmte Magenta-Akzente.
- **Dark Mode:** `gray-900` Background, `gray-800` Surface. **Standardmäßig aktiv** (`frontend/src/App.vue` setzt die `dark`-Klasse, außer `localStorage.darkMode === 'false'`); Toggle in `SettingsView.vue`.
- **Status-Farben:** Draft=`gray-400`, Geplant=`blue-500`, In Arbeit=`yellow-500`, Review=`purple-500`, Abschlossen=`green-500`
- Kein Footer, keine Sidebar — vollflächiger Content unter dem Header (`h-16`).
- Komponentenstruktur: `components/common/` für wiederverwendbare Elemente, `components/kanban/` und `components/tickets/` für domänenspezifische Komponenten, `views/` für Seitenkomponenten.

### API-Basis
`http://localhost:3000/api` — fest in `frontend/src/services/api.js` konfiguriert.

### Gantt-Ansicht
`GanttView.vue` ist die komplexeste Komponente: scrollbarer Zeitstrahl mit Drag-to-Move, Resize-Handle, Zoom-Stufen (Woche/Monat/Quartal) und SVG-Bezier-Abhängigkeitspfeilen. Keine separate linke Spalte — der Projektbalken selbst dient als Auf-/Zuklapp-Button für die Ticket-Zeilen (Klick ohne Bewegung = Toggle, Ziehen = Termin verschieben).

## Demo-Zugangsdaten

| Rolle | E-Mail | Passwort | Planner-Zugang |
|---|---|---|---|
| Owner | milad@planner.dev | owner123 | Entwicklungs-Planner, Management-Planner |
| Owner | kay@planner.dev | owner123 | Design-Planner |
| Admin | thomas.wolff@planner.dev | user123 | Entwicklungs-Planner (Mitglied) |