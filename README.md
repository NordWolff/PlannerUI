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
│   │   └── store.js              # In-Memory-Datenbank + Seed-Daten
│   ├── middleware/
│   │   └── auth.js               # JWT-Middleware, requireAdmin
│   ├── routes/
│   │   ├── auth.js               # Login, Register, Me
│   │   ├── users.js              # Benutzerverwaltung, Rollenänderung, Suche
│   │   ├── teams.js              # Teams, Mitglieder, Ownership-Transfer
│   │   ├── projects.js           # Projekte
│   │   ├── tickets.js            # Tickets, Kommentare, Checklisten, Clone, Recent
│   │   ├── boards.js             # Kanban-Boards
│   │   ├── sprints.js            # Sprints
│   │   ├── chat.js               # Zentraler Chat mit @mentions
│   │   ├── settings.js           # Ticket-Präfix & Zähler
│   │   ├── admin-requests.js     # Benutzeranfragen (Feature/Bug an Admin)
│   │   └── dashboard.js          # Statistiken
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── common/           # BaseModal, ToastContainer, PriorityBadge, TicketTypeIcon …
│       │   ├── kanban/           # KanbanBoard, KanbanColumn, TicketCard
│       │   ├── layout/           # AppHeader, AppLayout
│       │   └── tickets/          # TicketModal, TicketDetail, ChecklistItem
│       ├── composables/
│       │   ├── useToast.js       # Toast-Singleton
│       │   └── useUsers.js       # Benutzer-Cache (Singleton, einmalig geladen)
│       ├── router/
│       │   └── index.js          # Vue Router mit Auth-Guard + Admin-Guard (/admin)
│       ├── services/
│       │   └── api.js            # Axios-Instanz mit Token-Interceptor
│       ├── stores/               # Pinia Stores (auth, teams, boards, tickets …)
│       ├── utils/
│       │   └── avatar.js         # Lokale Avataaars-Generierung (@dicebear/avataaars@9)
│       └── views/                # Alle Seiten-Komponenten
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

| Rolle | E-Mail | Passwort | Planner-Zugang |
|---|---|---|---|
| Admin | admin@planner.dev | admin123 | alle Planner |
| Owner (Milad) | milad@planner.dev | owner123 | Entwicklungs-Planner, Management-Planner |
| Owner (Kay) | kay@planner.dev | owner123 | Design-Planner |
| Benutzer | thomas.wolff@planner.dev | user123 | Entwicklungs-Planner |
| Benutzer | torsten.klose@planner.dev | user123 | Entwicklungs-Planner |
| Benutzer | cindy.scholka@planner.dev | user123 | Design-Planner |

Alle weiteren Benutzer (Passwort `user123`): `harald.huebner`, `mirco.martin`, `thomas.wunderlich`, `lisa.hartmann`, `kevin.mueller`, `sandra.braun`, `felix.schmidt` — jeweils `@planner.dev`

---

## Rollen & Berechtigungen

| Rolle | Beschreibung |
|---|---|
| **admin** | Systemadministrator — verwaltet Benutzer, Rollen, Teams, Boards, Ticket-Einstellungen. Gehört zu keinem Team. |
| **owner** | Product Owner — leitet ein Team. Pro Team genau ein Owner. |
| **user** | Standardmitglied — kann Tickets, Kommentare, Checklisten bearbeiten. Tickets zuweisen. |

---

## Features

### Authentifizierung
- Login mit E-Mail und Passwort
- **„Angemeldet bleiben"** — Token wird als Cookie (30 Tage) gespeichert, E-Mail wird vorausgefüllt
- Ohne „Angemeldet bleiben" — Token nur in SessionStorage (Sitzung)
- Passwort-Anzeige (Auge-Icon) im Login-Formular

### Dashboard
- KPI-Karten: Teams, Projekte, Tickets, Boards
- Aktueller Sprint mit Zeitraum
- Board-Management (erstellen, bearbeiten, löschen)
- Ticket-Statusverteilung als Balkengrafik

