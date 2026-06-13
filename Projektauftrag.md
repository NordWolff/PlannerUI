# Planner

Planner ist eine deutsch- und englischsprachige Planungsanwendung. Standard ist die deutsche Oberfläche.

## Designprinzip

- keine Seitenleisten, weder links noch rechts
- vollflächiger Content unter dem Header
- kein Footer
- Header mit Logo/App-Name links, zentrale Navigation, Benutzerprofil rechts
- zentrale Navigation: Dashboard, Mein Team, Teams, Projekte, Kanban, Reports, Einstellungen
- Standard-Ansicht nach Login: Mein Team

## Kernfunktionen

### Benutzer & Authentifizierung

- Registrierung mit Benutzername, E-Mail und Passwort
- Login und Session-Handling
- Profil mit Avatar, Sprache (Deutsch/Englisch) und Theme (Light/Dark)
- Avatar-Auswahl: Zufallsbild oder einfache Auswahl aus einer kostenlosen Avatar-Library
- Favoriten: Team, Projekt, Board

### Teams

- Teamverwaltung mit Teamliste und Suche
- Team-Mitglieder hinzufügen/rollen
- Team-Favoriten
- Teams können einem Board zugewiesen sein

### Projekte

- Projektliste mit Suche
- Projekt-Favoriten
- Sprintzuweisung für Projekte
- Projektstatus und Historie

### Kanban-Boards

- mehrere Boards verwaltbar
- Board-Management im Dashboard: Board anlegen, bearbeiten, Name, Beschreibung, Zeitraum
- Boards haben eigene Timeline, Teams und Projekte
- im Kanban-Board: Board-Auswahl, Team-Filter, Projekt-Filter
- Tickets werden in Status-Spalten (Draft, Geplant, In Arbeit, Review, Abschluss) dargestellt
- Tickets können gezogen und per Status aktualisiert werden
- Ticket-Details mit Zuweisung, Abhängigkeiten, Historie

### Sprints

- Sprintverwaltung mit Name, Beschreibung, Start- und Enddatum
- aktueller Sprint wird automatisch ermittelt
- Zuweisung von Projekten und Tickets zu Sprints

### Dashboard / Reports

- KPI-Übersicht: Team-, Projekt-, Ticket- und Board-Zahlen
- Statusverteilung
- Board-Management-Sektion
- neueste Tickets
- Projektaktivität

## Technische Architektur

- Frontend: Vue 3 + Vite
- Backend: Express.js
- Datenhaltung derzeit: In-Memory-Modelle
- API: Auth, Benutzer, Teams, Boards, Sprints, Projekte, Tickets, Kanban

## Aktueller Projektstand

- Backend-Datenmodell für Benutzer, Teams, Projekte, Tickets, Sprints, Boards implementiert
- Kanban-Board mit Board-Auswahl und Ticket-Filtern vorhanden
- Dashboard erweitert um Board-Management
- Sprint-Erstellung und aktueller Sprint bereits verfügbar
- Frontend Build erfolgreich

## Nächste Schritte

1. Auth- & Benutzerverwaltung fertigstellen
2. Teams-UI mit Mitgliedsverwaltung und Favoriten
3. Projektliste mit Suche, Favoriten und Sprint-Zuordnung
4. Ticket-Modal erweitern: Checkliste, Abhängigkeiten, Historie
5. Mein Team-Ansicht mit Sprint-Autoauswahl und Team-Filter
6. Einstellungen: Darkmode, Sprache, Favoriten
7. Reports & Dashboard weiter ausbauen
8. Tests: Unit-, Integrations- und einfache E2E-Tests
