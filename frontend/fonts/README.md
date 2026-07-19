# Lokale Webfonts

Diese drei WOFF2-Dateien enthalten ausschließlich die von der Website
benötigten Latin-Subsets:

- Inter als variable normale Schrift
- Cousine in Latin 700 für NOX
- Noto Serif in Latin 900 für Noma

Sie werden mit `next/font/local` eingebunden. Dadurch lädt der Build keine
weiteren Sprach-Subsets und bleibt unter dem dokumentierten Fontbudget.