### Kanban-Board
- 5 Spalten: Draft → Geplant → In Arbeit → Review → Abschlossen
- Drag & Drop zwischen Spalten
- Alle Spalten verteilen sich gleichmäßig — kein horizontales Scrollen
- **Ticket-Karte zeigt:**
  - Ticketnummer (z. B. `TKT-0001`)
  - Titel (bis 2 Zeilen)
  - Prioritäts-Badge
  - **Ticket-Art-Icon** unten rechts (Bootstrap Icons SVGs — Bug, Feature, Verbesserung, Frage, Epic, Aufgabe)
  - Checklisten-Fortschritt (z. B. `1/3`)
  - **Avatar des zugewiesenen Benutzers** (oder gestrichelter Kreis wenn nicht zugewiesen)
- **„Zeitstrahl"-Button** in der Kopfzeile wechselt zur Gantt-Ansicht

### Gantt-Zeitstrahl (`/gantt`)
- **Projekte als horizontale Balken** auf einem scrollbaren Zeitstrahl (Violett-Gradient)
- **Zoom-Stufen:** Woche (28 px/Tag) · Monat (12 px/Tag) · Quartal (4 px/Tag)
- **Zeitraum-Picker** (Von/Bis) für frei wählbaren Betrachtungszeitraum
- **Heute-Linie** (rote vertikale Linie mit Punkt) immer sichtbar
- **Monat-Gitterlinien** als visuelle Orientierung
- **Drag-to-Move:** Projektbalken horizontal ziehen → Start- und Enddatum werden automatisch per API gespeichert
- **Resize-Handle** am rechten Balkenrand → Enddatum verschieben
- **Expandierbare Ticket-Listen** — `▶`-Button klappt alle Tickets eines Projekts darunter auf (Titel + Status-Badge)
- **Abhängigkeits-Pfeile** — Toggle-Button blendet Bezier-Kurven zwischen abhängigen Tickets ein/aus
- Projekte ohne Startdatum werden ausgeblendet; offenes Enddatum wird als 30-Tage-Vorschau dargestellt
- Linke Spalte (240 px) mit Projekt- und Ticket-Namen bleibt beim horizontalen Scrollen fixiert

### Tickets
- Automatisch aufsteigende Ticketnummer (Präfix konfigurierbar, z. B. `TKT-0001`, `FEED-0042`)
- **Zuweisung an beliebige Benutzer** — alle Rollen können zuweisen
- Standardwert beim Erstellen: `— Nicht zugewiesen —`
- Status: Draft → Geplant → In Arbeit → Review → Abschlossen
- Priorität: Niedrig / Mittel / Hoch / Kritisch
- Projekt- und Sprint-Zuweisung
- Checkliste mit Fortschrittsbalken
- **Kommentare** mit Avatar, Autorenname und relativem Zeitstempel
  - `@mention`-Unterstützung
  - **Reaktionen** 👍 👎 ❤️ pro Kommentar (Toggle, Zähler, eigene Reaktion hervorgehoben)
  - Strg+Enter oder Senden-Button zum Absenden
- Klonen mit neuer Ticketnummer
- Verlaufsprotokoll aller Status-Änderungen

### Mein Team
- **Eigenes Team automatisch vorausgewählt** im Dropdown (auch nach Seiten-Reload)
- **Header-Dropdown „Mein Team"**: zeigt die letzten 8 bearbeiteten Tickets mit Status-Badge — Klick öffnet direkt das TicketModal
- **Konfigurierbare Standard-Ansicht** in den Einstellungen (Liste oder Board) — wird in localStorage gespeichert
- Eigene zugewiesene Tickets als **Tabelle** (mit Avatar-Spalte) oder **Mini-Kanban-Board** (mit Avatar oben rechts auf der Karte)
- **Vollseiten-Detailansicht** — Klick auf ein Ticket öffnet keine Modal mehr, sondern eine vollseitige Ansicht:
  - Klebende Kopfzeile: ← Zurück, Ticketnummer + Typ-Icon, Assignee-Avatar rechts (klickbar zum Ändern)
  - **Hover-to-Edit** für alle Felder: Im Lesemode als normaler Text dargestellt; Hover zeigt Stift-Icon + Hintergrundfarbe; Klick aktiviert Inline-Editor (kein Speichern-Button nötig — speichert automatisch beim Verlassen)
  - Felder: Titel, Status, Priorität, Art (mit Icon), Projekt, Sprint, Beschreibung
  - Tabs: Checkliste, Kommentare, Anhänge, Verlauf

