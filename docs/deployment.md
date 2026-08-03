# Deployment

## Umgebungsvertrag

| Umgebung | Git-Branch | Vercel-Projekt | Domains |
| --- | --- | --- | --- |
| Production | `main` | `frontend` | `lamentis.de`, `www.lamentis.de` |
| Preview | `dev` | `frontend` | `dev.lamentis.de` |

`dev` ist ein langlebiger Integrationsbranch und darf nach einem Merge nicht
gelöscht werden. Die Preview-Domain folgt ausschließlich dem neuesten
erfolgreichen Vercel-Deployment dieses Branches. Sie multiplexiert bewusst
keine parallelen Pull-Request-Branches; deren generierte URLs bleiben für
isolierte Paralleltests erhalten.

`vercel.json` im Repository-Root beschreibt nur den Build und das Routing zum
Anwendungscode in `frontend`. Domainzuordnung, DNS und die Git-Integration sind
externe Provider-Einstellungen und werden nicht in dieser Datei dupliziert.

## Provider-Einstellungen

Im Vercel-Projekt `frontend` ist `dev.lamentis.de` mit dem Environment
**Preview** und dem Git-Branch `dev` verbunden. Cloudflare veröffentlicht den
von Vercel vorgegebenen CNAME für die Subdomain.

In jedem Vercel-Projekt, das weiterhin mit diesem GitHub-Repository verbunden
ist, gelten unter **Settings -> Git** folgende Schalter:

- **Pull Request Comments**: aus
- **deployment_status Events**: aus
- **repository_dispatch Events**: an
- **Commit Status**: an

Damit entfallen der Vercel-Bot-Kommentar und die Deployment-Einträge in der
Pull-Request-Aktivität. Deployments und ihre Commit-Status-Nachweise bleiben
aktiv. Das veraltete `github.silent` gehört nicht in `vercel.json`.

## Verifikation

Die Nachweise werden getrennt berichtet:

1. **Repository:** `git diff --check` und die für den tatsächlichen Diff
   relevanten lokalen Gates.
2. **Vercel:** Das Deployment ist `READY`, gehört zum Projekt `frontend`, zum
   Branch `dev` und zum erwarteten Commit-SHA; `dev.lamentis.de` ist dessen
   Alias.
3. **DNS und TLS:** Der autoritative DNS-Eintrag zeigt auf den von Vercel
   vorgegebenen CNAME und HTTPS besitzt ein gültiges Zertifikat.
4. **Runtime:** `/` leitet auf `/en`; `/en`, `/de` und
   `/en/api-creator-studio` liefern die erwartete Anwendung über die
   Preview-Domain. Eine aktive Deployment Protection wird dabei nicht
   umgangen.
5. **GitHub:** Ein neuer Push oder Pull Request erzeugt keinen Vercel-Kommentar
   und keine `deployment_status`-Aktivität. Der Vercel-Commit-Status bleibt
   sichtbar und erfolgreich.

Ein grüner lokaler Lauf belegt weder das Remote-Deployment noch DNS, TLS,
GitHub-Integration oder Browser-Runtime; diese Flächen müssen jeweils direkt
geprüft werden.
