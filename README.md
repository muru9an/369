# 369 — a journal for your becoming

A quiet, private 33-day writing practice inspired by the 3-6-9 rhythm. Choose one intention, write it three times in the morning, six times at midday, and nine times in the evening, then return the next day. At the end of day 33, save a reflection.

## Run locally

```sh
npm install
npm run dev
```

Run the test suite with `npm test` and create a production build with `npm run build`.

## Privacy and backups

Journal profiles and writing are stored in this browser's local storage. There is no account, cloud sync, telemetry, or remote journal storage. The app can be installed and works offline after its first successful visit. Profiles separate entries for people sharing one browser; they are not password-protected and do not provide access control.

Use **Settings → Export journal backup** before changing devices or browsers. Restoring a backup replaces the journal saved in the current browser. Private browsing, clearing site data, or switching browsers/devices can make the original local journal unavailable. Keep backup files somewhere you control.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` runs tests, builds the app, and deploys it to GitHub Pages on pushes to `main` and the app branch. In the repository's **Settings → Pages**, choose **GitHub Actions** as the build and deployment source if it is not already configured.
