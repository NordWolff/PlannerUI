# Projekt-Backlog: Planner

## Projektübersicht
Planner ist eine deutsch-/englischsprachige Planungsanwendung mit Vue 3 Frontend und Express.js Backend.

## Aktueller Stand (2026-06-13)

| Agent        | Aufgabe                                          | Status       | Priorität |
|--------------|--------------------------------------------------|--------------|-----------|
| Backend-Dev  | Express.js Projektstruktur einrichten            | ✅ Erledigt  | Hoch      |
| Backend-Dev  | In-Memory Datenmodelle (User/Team/Projekt/...)   | ✅ Erledigt  | Hoch      |
| Backend-Dev  | Auth-API (Register/Login/JWT)                    | ⏳ Ausstehend | Hoch    |
| Backend-Dev  | Teams-API (CRUD, Mitglieder, Rollen)             | ⏳ Ausstehend | Hoch    |
| Backend-Dev  | Projekte-API (CRUD, Sprint-Zuweisung)            | ⏳ Ausstehend | Hoch    |
| Backend-Dev  | Tickets-API (CRUD, Kanban, Abhängigkeiten)       | ⏳ Ausstehend | Hoch    |
| Backend-Dev  | Boards-API (CRUD, Team-Zuweisung)                | ⏳ Ausstehend | Hoch    |
| Backend-Dev  | Sprints-API (CRUD, aktueller Sprint)             | ⏳ Ausstehend | Mittel   |
| Webdesigner  | Design-System erstellen (Farben, Typo, Icons)    | ⏳ Ausstehend | Hoch    |
| Frontend-Dev | Vue 3 + Vite Projektstruktur                     | ⏳ Ausstehend | Hoch    |
| Frontend-Dev | Pinia Stores (auth, teams, projekte, tickets...) | ⏳ Ausstehend | Hoch    |
| Frontend-Dev | Layout: Header + Navigation                      | ⏳ Ausstehend | Hoch    |
| Frontend-Dev | Auth-Seiten (Login, Registrierung)               | ⏳ Ausstehend | Hoch    |
| Frontend-Dev | Dashboard mit KPIs und Board-Management          | ⏳ Ausstehend | Hoch    |
| Frontend-Dev | Mein Team-Ansicht                                | ⏳ Ausstehend | Hoch    |
| Frontend-Dev | Teams-UI mit Mitgliedsverwaltung                 | ⏳ Ausstehend | Mittel  |
| Frontend-Dev | Projektliste mit Suche und Favoriten             | ⏳ Ausstehend | Mittel  |
| Frontend-Dev | Kanban-Board mit Drag & Drop                     | ⏳ Ausstehend | Hoch    |
| Frontend-Dev | Ticket-Modal (Checkliste, Abhängigkeiten)        | ⏳ Ausstehend | Mittel  |
| Frontend-Dev | Sprint-Verwaltung                                | ⏳ Ausstehend | Mittel  |
| Frontend-Dev | Reports & Dashboard                              | ⏳ Ausstehend | Niedrig |
| Frontend-Dev | Einstellungen (Darkmode, Sprache, Favoriten)     | ⏳ Ausstehend | Niedrig |

## Abhängigkeiten
- Frontend benötigt laufendes Backend (API)
- Frontend-Stores benötigen API-Endpunkte
- Kanban benötigt Tickets + Boards API

## Legende
- ✅ Erledigt
- 🔄 In Arbeit
- ⏳ Ausstehend
- 🚫 Blockiert