# Roadmap

What is still open for Phys Lab. The experiment manual (`EXPERIMENTS.md`), the
website manual section, inline SVG animations, and the three live app modes are
done; this file replaces the earlier documentation expansion plan.

## Live app modes

- Add app modes for the three documentation-only experiments: measuring the
  spring constant from static extension, springs in parallel, springs in
  series. Each needs inputs for `k1`, `k2`, the arrangement, and a comparison
  against the predicted combined stiffness.
- Add a tracking preview that shows which red blob is being followed, so a
  second red object in the frame is obvious before a run starts.

## Formulas and visuals

- Decide whether to keep the hand-built formula markup or vendor KaTeX. The
  Cloudflare `_headers` Content-Security-Policy only allows same-origin scripts
  and styles, so any renderer must be served from this repository.
- Add apparatus photos or generated illustrations under `assets/`.

## Measurement quality

- Verify the animation-frame fallback path (used where
  `requestVideoFrameCallback` is unavailable) in Firefox with a real camera;
  the automated UI test runs in Chromium only.
- Consider a per-run calibration step (marker size or a reference length) so
  amplitudes can be reported in metres rather than normalised units.

## Project hygiene

- Resolve the deployment story. `CLOUDFLARE_PAGES.md` documents Cloudflare
  Pages building `docs/`, but the GitHub check runs show that Cloudflare
  Workers Builds is what actually runs: it succeeds on `main` and fails on
  every pull-request branch (including the previously merged PR #2), so the
  dashboard build settings, not the repository, hold the real configuration.
  Document those settings, fix or disable the branch preview builds, and close
  or finish the open Workers configuration pull request.
- Decide whether `notebooks/prony.ipynb` (untracked exploration of Prony's
  method) should be committed with outputs stripped or removed.
