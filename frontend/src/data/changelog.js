// Versionsgeschichte der App (T-Compass). Muss synchron zum Changelog-Abschnitt
// in README.md gepflegt werden — jede dokumentierte Änderung bekommt hier einen
// Eintrag mit Versionsnummer, der im Benutzermenü ("Changelog") angezeigt wird.
export const changelog = [
  {
    version: '2.17.0',
    title: 'Ticket-Erstellung: Planner, Pflicht-Projekt & Assignee-Suche',
    items: [
      'Ticket erstellen: neues Planner-Dropdown — zeigt nur eigene Planner; beim Wechsel werden Boards, Projekte, Teams und Sprints automatisch nachgeladen',
      'Ticket erstellen: Pflicht-Projekt-Dropdown — Ticket kann nur mit gewähltem Projekt erstellt werden; deaktiviert solange kein Planner ausgewählt',
      'Ticket erstellen: "Zugewiesen an" ist jetzt ein Suchfeld — filtert Planner-Mitglieder live nach Name/E-Mail; Avatare in der Trefferliste; × zum Zurücksetzen',
      'Projekt erstellen: Planner-Dropdown ersetzt read-only Feld — zeigt alle eigenen Planner; beim Wechsel werden zugehörige Sprints nachgeladen',
      'System-Support Planner: neuer Systemstandard-Planner (Präfix SUP); alle System-Admins sind automatisch Mitglied',
      'Anfrage senden erstellt automatisch ein Ticket im System-Support Planner (SUP-XXXX) mit Typ, Priorität und Einreicher-Info',
      'Alle System-Admins erhalten eine Glocken-Benachrichtigung bei jeder neuen Support-Anfrage',
    ],
  },
  {
    version: '2.16.0',
    title: 'Rollentrennung, Berechtigungskorrekturen & Teams/Boards-Zugriff',
    items: [
      'Fix: Rollen-Editing im Mitglieder-Reiter war durch createdBy-Bypass auch für Nicht-Admins zugänglich — jetzt korrekt auf Planner-Mitglied mit Rolle "Admin" beschränkt',
      'Fix: Planner-Zugang-Tab hatte keine Rollenprüfung — Hinzufügen, Rolle ändern und Entfernen nun ebenfalls nur für Planner-Admins',
      'Fix: Seed-Daten korrigiert — Planner-Ersteller haben jetzt korrekt role: "admin" statt role: "owner"',
      '"Meine Planner"-Tab zeigt alle Planner mit Mitgliedschaft; Karten zeigen Rollen-Badge; Verwalten/Löschen-Buttons nur für berechtigte Nutzer',
      'Benutzernamen im Planner-Zugang-Tab wurden als rohe UUIDs angezeigt — Benutzerliste wird jetzt für alle Nutzer geladen',
      'Teams- und Boards-Tab: Planner-Dropdown für Nicht-Admins auf eigene Planner beschränkt',
      'Teams/Boards erstellen, bearbeiten, löschen: jetzt auch für Ersteller des Planners erlaubt (nicht mehr admin-only im Backend)',
      'Bearbeiten/Löschen-Buttons pro Team/Board nur sichtbar wenn Nutzer Ersteller des Planners ist; Erstellen-Button nur bei eigenem Planner im Filter',
    ],
  },
  {
    version: '2.15.0',
    title: 'Selbstverwaltete Planner, Verwaltungsseite & Benachrichtigungen',
    items: [
      'Jeder Benutzer kann eigene private Planner erstellen — Ersteller erhält automatisch die Rolle Admin',
      'Admin-Seite zu "Verwaltung" umbenannt und für alle Nutzer zugänglich (Navigation + Benutzermenü)',
      'Neue Planner-Mitgliederrollen: Mitglied (user), Admin (admin), Verantwortlicher (owner)',
      'Verwaltung zeigt eigene Planner und Planner mit Admin-Rolle getrennt von reinen Mitgliedschaften',
      'Planner-Übersicht (/planners) mit visueller Trennung "Meine Planner" vs. "Mitgliedschaften", Farbstreifen und Aktionsbuttons',
      'Erstellen-Modal mit Farbwahl und Auto-Ticket-Präfix — identisch in Planner-Übersicht und Verwaltung',
      'Info-Reiter im Planner-Detail ergänzt um Farbwähler',
      'Benachrichtigungs-Glocke im Header: Nutzer werden informiert wenn sie zu einem Planner hinzugefügt werden',
      'Rollen-Anpassung im Mitglieder-Reiter nur für Planner-Admins sichtbar, andere sehen Lese-Badge',
    ],
  },
  {
    version: '2.14.0',
    title: 'Versionsnummer im UI sichtbar',
    items: [
      'Aktuelle Versionsnummer wird jetzt im Benutzermenü (unter "Changelog") sowie in den Einstellungen ("Über T-Compass") angezeigt',
      'Platzierung basiert auf Empfehlung des Webdesigners: dezent im Benutzermenü für schnellen Zugriff, zusätzlich in den Einstellungen für gezieltes Nachschlagen (z. B. für Support-Anfragen)',
    ],
  },
  {
    version: '2.13.0',
    title: 'Changelog im Benutzermenü',
    items: [
      'Neuer Menüpunkt "Changelog" im Benutzermenü öffnet eine Übersicht aller Versionen mit Änderungen',
      'Datenquelle frontend/src/data/changelog.js — wird ab jetzt bei jeder dokumentierten Änderung parallel zum README-Changelog gepflegt',
    ],
  },
  {
    version: '2.12.0',
    title: 'Rebranding: App heißt jetzt „T-Compass"',
    items: [
      'Header-Logo, Login- und Register-Seite sowie der Browser-Tab-Titel zeigen jetzt „T-Compass" statt „Planner"',
      'Repo-Name (PlannerUI) und der fachliche Begriff „Planner" (Organisationseinheit im Multi-Planner-Konzept) bleiben unverändert — Domänen-Entität, kein Produktname',
    ],
  },
  {
    version: '2.11.0',
    title: 'Dashboard, Reports & Admin-Boards: korrektes Planner-Scoping',
    items: [
      'Dashboard zeigte KPIs/Sprint/Statusverteilung/Aktivität bisher systemweit statt nur für den aktiven Planner — jetzt per ?plannerId= gefiltert',
      'Reports erhält einen eigenen Planner-Filter ("Alle meine Planner" oder ein bestimmter)',
      'Admin-Bereich → Boards bekommt denselben Planner-Filter wie Teams, inkl. Planner-Auswahl im Board-Modal',
    ],
  },
  {
    version: '2.10.0',
    title: 'Telekom-Magenta als Primärfarbe (app-weit)',
    items: [
      'Primärfarbe von Indigo auf Telekom Magenta (#E20074) umgestellt, ausgerichtet an den Telekom Scale Design Guidelines',
      'Neue Farbpalette: primary/primary-hover/primary-active/primary-light/primary-disabled (Light) sowie aufgehellte Dark-Mode-Varianten',
      'Alle indigo-* Tailwind-Klassen app-weit auf primary-* migriert',
    ],
  },
  {
    version: '2.9.0',
    title: 'Planner-Verwaltung im Admin-Bereich, mitgliedschaftsbasierte Sichtbarkeit, Dark Mode als Standard',
    items: [
      'Planner-Verwaltung aus eigener Seite entfernt und als Tab „Alle Planner" in den Admin-Bereich integriert',
      'GET /api/planners liefert für alle Rollen (auch Admin) standardmäßig nur eigene Planner; ?all=true für die Systemverwaltung',
      'Teams-Tab im Admin-Bereich: Planner-Filter-Dropdown',
      'Benutzer-Tab: Suchfeld für Benutzername/E-Mail',
      'Demo-Account-Bereinigung: admin@planner.dev entfernt, thomas.wolff@planner.dev ist jetzt Admin',
      'Dark Mode ist jetzt Standard für neue Sitzungen',
    ],
  },
  {
    version: '2.8.0',
    title: 'Fix: Erstellen-Dropdown & Sprint-Dropdown schließen bei Klick daneben',
    items: [
      'Erstellen-Button im Header: Klick-außerhalb-Erkennung korrigiert',
      'Sprint-Dropdown in der Projekte-Tabelle: Klicks daneben schließen jetzt korrekt',
    ],
  },
  {
    version: '2.7.0',
    title: 'Zeitstrahl ohne linke Spalte',
    items: [
      'Linke fixe Spalte im Zeitstrahl entfernt — volle Breite',
      'Projektbalken selbst ist der Auf-/Zuklapp-Button für die Ticket-Zeilen',
      'Ziehen verschiebt weiterhin Start-/Enddatum (Drag-to-Move)',
    ],
  },
  {
    version: '2.5.0',
    title: 'Glassmorphism-Header',
    items: [
      'AppHeader komplett auf Glassmorphism-Design umgestellt',
      'Alle Dropdowns mit frosted-glass-Stil',
      'Markenkopf mit Text-Gradient',
      'Magenta-Unterrandlinie im Header',
    ],
  },
  {
    version: '2.4.0',
    title: 'Magenta-Strahlverlauf als App-Hintergrund',
    items: [
      'Dark Mode: dunkler Hintergrund mit Magenta-Radial-Glow',
      'Light Mode: weiches Off-White mit zartem Magenta-Hauch',
    ],
  },
  {
    version: '2.3.1',
    title: 'Fix: Planner-Header nach Favorit-Login',
    items: [
      'fetchPlanners() wird jetzt vor dem Redirect zum Favorit-Planner aufgerufen',
    ],
  },
  {
    version: '2.3.0',
    title: 'Favorit-Planner & Login-Fix',
    items: [
      'Benutzer können einen Planner als Startplanner markieren',
      'Nach Login direkter Redirect zum Favoriten-Planner-Dashboard',
      'Fix: Login-Redirect zeigt korrekt /planners',
    ],
  },
  {
    version: '2.2.0',
    title: 'Admin-Bereich Erweiterungen',
    items: [
      'Teams-Tab: Bearbeiten-Modal, Team erstellen',
      'Einstellungen-Tab: Ticket-Präfix je Planner',
      'Planner-Verwaltung zeigt "Erstellt von"',
    ],
  },
  {
    version: '2.1.0',
    title: 'Teams gehören zum Planner',
    items: [
      'Teams haben jetzt ein plannerId-Feld',
      'GET /teams?plannerId= filtert planner-spezifisch',
      'Planner-Zugang im Admin-Bereich: neuer Tab für Mitgliederverwaltung',
    ],
  },
  {
    version: '2.0.0',
    title: 'Multi-Planner-Architektur',
    items: [
      'Planner als neue Top-Level-Einheit',
      'Jeder Planner hat eigene Projects, Tickets, Sprints, Boards',
      'URL-Struktur: /planners → /planner/:plannerId/dashboard',
      'Planner-spezifische Ticket-Nummerierung',
    ],
  },
  {
    version: '1.3.0',
    title: 'Sprint-Verwaltung im Team-Bereich',
    items: [
      'Sprints erstellen, bearbeiten, starten, abschließen, löschen',
      'Status-Flow: Planung → Aktiv → Abgeschlossen',
    ],
  },
  {
    version: '1.2.0',
    title: 'Projekt über mehrere Sprints',
    items: [
      'Projekte können beliebig vielen Sprints zugewiesen werden (sprintIds-Array)',
    ],
  },
  {
    version: '1.1.0',
    title: 'Gantt-Zeitstrahl',
    items: [
      'Neue Ansicht /gantt mit scrollbarem Zeitstrahl',
      'Drag-to-Move, Resize, Zoom-Stufen, Abhängigkeits-Pfeile',
    ],
  },
  {
    version: '1.0.0',
    title: 'Online-Status-Anzeige',
    items: [
      'Status-Ampel am Avatar: Online/Offline/Status verborgen',
      'Heartbeat alle 60s',
    ],
  },
  {
    version: '0.9.0',
    title: 'Vollseiten-Detailansicht & Header-Überarbeitung',
    items: [
      'Ticket-Detailansicht als Vollseite in Mein Team',
      'Erstellen-Button im Header fasst Ticket-/Projekt-/Anfrageformular zusammen',
    ],
  },
  {
    version: '0.8.0',
    title: 'Chat-Ticket-Links & Direktnachrichten',
    items: [
      'Chat als Direktnachrichten-System',
      '#XXX-NNNN Ticket-Referenzen klickbar',
    ],
  },
  {
    version: '0.7.0',
    title: 'Admin-Page, Router-Guard, Benutzeranfragen',
    items: [
      '/admin durch Router-Guard gesichert',
      'Admin-Inbox mit Status-Management',
    ],
  },
  {
    version: '0.6.0',
    title: 'Kommentare mit Reaktionen',
    items: [
      'Reaktions-Buttons 👍 👎 ❤️ pro Kommentar',
    ],
  },
  {
    version: '0.5.0',
    title: 'Avatar auf Ticket-Karte, Benutzer-Cache',
    items: [
      'Assignee-Avatar auf jeder Kanban-Karte',
      'useUsers-Composable als Singleton-Cache',
    ],
  },
  {
    version: '0.4.0',
    title: 'Ticket-Zuweisung & Zuletzt bearbeitet',
    items: [
      'Tickets können beim Erstellen/Bearbeiten zugewiesen werden',
      '"Zuletzt bearbeitet"-Sektion auf Mein-Team-Seite',
    ],
  },
  {
    version: '0.3.0',
    title: 'Vollausbau MVP',
    items: [
      'Rollensystem, Ticket-Nummern, Chat mit @mentions, Admin-Bereich',
    ],
  },
  {
    version: '0.2.0',
    title: 'Authentifizierung & Navigation',
    items: [
      'Login mit "Angemeldet bleiben"',
      'Rollenbasierte Navigation, Toast-System',
    ],
  },
  {
    version: '0.1.0',
    title: 'Initiales Setup',
    items: [
      'Vue 3 + Vite + TailwindCSS, Express-Backend mit JWT, Kanban-Board',
    ],
  },
]

// Single Source of Truth für die im UI angezeigte Versionsnummer (Benutzermenü, Einstellungen).
export const currentVersion = changelog[0].version
