# Cloudflare Pages Setup

This repository now has a dedicated static deployment bundle in `docs/`.

Source files:
- `index.html`
- `styles.css`
- `script.js`

Generate the deployable bundle:

```bash
./scripts/build-static-site.sh
```

Cloudflare Pages settings:
- Framework preset: `None`
- Build command: `./scripts/build-static-site.sh`
- Build output directory: `docs`

Direct upload option:
1. Run `./scripts/build-static-site.sh`
2. Upload the contents of `docs/` or the `docs/` folder itself in Pages direct upload

Notes:
- `docs/_headers` adds basic security headers for the static site.
- `docs/_redirects` adds friendly shortcut routes for placeholder sections.
- `docs/.nojekyll` keeps the directory compatible with GitHub Pages if you later publish from `/docs`.
