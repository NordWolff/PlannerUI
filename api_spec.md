# API-Spezifikation: Planner

Base URL: `http://localhost:3000/api`

## Auth

| Method | Endpoint            | Beschreibung         |
|--------|---------------------|----------------------|
| POST   | /auth/register      | Benutzer registrieren |
| POST   | /auth/login         | Login, JWT erhalten  |
| GET    | /auth/me            | Eigenes Profil        |
| PUT    | /auth/me            | Profil aktualisieren  |

### Register Body
```json
{ "username": "string", "email": "string", "password": "string" }
```

### Login Body
```json
{ "email": "string", "password": "string" }
```

### Auth Response
```json
{ "token": "string", "user": { "id": "string", "username": "string", "email": "string", "avatar": "string", "language": "de|en", "theme": "light|dark" } }
```

## Benutzer

| Method | Endpoint            | Beschreibung                |
|--------|---------------------|-----------------------------|
| GET    | /users              | Alle Benutzer               |
| GET    | /users/:id          | Benutzer by ID              |
| PUT    | /users/:id/favorites| Favoriten setzen            |

## Teams

| Method | Endpoint                    | Beschreibung              |
|--------|-----------------------------|---------------------------|
| GET    | /teams                      | Alle Teams                |
| POST   | /teams                      | Team erstellen            |
| GET    | /teams/:id                  | Team by ID                |
| PUT    | /teams/:id                  | Team aktualisieren        |
| DELETE | /teams/:id                  | Team löschen              |
| GET    | /teams/:id/members          | Team-Mitglieder           |
| POST   | /teams/:id/members          | Mitglied hinzufügen       |
| DELETE | /teams/:id/members/:userId  | Mitglied entfernen        |

### Team Objekt
```json
{ "id": "string", "name": "string", "description": "string", "boardId": "string|null", "members": [{ "userId": "string", "role": "owner|member" }], "createdAt": "iso-date" }
```

## Projekte

| Method | Endpoint                | Beschreibung              |
|--------|-------------------------|---------------------------|
| GET    | /projects               | Alle Projekte             |
| POST   | /projects               | Projekt erstellen         |
| GET    | /projects/:id           | Projekt by ID             |
| PUT    | /projects/:id           | Projekt aktualisieren     |
| DELETE | /projects/:id           | Projekt löschen           |

### Projekt Objekt
```json
{ "id": "string", "name": "string", "description": "string", "status": "active|completed|archived", "sprintId": "string|null", "teamId": "string|null", "createdAt": "iso-date" }
```

## Tickets

| Method | Endpoint                        | Beschreibung            |
|--------|---------------------------------|-------------------------|
| GET    | /tickets                        | Alle Tickets            |
| POST   | /tickets                        | Ticket erstellen        |
| GET    | /tickets/:id                    | Ticket by ID            |
| PUT    | /tickets/:id                    | Ticket aktualisieren    |
| DELETE | /tickets/:id                    | Ticket löschen          |
| PUT    | /tickets/:id/status             | Status aktualisieren    |
| GET    | /tickets/:id/history            | Ticket-Verlauf          |

### Ticket Objekt
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "status": "draft|planned|in_progress|review|done",
  "priority": "low|medium|high|critical",
  "assigneeId": "string|null",
  "projectId": "string|null",
  "boardId": "string|null",
  "sprintId": "string|null",
  "teamId": "string|null",
  "checklist": [{ "id": "string", "text": "string", "done": false }],
  "dependencies": ["ticketId"],
  "history": [{ "timestamp": "iso-date", "userId": "string", "action": "string", "oldValue": "any", "newValue": "any" }],
  "createdAt": "iso-date",
  "updatedAt": "iso-date"
}
```

## Boards

| Method | Endpoint         | Beschreibung       |
|--------|------------------|--------------------|
| GET    | /boards          | Alle Boards        |
| POST   | /boards          | Board erstellen    |
| GET    | /boards/:id      | Board by ID        |
| PUT    | /boards/:id      | Board aktualisieren|
| DELETE | /boards/:id      | Board löschen      |

### Board Objekt
```json
{ "id": "string", "name": "string", "description": "string", "startDate": "iso-date", "endDate": "iso-date", "teamIds": ["string"], "projectIds": ["string"], "createdAt": "iso-date" }
```

## Sprints

| Method | Endpoint          | Beschreibung          |
|--------|-------------------|-----------------------|
| GET    | /sprints          | Alle Sprints          |
| POST   | /sprints          | Sprint erstellen      |
| GET    | /sprints/current  | Aktueller Sprint      |
| GET    | /sprints/:id      | Sprint by ID          |
| PUT    | /sprints/:id      | Sprint aktualisieren  |
| DELETE | /sprints/:id      | Sprint löschen        |

### Sprint Objekt
```json
{ "id": "string", "name": "string", "description": "string", "startDate": "iso-date", "endDate": "iso-date", "projectIds": ["string"], "ticketIds": ["string"], "createdAt": "iso-date" }
```

## Dashboard/Reports

| Method | Endpoint          | Beschreibung   |
|--------|-------------------|----------------|
| GET    | /dashboard/stats  | KPI-Übersicht  |
| GET    | /dashboard/activity | Aktivitäten  |

### Stats Response
```json
{
  "teams": { "total": 0 },
  "projects": { "total": 0, "active": 0 },
  "tickets": { "total": 0, "byStatus": {} },
  "boards": { "total": 0 }
}
```

## HTTP-Statuscodes
- 200: Erfolg
- 201: Erstellt
- 400: Ungültige Anfrage
- 401: Nicht authentifiziert
- 403: Nicht autorisiert
- 404: Nicht gefunden
- 500: Server-Fehler

## Auth-Header
Alle geschützten Endpunkte benötigen: `Authorization: Bearer <token>`