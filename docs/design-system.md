# Designsystem

## Grundsätze

Die Website behält ihre Schwarz-Weiß-Identität und zwei globale
Plattformgradienten. Alle Styles bestehen aus zwei globalen Dateien und
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
- Farben: ausschließlich semantische Rollen plus Plattformgradienten
- Typografie: semantische Interface-Rollen
- Formflächen: eine kanonische Feldfarbe, eine große Kontrollhöhe und eine
  gemeinsame maximale Formbreite

Responsive Werte wechseln ausschließlich an den beiden Breakpoints:

| Rolle | Desktop | bis `64rem` | bis `40rem` |
| --- | ---: | ---: | ---: |
| Seitengutter | 64 px | 32 px | 16 px |
| Navigationsabstand | 32 px | 20 px | 8 px |
| Footer-Spaltenabstand | 80 px | 48 px | 32 px |
| Footer-Blockpadding | 96 px | 80 px | 64 px |
| Dialog-Blockpadding | 96 px | 64 px | 48 px |
| Displaytypografie | 72 px | 48 px | 32 px |

Die beiden global verfügbaren Akzentverläufe heißen
`--gradient-platform-sunset` und `--gradient-platform-aurora`. Sie sind keine
seitengebundenen Styles und können künftig von mehreren Plattformflächen
verwendet werden.

Die Navigation verwendet das bestehende Lamentis-Markenzeichen mit einem
themeabhängigen Kontrastfilter. Der About-Link verwendet das kanonische runde
Elias-Porträt; beide Bilder sind dekorativ und ergänzen ihre sichtbaren
Linktexte, statt eigene zugängliche Namen zu duplizieren.

Icon-Links verwenden einen gemeinsamen, tokenisierten Icon-Slot. Die
Textachse wird dadurch von der intrinsischen Geometrie einzelner SVGs oder
Bilder entkoppelt; unterschiedliche Icons dürfen Linktexte niemals versetzen.

Breite Formflächen verwenden `--layout-form-wide`,
`--control-height-large`, `--color-field-background` und
`--color-field-placeholder`. Damit bleiben Suchfeld und künftige Formflächen
responsive und themefähig, ohne komponentenlokale Geometrie- oder Farbwerte.
Die Search-Fläche bleibt in Ruhe und Fokus randlos; der native Textcursor zeigt
den Eingabefokus, ohne einen zusätzlichen Active-Rahmen einzuführen. Fokus
wechselt stattdessen Fläche, Icon und Placeholder auf den kanonischen
Sekundärkontrast. Nur im Forced-Colors-Modus ergänzt das System einen
2-px-Outline.
Lokalisierte Überschriften dürfen den Seitencontainer auch bei 200 Prozent
Textgröße nicht verbreitern und brechen deshalb innerhalb ihrer Komponente um.

Stylelint verlangt Tokens für Farben, Schrift, Abstände, logische
Eigenschaften, Insets, Dimensionen, Radien, Schatten, Background Images,
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

Inter wird als lokaler variabler Latin-Schnitt geladen. Weitere Produktfonts
oder externe Font-Requests existieren nicht.