### Teams & Sprints
- Pro Team genau **ein Product Owner**
- Ownership per Knopfdruck übertragen (bisheriger Owner wird Mitglied)
- Admin kann kein Team-Mitglied sein (Einzelrolle)
- Mitglieder-Suche mit Debounce; Admins und bereits vorhandene Mitglieder werden ausgefiltert
- Hinweis wenn kein Product Owner vorhanden
- **Sprint-Verwaltung** direkt auf der Teams-Seite (unterhalb der Team-Karten):
  - Sprints erstellen, bearbeiten, starten, abschließen und löschen
  - Status-Flow: Planung → Aktiv → Abgeschlossen
  - Nur Admin und Owner haben Schreibzugriff

### Chat
- Direktnachrichten zwischen Benutzern (zwei-Panel-Layout: Kontaktliste + Chatfenster)
- Echtzeit-Polling (5 s), Konversationen nach letzter Nachricht sortiert
- **Online-Status** in der Kontaktliste (farbiger Punkt unten rechts am Avatar) und im Chat-Header mit Textanzeige
- `@username` hebt Erwähnungen hervor
- `#TKT-0001` — existierende Tickets werden als klickbares Badge gerendert und öffnen das TicketModal per Klick; nicht-existierende Nummern erscheinen als grauer Monospace-Text

### Multi-Planner (`/planners`)
- **Planner** ist die oberste Organisationseinheit — jeder Planner hat eigene Teams, Projekte, Sprints, Boards und Tickets
- Benutzer sind global und können mehreren Plannern angehören (mit je eigener Rolle)
- Nach dem Login landet der Benutzer auf der **Planner-Auswahl** (`/planners`)
- Aktiver Planner wird in `localStorage` gespeichert — beim Wechsel werden alle Daten-Stores geleert
- URL-Struktur: `/planner/:plannerId/dashboard`, `/planner/:plannerId/kanban` usw.
- **Ticket-Nummerierung je Planner:** jeder Planner hat eigenen Präfix (`ENT-`, `DSN-`, `MGT-`) und unabhängigen Zähler
- Seed-Daten: 3 Planner (Entwicklung, Design, Management) mit eigenen Teams, Projekten und Tickets

### Favorit-Planner
- Jeder Benutzer kann einen Planner als **Startplanner** markieren (Stern-Icon auf der Auswahlseite)
- Der Favorit erscheint auf der Planner-Auswahl immer ganz oben und ist mit goldenem Rahmen + **„Startplanner"**-Label gekennzeichnet
- Nach dem Login wird bei gesetztem Favoriten direkt zum Planner-Dashboard weitergeleitet — ohne Umweg über die Auswahlseite
- Stern erscheint beim Hover, Klick toggelt den Favoriten; ein weiterer Klick hebt ihn wieder auf

### Planner-Verwaltung (`/planner-admin` — nur Admins)
- Alle Planner auf einen Blick mit Ticket-Präfix, Mitglieder-Avataren, Teamanzahl und **Ersteller**
- Eigene (erstellte) Planner werden oben sortiert und mit **„Mein Planner"**-Badge gekennzeichnet
- **Verwalten-Modal** mit 4 Tabs:
  - **Info:** Name und Beschreibung bearbeiten
  - **Mitglieder:** Benutzer hinzufügen (mit Planner-Rolle), Rolle ändern, entfernen
  - **Teams:** Planner-eigene Teams erstellen, umbenennen, löschen; Team-Mitglieder verwalten (hinzufügen / entfernen)
  - **Einstellungen:** Ticket-Präfix pro Planner konfigurieren (z. B. `ENT` → `ENT-0015`)

### Admin-Bereich (`/planner/:id/admin` — nur Admins)
- Route ist durch Router-Guard gesichert — Nicht-Admins werden zur Planner-Auswahl weitergeleitet
- Startet auf Tab **„Anfragen"** mit rotem Badge-Zähler für offene Anfragen
- **Anfragen:** alle eingegangenen Feature-/Bug-Anfragen aller Benutzer
  - Typ-Badge (`✨ Feature` / `🐛 Bug`), Avatar und Zeitstempel des Absenders
  - Status-Dropdown pro Anfrage: Offen → In Arbeit → Erledigt → Abgelehnt
  - Admin-Notiz-Feld (interne Kommentare), Anfrage löschen
