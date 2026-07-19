# Designsystem

## Grundsätze

Die Website behält ihre Schwarz-Weiß-Identität und die beiden
Produktgradienten. Alle Styles bestehen aus zwei globalen Dateien und
co-located CSS Modules:

- `frontend/styles/tokens.css` definiert den Vertrag.
- `frontend/styles/base.css` definiert Browser-Grundlagen.
- Jede visuelle Komponente besitzt ein eigenes CSS Module.

Es existiert kein paralleles Utility- oder Theme-System. Light und Dark folgen
der Systemeinstellung.

## Tokenvertrag

- Basis-Schriftgröße: Browserstandard `100%`
- Spacing: 4-px-Raster
- Radien: 8, 12, 16 und vollständig rund
- Motion: 120 und 180 ms
- Ebenen: Header, Popover und Dialog
- Breakpoints: `40rem` und `64rem`
- Farben: ausschließlich semantische Rollen plus NOX- und Noma-Gradient
- Typografie: semantische Rollen für Interface-, Mono- und Serif-Text

Stylelint verlangt Tokens für Farben, Schrift, Abstände, Radien, Schatten,
Ebenen und Motion. Erlaubte Literale bleiben auf Nullwerte, 1-px-Haarlinien,
SVG-Geometrie und die dokumentierten Media Queries begrenzt.

## Accessibility und responsive Verhalten

- Der Header ist sticky und benötigt keine gemessene Body-Verschiebung.
- Fokus ist auf allen interaktiven Elementen eindeutig sichtbar.
- Toggle-Controls sind mindestens 44 px hoch und breit.
- Der mobile Dialog verwendet native Dialog-Semantik, Escape und
  Fokus-Rückgabe.
- Reduced Motion und Forced Colors besitzen explizite Fallbacks.
- Responsives Layout entsteht in CSS; JavaScript berechnet keine Breakpoints.

## Schriftdateien

Inter wird nur für die benötigten Interface-Schnitte geladen. Cousine Latin 700
ist NOX vorbehalten, Noto Serif Latin 900 Noma. Der erzeugte Fontbestand soll
insgesamt unter 250 KB bleiben und wird nach Produktions-Builds kontrolliert.
