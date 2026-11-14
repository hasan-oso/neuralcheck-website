# neuralcheck-website

Next.js 14 (App Router), static export, served from Firebase Hosting.

```bash
npm run dev     # local
npm run build   # → out/   (runs the render-surface guard first, via prebuild)
```

Deploy is `firebase deploy --only hosting`, which publishes whatever is in
`out/`. Build before deploying: `out/` is gitignored and may hold a stale tree,
or one built from a branch that is not the one you think you are shipping.

## The build is not deterministic

Two builds of the *same commit* do not produce the same output. Measured on
`main` at `778534d`, built twice with no source change in between:

- **8 files renamed**
- **38 files changed at the same path**
- ~46 of 92 files differ in total

Two things move on every run:

1. **`buildId`** — a fresh id each build (`VDTd7iQTRX-i42ajWbVta`,
   `HQmya6veTAC6keL1rynw_`, `mVSYOlipjKoMvG4WSsP-W` were three consecutive
   runs). It is embedded in every `index.html`, so every page file changes.
2. **Chunk filenames** — the content-hash suffixes are not stable across runs
   either. `app/login/layout-e1508ff867659197.js` appeared as *removed* when
   diffing two builds, then turned up again in a later build of a different
   branch.

### What follows from that

**The number of files a deploy uploads says nothing about how much changed.**
Firebase reports something like "found 91 files, uploading 54" on a deploy that
touched one component. Roughly 46 of those are churn that any rebuild would
have produced.

**To see what actually changed between two builds, normalise first.** Erase the
buildId and the content hashes from both the filenames and the file contents,
then compare:

```bash
sed -E 's#[A-Za-z0-9_-]{21}#BUILDID#g; s#[0-9a-f]{16}#HASH#g'
```

Against a real single-component change this collapsed a 46-file diff to three
genuine entries: the route's own chunk, the CSS bundle, and that page's HTML
shell — 78 of 88 text assets byte-identical.

Narrower normalisation is not enough. A first attempt that only rewrote hashes
inside known path patterns still reported every page as changed, because the
buildId also appears in positions that pattern missed.
