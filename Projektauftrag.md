# Planner

Planner ist eine deutsch- und englischsprachige Planungsanwendung. Standard ist die deutsche Oberfläche.

## Designprinzip

- keine Seitenleisten, weder links noch rechts
- vollflächiger Content unter dem Header
- kein Footer
- Header mit Logo/App-Name links, zentrale Navigation, Benutzerprofil rechts
- zentrale Navigation: Dashboard, Mein Team, Teams, Projekte, Kanban, Reports, Einstellungen
- Standard-Ansicht nach Login: Mein Team

## Menu ohne Admin Rechte

- Einstellungen nur unter Profil sichtbar, wenn Benutzer kein Administrator ist

## Menu mit Admin Rechte (Administrator)

- Admin hat separate Einstellungen sichtbar: 
    - Teams verwalten
    - wer gehört zu welchem Team
    - welches Team gehört zu diesem Kanban-Board
- nur Benutzer mit Admin Rechten kann Teams anlegen, verwalten und löschen
- Admin verwaltet dabei die Sichtbarkeiten und Rechte der Benutzer

## Kernfunktionen

### Chatfunktion

- es soll ein zentraler Chat geben
- so das alle Benutzer untereinander schreiben/chatten können
- wird eine Ticketnummer im Chat erwähnt ist der Chat auch im Ticket zu sehen


### Benutzer & Authentifizierung

- Registrierung mit Benutzername, E-Mail und Passwort
- Login und Session-Handling
- Profil mit Avatar, Sprache (Deutsch/Englisch) und Theme (Light/Dark)
- Avatar-Auswahl: Zufallsbild oder einfache Auswahl aus einer kostenlosen Avatar-Library
- Favoriten: Team, Projekt, Board

### Teams

- Teamverwaltung mit Teamliste und Suche
- Team Mitglieder hinzufügen per Mitglied-Namen nicht per ID 
- Mitglieder kündigen
- Team-Favoriten
- Teams können nur einem Kanban-Board zugewiesen sein

### Projekte

- Projektliste mit Suche
- Projekt-Favoriten
- Sprintzuweisung für Projekte
- Projektstatus und Historie

### Kanban-Boards

- mehrere Boards verwaltbar - nur Admin
- Board anlegen nur Admin
- Board-Management im Dashboard: bearbeiten, Name, Beschreibung, Zeitraum - nur Admin und Owner
- Boards haben eigene Timeline's, Teams und Projekte
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
- Datenhaltung: In-Memory-Modelle
- API: Auth, Benutzer, Teams, Boards, Sprints, Projekte, Tickets, Kanban

## Tickets

- jedes Ticket kann Sprints zugewiesen werden
- Ticket Historie (Statusänderungen, Kommentare, Dauer, erstellt Datum, Fertigstellung)
- Kommentare mit Benutzererwähnung
- Kommentare mit Smileys ermöglichen
- Tickets Klonen ermöglichen
- Datei Anhänge (PNG, JPEG, PDF, Word, Excel, Powerpoint) ermöglichen
- PNG, JPEG als Miniaturvorschau im Kommentar

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
9. Tickets Funktionen erweitern
10. Admin Zugang zur Verwaltung von Boards
11. Benutzer Rollen - Admin, Owner, User
12. Chatfunktion
