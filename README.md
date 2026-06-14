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

| Rolle | E-Mail | Passwort |
|---|---|---|
| Admin | admin@planner.dev | admin123 |
| Owner (Milad) | milad@planner.dev | owner123 |
| Owner (Kay) | kay@planner.dev | owner123 |
| Benutzer | thomas.wolff@planner.dev | user123 |
| Benutzer | torsten.klose@planner.dev | user123 |
| Benutzer | cindy.scholka@planner.dev | user123 |

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

### Teams
- Pro Team genau **ein Product Owner**
- Ownership per Knopfdruck übertragen (bisheriger Owner wird Mitglied)
- Admin kann kein Team-Mitglied sein (Einzelrolle)
- Mitglieder-Suche mit Debounce; Admins und bereits vorhandene Mitglieder werden ausgefiltert
- Hinweis wenn kein Product Owner vorhanden

### Chat
- Direktnachrichten zwischen Benutzern (zwei-Panel-Layout: Kontaktliste + Chatfenster)
- Echtzeit-Polling (5 s), Konversationen nach letzter Nachricht sortiert
- **Online-Status** in der Kontaktliste (farbiger Punkt unten rechts am Avatar) und im Chat-Header mit Textanzeige
- `@username` hebt Erwähnungen hervor
- `#TKT-0001` — existierende Tickets werden als klickbares Badge gerendert und öffnen das TicketModal per Klick; nicht-existierende Nummern erscheinen als grauer Monospace-Text

### Admin-Bereich (`/admin` — nur Admins)
- Route ist durch Router-Guard gesichert — Nicht-Admins werden zu `/dashboard` weitergeleitet
- Startet auf Tab **„Anfragen"** mit rotem Badge-Zähler für offene Anfragen
- **Anfragen:** alle eingegangenen Feature-/Bug-Anfragen aller Benutzer
  - Typ-Badge (`✨ Feature` / `🐛 Bug`), Avatar und Zeitstempel des Absenders
  - Status-Dropdown pro Anfrage: Offen → In Arbeit → Erledigt → Abgelehnt
  - Admin-Notiz-Feld (interne Kommentare)
  - Anfrage löschen
- **Benutzer:** Rollen (admin / owner / user) per Dropdown vergeben
- **Teams:** alle Teams einsehen und löschen
- **Boards:** erstellen (mit Datum), bearbeiten und löschen
- **Einstellungen:** Ticket-Präfix (z. B. `FEED`, `TKG`) und Startzähler anpassen, Vorschau der nächsten Nummer

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
| GET/POST | `/api/teams` | Teams abrufen / erstellen |
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
| POST | `/api/auth/heartbeat` | Online-Status auffrischen (alle 60 s) |
| POST | `/api/auth/logout` | Benutzer als offline markieren |
| PUT | `/api/auth/me/privacy` | `privacyHideOnline` setzen |
| POST | `/api/admin-requests` | Anfrage erstellen (alle Benutzer) |
| GET | `/api/admin-requests` | Alle Anfragen abrufen (Admin) |
| PUT | `/api/admin-requests/:id` | Status / Notiz aktualisieren (Admin) |
| DELETE | `/api/admin-requests/:id` | Anfrage löschen (Admin) |

---

## Changelog

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
