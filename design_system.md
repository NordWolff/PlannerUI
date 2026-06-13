# Design-System: Planner

## Designprinzipien
- Keine Seitenleisten
- Vollflächiger Content unter dem Header
- Kein Footer
- Klare Hierarchie, minimales Design

## Farben (TailwindCSS)

### Primärfarbe
- Primary: `indigo-600` (#4F46E5)
- Primary Hover: `indigo-700`
- Primary Light: `indigo-50`

### Grautöne (Light Mode)
- Background: `gray-50`
- Surface: `white`
- Border: `gray-200`
- Text Primary: `gray-900`
- Text Secondary: `gray-500`
- Text Muted: `gray-400`

### Grautöne (Dark Mode)
- Background: `gray-900`
- Surface: `gray-800`
- Border: `gray-700`
- Text Primary: `white`
- Text Secondary: `gray-400`

### Status-Farben
- Draft: `gray-400`
- Geplant: `blue-500`
- In Arbeit: `yellow-500`
- Review: `purple-500`
- Abschluss: `green-500`

### Priorität-Farben
- Niedrig: `green-500`
- Mittel: `yellow-500`
- Hoch: `orange-500`
- Kritisch: `red-500`

## Typografie
- Font: System-Font Stack (Tailwind default)
- Heading XL: `text-2xl font-bold`
- Heading L: `text-xl font-semibold`
- Heading M: `text-lg font-semibold`
- Body: `text-sm`
- Caption: `text-xs text-gray-500`

## Layout

### Header
```
height: h-16
background: white / dark:gray-800
border-bottom: border-b border-gray-200
padding: px-6
```

### Hauptbereich
```
padding-top: pt-16 (Header-Höhe)
padding: p-6
max-width: max-w-7xl mx-auto
```

### Navigation (Header-Mitte)
- Horizontal, zentriert
- Active: `text-indigo-600 border-b-2 border-indigo-600`
- Inactive: `text-gray-600 hover:text-gray-900`

## Komponenten

### Karten
```
bg-white dark:bg-gray-800
rounded-xl
shadow-sm
border border-gray-100 dark:border-gray-700
p-6
```

### Buttons
- Primary: `bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium`
- Secondary: `bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium`
- Danger: `bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium`

### Inputs
```
border border-gray-300 dark:border-gray-600
rounded-lg px-3 py-2
text-sm
bg-white dark:bg-gray-700
text-gray-900 dark:text-white
focus:ring-2 focus:ring-indigo-500 focus:border-transparent
```

### Badges/Tags
```
inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
```

### Modals
```
fixed inset-0 z-50
bg-black/50 backdrop-blur
max-w-2xl mx-auto
bg-white dark:bg-gray-800 rounded-xl shadow-xl
```

### Tabellen
```
w-full text-sm
thead: bg-gray-50 dark:bg-gray-700
th: px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase
td: px-4 py-3 text-gray-900 dark:text-white
```

## Kanban-Board
- Spalten: Feste Breite `w-72`
- Ticket-Karten: `bg-white rounded-lg shadow-sm p-3 cursor-grab`
- Drag-Over: `ring-2 ring-indigo-400`

## Icons
- Bibliothek: Heroicons (via @heroicons/vue)
- Größe Standard: `w-5 h-5`
- Größe Klein: `w-4 h-4`

## Animationen
- Transitions: `transition-all duration-200`
- Hover: `hover:shadow-md`
- Modals: `transition-opacity duration-200`

## Avatar
- Größe: `w-8 h-8` (Header), `w-10 h-10` (Profil)
- Form: `rounded-full`
- Quelle: UI Avatars API oder DiceBear