- **Planner-Zugang:** Mitglieder des aktuellen Planners verwalten (hinzufügen, Rolle ändern, entfernen)
- **Benutzer:** Systemrollen (admin / owner / user) per Dropdown vergeben
- **Teams:** Teams des aktuellen Planners erstellen, bearbeiten und löschen
- **Boards:** erstellen (mit Datum), bearbeiten und löschen
- **Einstellungen:**
  - **Ticket-Präfix je Planner** — alle Planner auf einen Blick mit editierbarem Präfix-Input und aktuellem Zählerstand
  - **Globaler Fallback** — Präfix und Zähler für Tickets ohne Planner-Zuordnung

### „Erstellen"-Button im Header
- **Dropdown-Menü** mit drei Optionen: 🎟 Ticket, 📁 Projekt, 📨 Anfrage
- Öffnet ein Modal mit den entsprechenden Tabs — alle drei Erstellformulare an einem Ort
- **Ticket erstellen:** Titel, Beschreibung, Priorität, Art, Zuweisung, Board
- **Projekt erstellen:** Name, Beschreibung, Status, Team, Sprint
- **Anfrage senden:** Typ (`✨ Feature` / `🐛 Bug`), Titel, Beschreibung → landet in der Admin-Inbox

### Avatare & Online-Status
- Lokal generiert via `@dicebear/avataaars@9` (npm) — kein CDN, keine HTTP-Anfragen
- Seed = Benutzername → deterministisch und konsistent in allen Komponenten
- **Status-Ampel** als runder Kreis rechts oben am Avatar:
  - 🟢 **Grün** — Benutzer ist online (Heartbeat < 2 Minuten)
  - 🔴 **Rot** — Benutzer ist offline / nicht eingeloggt
  - 🟡 **Gelb** — Benutzer hat Online-Status aus Datenschutzgründen verborgen
- Heartbeat alle 60 Sekunden; Logout markiert sofort offline
- **Einstellung „Online-Status verbergen"** in den Datenschutz-Einstellungen (Standard: deaktiviert)
- Sichtbar in: Chat-Kontaktliste, Chat-Header, Ticket-Detailansicht (Assignee), Mein-Team-Liste und Board

### Weitere
- Dark / Light Mode
- Toast-Benachrichtigungen (Erfolg, Fehler, Info, Warnung)
- Responsive Design

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
| PUT | `/api/users/:id/favorites` | Favoriten setzen (teamId, projectId, boardId, plannerId) |
| GET | `/api/planners` | Alle zugänglichen Planner abrufen |
| POST | `/api/planners` | Neuen Planner erstellen (Admin) |
| PUT | `/api/planners/:id` | Planner-Info aktualisieren (Admin) |
| DELETE | `/api/planners/:id` | Planner löschen (Admin) |
| PUT | `/api/planners/:id/members` | Mitgliederliste setzen `[{userId, role}]` (Admin) |
| PUT | `/api/planners/:id/settings` | Ticket-Präfix konfigurieren (Admin) |
| GET/POST | `/api/teams` | Teams abrufen (`?plannerId=`) / erstellen |
| POST | `/api/teams/:id/members` | Mitglied hinzufügen |
| PUT | `/api/teams/:id/members/:uid/role` | Ownership übertragen |
| DELETE | `/api/teams/:id/members/:uid` | Mitglied entfernen |
| GET/POST | `/api/tickets` | Tickets abrufen / erstellen |
| GET | `/api/tickets/recent` | Eigene zuletzt bearbeitete Tickets |
| PUT | `/api/tickets/:id` | Ticket aktualisieren (inkl. Zuweisung) |
| POST | `/api/tickets/:id/clone` | Ticket klonen |
| GET/POST | `/api/tickets/:id/comments` | Kommentare abrufen / erstellen |
| POST | `/api/tickets/:id/comments/:cid/reactions` | Reaktion setzen / entfernen (Toggle) |
| GET | `/api/tickets/:id/history` | Verlauf |
| GET | `/api/chat/conversations` | Eigene Konversationspartner mit letzter Nachricht |
| GET | `/api/chat/messages?partnerId=` | Nachrichten einer Direktkonversation |
| POST | `/api/chat/messages` | Direktnachricht senden (inkl. Ticket-Referenzauflösung) |
| GET | `/api/settings` | Ticket-Einstellungen |
| PUT | `/api/settings/ticket-prefix` | Präfix setzen (Admin) |
| PUT | `/api/settings/ticket-counter` | Zähler setzen (Admin) |
| GET | `/api/dashboard/stats` | Statistiken |
| POST | `/api/sprints/:id/start` | Sprint starten (Admin / Owner) |
| POST | `/api/sprints/:id/complete` | Sprint abschließen (Admin / Owner) |
| GET/POST | `/api/projects` | Projekte abrufen / erstellen (inkl. `startDate`, `endDate`, `sprintIds`) |
| PUT | `/api/projects/:id` | Projekt aktualisieren (inkl. `startDate`, `endDate`, `sprintIds`) |
| DELETE | `/api/projects/:id` | Projekt löschen |
| POST | `/api/auth/heartbeat` | Online-Status auffrischen (alle 60 s) |
| POST | `/api/auth/logout` | Benutzer als offline markieren |
| PUT | `/api/auth/me/privacy` | `privacyHideOnline` setzen |
| POST | `/api/admin-requests` | Anfrage erstellen (alle Benutzer) |
| GET | `/api/admin-requests` | Alle Anfragen abrufen (Admin) |
| PUT | `/api/admin-requests/:id` | Status / Notiz aktualisieren (Admin) |
| DELETE | `/api/admin-requests/:id` | Anfrage löschen (Admin) |

