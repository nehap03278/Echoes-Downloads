# Echoes — download site

The public, standalone download page for the Echoes Android app. This is
a small React + Vite + TypeScript frontend only — no backend, no database.

## Develop

```
npm install
npm run dev
```

## Configure the APK link

Set the download URL in one place: [src/config.ts](src/config.ts)

```ts
export const APK_DOWNLOAD_URL = "YOUR_APK_DOWNLOAD_URL";
```

Both download buttons on the page read from this constant.

## Screenshots

Drop real app screenshots into `public/screenshots/` using the filenames
described in [public/screenshots/README.txt](public/screenshots/README.txt)
(`feed.png`, `create.png`, `discover.png`, `profile.png`). Until a file is
present, that slot shows a soft placeholder instead of a broken image.

## Build

```
npm run build
```

Outputs a static site to `dist/`, ready to deploy to any static host.
