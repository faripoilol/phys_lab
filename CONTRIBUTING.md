# Contributing

- Keep changes focused and small.
- Open an issue or describe the problem and approach in your PR.
- Add or update a test with every behaviour change. Python tests live in
  `tests/test_*.py`, browser estimator tests in `tests/estimator.test.js`, and
  the headless UI test in `tests/test_ui_live_lab.py`.
- Run the checks before submitting:

```bash
source ~/envs/env312/bin/activate
python -m py_compile track_marker_cam.py extract_frequencies_prony.py
pytest -q
node --test tests/estimator.test.js
/usr/bin/python3 -m pytest -q tests/test_ui_live_lab.py   # needs Playwright; skipped inside env312
./scripts/build-static-site.sh
```

- Do not commit `docs/` or `out/`; both are generated.
- Do not add a `package.json` at the repository root: the Cloudflare Workers
  production build fails when one is present. Run the Node tests directly.
- Do not modify `LICENSE` unless explicitly requested.