---

## Changelog

### v2.3.0 — Favorit-Planner & Login-Fix
- Benutzer können einen Planner als **Startplanner** markieren (Stern-Icon, per Hover sichtbar)
- Favorit: goldener Kartenrahmen, „Startplanner"-Label, immer ganz oben auf der Auswahlseite
- Nach dem Login → direkter Redirect zum Favoriten-Planner-Dashboard (wenn gesetzt)
- Stern toggelt: erneuter Klick hebt den Favoriten auf; Wert wird serverseitig als `favorites.plannerId` gespeichert
- Fix: Login-Redirect zeigt nun korrekt `/planners` (statt der ungültigen Route `/dashboard`)

### v2.2.0 — Admin-Bereich Erweiterungen
- **Teams-Tab im Admin:** „Bearbeiten"-Button mit Modal (Name, Beschreibung); „Team erstellen"-Button ergänzt
- **Einstellungen-Tab:** neue Karte „Ticket-Präfix je Planner" — alle Planner tabellarisch mit Präfix-Input und Zählerstand; globaler Fallback bleibt erhalten
- **Planner-Verwaltung:** zeigt „Erstellt von"-Feld (aus `createdBy`-Attribut); eigene Planner mit „Mein Planner"-Badge; eigene Planner werden immer zuerst sortiert
- Backend: `createdBy: req.user.id` beim Erstellen eines Planners; Seed-Daten mit Owner als Ersteller

### v2.1.0 — Teams gehören zum Planner
- Teams haben jetzt ein `plannerId`-Feld — jedes Team gehört genau einem Planner
- `planner.teamIds` vollständig entfernt; Backend liefert stattdessen `teamCount` via `enrich()`-Hilfsfunktion
- `GET /teams?plannerId=` filtert Teams planner-spezifisch
- Planner-Verwaltung Teams-Tab: direkte Verwaltung der Planner-eigenen Teams (kein Checkbox-Zuweisung-Mechanismus mehr)
- Store-Reset beim Planner-Wechsel schließt `TeamsStore` ein (`clear()`)
- **Planner-Zugang im Admin-Bereich:** neuer Tab zum Verwalten der Mitglieder des aktuellen Planners

### v2.0.0 — Multi-Planner-Architektur
- **Planner** als neue Top-Level-Einheit: Admin erstellt Planner, weist Teams und Benutzer zu
- Jeder Planner hat eigene Projects, Tickets, Sprints, Boards — vollständige Datenisolation
- URL-Struktur: `/planners` (Auswahl) → `/planner/:plannerId/dashboard` (Inhalt)
- Aktiver Planner in `localStorage` (`planner_active_id`); Stores werden beim Wechsel geleert
- **Planner-Admin** unter `/planner-admin`: CRUD, Mitglieder- und Teamverwaltung, Ticket-Präfix pro Planner
- **Planner-spezifische Ticket-Nummerierung**: Präfix und Zähler je Planner (`ENT-0001`, `DSN-0001`, `MGT-0001`)
- Seed-Daten: 3 Planner (Entwicklung `ENT`, Design `DSN`, Management `MGT`), 4 Teams, 5 Projekte, 14 Tickets, 3 Sprints
- Router-Guard: `requiresPlanner` setzt aktiven Planner; `requiresAdmin` blockiert Nicht-Admins

