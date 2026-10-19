# Phys Lab

Phys Lab is a browser-based oscillation laboratory for classroom experiments
with a rope pendulum and a spring pendulum. Students point a webcam at a red
marker on the moving bob, record one run at a time, review the measured
frequency, and compare saved runs. The site is published at `phys-lab.org`.

The repository also contains the Python tooling that preceded the browser app:
a webcam marker tracker and a Prony-based frequency extractor for recorded
traces.

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html`, `script.js`, `styles.css`, `assets/`, `pl.png` | The static site: live lab, experiment manual, quick start |
| `scripts/build-static-site.sh` | Builds the deployable bundle into `docs/` (ignored by Git) |
| `EXPERIMENTS.md` | Canonical draft of the student experiment manual |
| `ROADMAP.md` | What is still planned for the site and the app modes |
| `CLOUDFLARE_PAGES.md` | Deployment setup |
| `track_marker_cam.py` | Webcam marker tracking to CSV and plot |
| `extract_frequencies_prony.py` | Prony frequency extraction from a CSV trace |
| `frequencies.md` | Results of the extractor on the fixture runs |
| `tests/` | Python tests, Node tests for the browser estimator, a headless UI test, and CSV fixtures |

## Running the site locally

The site is plain HTML, CSS and JavaScript with no build step. Serve the
repository root from any static server and open `index.html`:

```bash
python3 -m http.server 8000
```

Camera access requires `localhost` or HTTPS. The live lab is tested headlessly
in Chromium; browsers without `requestVideoFrameCallback` use a throttled
animation-frame fallback for sampling.

## How the live lab measures frequency

- The camera frame is downscaled to 240 px wide and red pixels are grouped into
  connected blobs. The marker is the blob nearest the previous detection, or the
  largest blob when there is no previous detection, so a second red object in
  the background does not pull the measurement.
- One sample is taken per camera frame, using `requestVideoFrameCallback` where
  available and a throttled animation-frame fallback elsewhere. Samples are
  resampled to a fixed 30 Hz analysis rate, so results do not depend on the
  display refresh rate.
- The live readout uses the first autocorrelation peak of the last 10 s. The
  stopped-run estimate fits Prony modes to the last 30 s, rejects modes that
  decay faster than 5 1/s or grow faster than 0.75 1/s, ranks the rest by
  energy, and selects the strongest.
- Each mode has a measurable range, shown next to the live readout: rope modes
  accept 0.3 to 2.5 Hz, the spring mode accepts 0.3 to 6 Hz. Motion outside the
  range gives no live reading, and out-of-range Prony modes are listed as
  rejected in the candidate table.

Runs are stored in the browser's local storage and can be exported as JSON.

## Tests

Python tests run in the project environment:

```bash
source ~/envs/env312/bin/activate
pip install -r requirements.txt
pytest -q
```

The browser estimator and marker detector have Node tests (Node 18 or newer):

```bash
node --test tests/estimator.test.js
```

The headless UI test drives the page in Chromium with a fake camera. It needs
Playwright, which is installed for the system `python3` on the development
machine rather than in `env312`:

```bash
/usr/bin/python3 -m pytest -q tests/test_ui_live_lab.py
# elsewhere: pip install pytest playwright && python -m playwright install chromium
```

Use the interpreter path explicitly: with `env312` activated, `python3` resolves
to the project environment, where the test is skipped.

The same checks run in GitHub Actions on every push.

## Python tooling

### Webcam marker tracking

```bash
source ~/envs/env312/bin/activate
python track_marker_cam.py --out out/run1
python track_marker_cam.py --out out/run2 --duration 10 --width 1280 --height 720
python track_marker_cam.py --out out/run3 --device /dev/video2 --no-preview
```

A run ends when `--duration` elapses, when `q` is pressed in the preview window,
or on Ctrl-C. In every case the outputs are written to `--out`:

- `data.csv` with columns `t_s,cx_px,cy_px,displacement_px`
- `plot.png`, displacement over time
- `debug_first_frame.png`, first processed frame and mask
- `raw_preview.mp4`, annotated capture (disable with `--no-mp4`)

Red detection uses two HSV hue ranges; tune them with `--hsv-lower`,
`--hsv-upper`, `--hsv-lower2` and `--hsv-upper2` (defaults `0,120,90`,
`10,255,255`, `170,120,90`, `179,255,255`). On Linux, check `ls -l /dev/video*`
and add your user to the `video` group if the camera cannot be opened.

### Frequency extraction

```bash
source ~/envs/env312/bin/activate
python extract_frequencies_prony.py \
  --input tests/fixtures/run23_preview.csv \
  --out out/run23_prony \
  --signals cx_px,cy_px \
  --order 6 \
  --top-k 3 \
  --min-frequency 0.2
```

The analyzer resamples each signal onto a uniform timeline, detrends it, fits
Prony modes, and reports the dominant oscillation frequencies. A Prony fit
always returns `--order` roots, and on real traces several of them are short
transients, so the analyzer:

- rejects modes that decay faster than `--max-decay-rate` (default 5.0 1/s)
  with status `rejected: overdamped`
- rejects modes that grow faster than `--max-growth-rate` (default 0.75 1/s)
  with status `rejected: unstable`
- ranks the remaining modes by energy over the analysed window rather than raw
  amplitude, so a sustained oscillation outranks a large but short transient
- suppresses near-duplicates of an accepted mode and anything past `--top-k`

Outputs in `--out`:

- `frequencies.csv` with every candidate, accepted rows first. `mode_rank` is
  `1..top-k` for accepted modes and `0` for rejected ones; `status` gives the
  reason; `energy` is the ranking key.
- `prepared_<signal>.csv` with the interpolated and detrended signal.

The exit code is `0` only when at least one mode was accepted. A trace without
sustained oscillation reports `no accepted modes` and exits with `1`.

Notes:

- choose an even `--order`, at least twice the number of modes you expect
- `cx_px` and `cy_px` are better inputs than `displacement_px`, which folds
  several motions into one magnitude
- for a rope pendulum the horizontal signal gives the pendulum frequency and the
  vertical signal oscillates at twice that frequency

## Deployment

See `CLOUDFLARE_PAGES.md`. Cloudflare Pages runs `scripts/build-static-site.sh`
on the `main` branch and serves the generated `docs/` directory.

## License

Apache-2.0, see `LICENSE`.
