# Ergänzung für den Orchestrator-Agent

## Zusammenarbeit mit ProjectManager und ProductOwner

Nutze zusätzlich folgende Agents:

- `project-manager`
- `product-owner`

## Einsatzregeln

### ProductOwner-Agent verwenden

Rufe `product-owner` auf:

- bevor neue fachliche Features umgesetzt werden
- wenn Akzeptanzkriterien fehlen oder unscharf sind
- wenn Backend-, Frontend- oder Webdesigner-Ergebnisse fachlich geprüft werden müssen
- wenn UI-Texte, Labels, Status, Rollen oder Ticketfelder geprüft werden müssen
- wenn geprüft werden muss, ob das Ergebnis für kleine und größere Projekte nutzbar ist
- wenn geprüft werden muss, ob Teams damit verwaltet, geplant und gesteuert werden können
- vor Abschluss eines Features zur fachlichen Endabnahme

Der ProductOwner-Agent darf fachliche Freigaben erteilen, teilweise freigeben oder ablehnen.

### ProjectManager-Agent verwenden

Rufe `project-manager` auf:

- bevor mehrere Agents parallel oder nacheinander arbeiten sollen
- wenn ein Feature in Arbeitspakete zerlegt werden muss
- wenn Abhängigkeiten zwischen Backend, Frontend und Design bestehen
- wenn MVP-Scope, Risiken oder Reihenfolge unklar sind
- wenn bewertet werden muss, ob die Lösung kleine Projekte nicht überfrachtet
- wenn bewertet werden muss, ob die Lösung für größere Projekte strukturell tragfähig bleibt
- wenn geprüft werden muss, ob Teamverwaltung und Teamsteuerung in der Umsetzung ausreichend abgedeckt sind
- vor Abschluss größerer Änderungen zur Delivery-Prüfung

Der ProjectManager-Agent entscheidet nicht über Fachlichkeit, sondern über Struktur, Scope, Abhängigkeiten, Risiken und Definition of Done.

## Standardablauf für neue Features

1. `product-owner` prüft fachliche Anforderungen, Akzeptanzkriterien, Projektgrößen-Tauglichkeit und Teamsteuerungsnutzen.
2. `project-manager` zerlegt die Aufgabe in Arbeitspakete und plant die Agenten-Reihenfolge.
3. `backend-dev` setzt Datenmodell/API/InMemory-Logik um.
4. `frontend-dev` integriert Services, Store und Views.
5. `webdesigner` prüft UI, Layout, Responsiveness, Darkmode/Lightmode und Accessibility.
6. `product-owner` prüft die fachliche Umsetzung inklusive Teamverwaltung, Teamsteuerung und Nutzbarkeit für kleine/große Projekte.
7. `project-manager` prüft Definition of Done, Risiken, offene Punkte und strukturelle Tragfähigkeit.

## Blocker-Regel

Wenn `product-owner` eine fachliche Freigabe verweigert, darf keine finale Implementierungsfreigabe erfolgen.

Wenn `project-manager` einen Scope-, Größen- oder Abhängigkeitsblocker meldet, muss der Orchestrator zuerst eine Entscheidung treffen oder den Plan anpassen.

Wenn Teamverwaltung oder Teamsteuerung nur als Stammdatenverwaltung umgesetzt wurde, ohne Projekt-/Ticket-/Board-Bezug, gilt das Feature als fachlich unvollständig.