### v1.3.0 — Sprint-Verwaltung im Team-Bereich
- **Sprints-Sektion** auf der Teams-Seite: Erstellen, Bearbeiten, Starten, Abschließen und Löschen von Sprints
- **Status-Flow:** Planung → Aktiv → Abgeschlossen (mit farbigem Status-Badge und Status-Ikon)
- Starten setzt `startDate` automatisch auf heute, falls noch leer; Abschließen setzt `endDate`
- Aktive Sprints können nicht gelöscht werden (API-Schutz + UI-Ausblendung)
- Abgeschlossene Sprints können nicht bearbeitet werden
- Alle schreibenden Sprint-Routen durch `requireAdminOrOwner`-Middleware gesichert — normale Benutzer erhalten HTTP 403
- Neues Feld `status` (`planning | active | completed`) auf Sprints; Seed-Sprint startet als `active`
- `startSprint()` und `completeSprint()` im Pinia-Sprints-Store ergänzt

### v1.2.0 — Projekt über mehrere Sprints
- Projekte können beliebig vielen Sprints zugewiesen werden (`sprintIds`-Array statt einzelnem `sprintId`)
- **Projekte-Seite:** Sprint-Spalte zeigt alle zugewiesenen Sprints als Indigo-Badges; Klick öffnet Checkbox-Dropdown zum direkten Hinzufügen/Entfernen ohne Modal
- **Projekt-Modal** (Projekte-Seite + Erstellen-Button im Header): Sprint-Select durch scrollbare Checkbox-Liste ersetzt
- API: `POST /projects` und `PUT /projects/:id` akzeptieren `sprintIds`-Array; `GET /projects?sprintId=` filtert via `includes()`

### v1.1.0 — Gantt-Zeitstrahl
- **Neue Ansicht `/gantt`** mit scrollbarem Zeitstrahl für alle Projekte mit Startdatum
- Projektbalken drag-to-move (verschiebt Start + Ende) und resize (Enddatum ändern) — speichert per API
- Zoom: Woche / Monat / Quartal; freier Zeitraum-Picker; Heute-Linie; Monat-Gitter
- Ticket-Listen pro Projekt aufklappbar (Titel + Status-Badge)
- Abhängigkeits-Pfeile als SVG-Bezier-Overlay (ein-/ausblendbar)
- Seed-Daten: alle 3 Projekte mit `startDate`/`endDate`, erweiterte Ticket-Abhängigkeiten
- Navigation: „Zeitstrahl" in der Haupt-Nav; „Zeitstrahl"-Button im Kanban-Board
- `PUT /api/projects/:id` akzeptiert jetzt `startDate` und `endDate`

### v1.0.0 — Online-Status-Anzeige
- **Status-Ampel** rechts oben am Avatar: 🟢 Online · 🔴 Offline · 🟡 Status verborgen
- Heartbeat alle 60 s; Logout markiert Benutzer sofort offline; kein Heartbeat > 2 min → automatisch offline
- `GET /users` liefert `onlineStatus` pro Benutzer — Datenschutz-Flag wird serverseitig ausgewertet
- `POST /auth/heartbeat`, `POST /auth/logout`, `PUT /auth/me/privacy` als neue Endpunkte
- Neue Komponente `UserAvatar.vue` — universeller Drop-in mit Status-Dot (Größen xs–xl, Position top-right / bottom-right)
- `useHeartbeat.js` — Composable startet Heartbeat-Zyklus und aktualisiert User-Cache
- **Einstellungen → Datenschutz**: Toggle „Online-Status verbergen" (andere sehen gelbe Ampel)
- Chat-Kontaktliste und -Header zeigen Online-Status; Statustext im Chat-Header

### v0.9.0 — Vollseiten-Detailansicht & Header-Überarbeitung
- **Ticket-Detailansicht als Vollseite** in Mein Team (kein Modal mehr)
  - Klebende Kopfzeile: ← Zurück, Ticketnummer + Typ-Icon, Assignee rechts
  - Hover-to-Edit für alle Felder: Titel, Beschreibung, Status, Priorität, Art (mit Icon), Projekt, Sprint, Zugewiesen
  - Felder speichern automatisch beim Verlassen (kein Speichern-Button)
  - Alle Tabs erhalten: Checkliste, Kommentare (mit Reaktionen), Anhänge, Verlauf
