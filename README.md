# Ein Advent für dich

Ein statischer Adventskalender für Dezember 2026. Jeden Tag öffnet um
8 Uhr Berliner Zeit ein weiteres Türchen. Vergangene Türchen bleiben
verfügbar. Der Browser merkt sich, welche Türchen bereits freigerubbelt
wurden.

## Texte und Fotos eintragen

Fülle die 24 Einträge in [`calendar-data.js`](calendar-data.js). Pro Türchen
gibt es eine Überschrift, einen Text sowie optional ein Foto.

```js
{ day: 1, title: "Deine Überschrift", text: "Erster Absatz.\n\nZweiter Absatz.",
  image: "assets/fotos/01.webp", alt: "Kurze Beschreibung des Fotos" },
```

Kopiere Fotos nach [`assets/fotos/`](assets/fotos/) und setze den jeweiligen
Dateipfad. Bei leerem Bildpfad erscheint das Motiv des jeweiligen Türchens. Den Titel auf der
Startseite findest du in [`index.html`](index.html).

## Lokal öffnen

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Öffne den [Kalender im Browser](http://127.0.0.1:8000/). Die automatisierten
Browser-Tests simulieren Dezembertage.

## GitHub Pages

Pushe den gewünschten Stand. Wähle auf GitHub unter **Settings → Pages**
bei **Source** die Einstellung **Deploy from a branch**, dann **main** und
**/(root)**. Die Datei `.nojekyll` lässt GitHub Pages die statischen Dateien
direkt ausliefern. [GitHub Pages-Dokumentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Tests

```sh
npm ci
npx playwright install chromium
npm test
```

Node und Playwright werden für die Tests gebraucht. Die Website selbst lädt
ihre Schriften und Grafiken aus dem Repository.
