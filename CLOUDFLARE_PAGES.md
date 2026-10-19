# Cloudflare Pages Setup

GitHub is the source repository only. Cloudflare Pages builds the deployable
static bundle into `docs/` during each deployment, and `docs/` is intentionally
ignored by Git.

Source files:
- `index.html`
- `styles.css`
- `script.js`
- `assets/`
- `pl.png`
- `scripts/build-static-site.sh`

Generate the deployable bundle locally:

```bash
./scripts/build-static-site.sh
```

Cloudflare Pages settings:
- Framework preset: `None`
- Build command: `./scripts/build-static-site.sh`
- Build output directory: `docs`
- Production branch: `main`

Normal release flow:

```bash
source ~/envs/env312/bin/activate
pytest -q
node --test tests/estimator.test.js
./scripts/build-static-site.sh
git add -A
git commit -m "Describe the source change"
git push origin main
```

GitHub Actions runs the same checks plus the headless UI test on every push.

After the push, Cloudflare pulls `main`, runs the build command, and deploys the
generated `docs/` output. Do not commit `docs/`.

Notes:
- The generated `docs/_headers` file adds deployment security headers and allows
  camera access for the live lab.
- The generated `docs/_redirects` file adds friendly shortcut routes.
- GitHub Pages is not used for this project.