- **„Erstellen"-Button im Header** fasst Ticket-, Projekt- und Anfrageformular in einem Dropdown-Modal zusammen; separater Anfrage-Button entfernt
- **„Mein Team"-Dropdown** im Header zeigt letzte 8 bearbeitete Tickets; Klick öffnet TicketModal direkt aus dem Header
- **Konfigurierbare Standard-Ansicht** für Mein Team in den Einstellungen (Liste / Board)
- **Assignee-Avatar** auf Karten und in der Zugewiesen-Spalte der Tabellenansicht
- **Ticket-Art-Icon** (Bootstrap Icons SVG, inline) unten rechts auf Board-Karten
- **Avataaars via npm** — `@dicebear/core@9` + `@dicebear/avataaars@9` ersetzen alle CDN-URLs; lokal generiert als Data-URI

### v0.8.0 — Chat-Ticket-Links & Direktnachrichten
- Chat als Direktnachrichten-System: links Kontaktliste mit Vorschau, rechts Chatfenster
- `#XXX-NNNN` in Nachrichten wird beim Senden gegen den Ticket-Store abgeglichen
- Existierende Tickets: klickbares Indigo-Badge mit Titel-Tooltip → öffnet TicketModal
- Nicht-existierende Nummern: grauer Monospace-Text (kein Link)
- Backend: neue Endpunkte `/chat/conversations` und `/chat/messages?partnerId=`; `ticketRefs`-Array auf Nachrichten

### v0.7.0 — Admin-Page, Router-Guard, Benutzeranfragen
- `/admin` durch Router-Guard gesichert (Nicht-Admins → Redirect)
- Admin-Page startet auf Tab „Anfragen" mit Echtzeit-Badge-Zähler
- Neuer „Anfrage"-Button im Header für alle Benutzer (Feature / Bug melden)
- Admin-Inbox mit Status-Management (Offen / In Arbeit / Erledigt / Abgelehnt) und Admin-Notizen
- Board-Management vollständig in Admin verlagert (erstellen, bearbeiten, löschen)
- Backend: neue Route `/api/admin-requests` (POST für alle, GET/PUT/DELETE nur Admin)

### v0.6.0 — Kommentare mit Reaktionen
- Neuer Tab „Kommentare" im TicketModal mit Badge-Zähler
- Kommentare zeigen Avatar, Autorenname und relativen Zeitstempel
- Reaktions-Buttons 👍 👎 ❤️ pro Kommentar: Toggle, Zähler, eigene Reaktion farblich hervorgehoben
- Neuen Kommentar schreiben via Strg+Enter oder Senden-Button
- Backend: `reactions`-Array auf Kommentaren, neue Route `POST /:id/comments/:cid/reactions`

### v0.5.0 — Avatar auf Ticket-Karte, Benutzer-Cache
- Assignee-Avatar auf jeder Kanban-Karte sichtbar (mit Tooltip)
- Gestrichelter Kreis wenn kein Assignee gesetzt
- `useUsers`-Composable als Singleton-Cache — Benutzer werden einmal geladen und von allen Komponenten geteilt (TicketCard, TicketModal, KanbanView)

### v0.4.0 — Ticket-Zuweisung & Zuletzt bearbeitet
- Tickets können beim Erstellen und Bearbeiten beliebigen Benutzern zugewiesen werden (alle Rollen)
- Standardwert: „Nicht zugewiesen"
- Avatar-Vorschau im TicketModal nach Auswahl
- „Zuletzt bearbeitet"-Sektion auf Mein-Team-Seite (letzte 10 Tickets, neuestes oben)
- Mein-Team-Seite: eigenes Team automatisch vorausgewählt

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
- Kanban-Board: kein horizontales Scrollen, Spalten gleichmäßig verteilt

### v0.1.0 — Initiales Setup
- Vue 3 + Vite 8 + TailwindCSS
- Express-Backend mit JWT
- Kanban-Board mit Drag & Drop
- Projekte, Teams, Sprints

---

## Bekannte Einschränkungen (MVP)

- Daten liegen **im Arbeitsspeicher** — nach Backend-Neustart werden die Seed-Daten neu geladen
- Chat ohne WebSocket (Polling alle 5 Sekunden)
- Keine Datei-Uploads für benutzerdefinierte Avatare (Avatare werden automatisch aus dem Benutzernamen generiert)
