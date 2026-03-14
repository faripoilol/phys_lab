# Online Physics Lab - Stage 1 Camera CV Spike

Stage 1 spike for live webcam marker tracking:
- Capture camera frames in real time
- Track a high-contrast colored marker (HSV threshold + contours)
- Save timestamped position data to CSV
- Save displacement-vs-time plot

## Setup

```bash
source ~/envs/env312/bin/activate
pip install -r requirements.txt
```

## Run

Basic run (camera index 0):

```bash
python3 track_marker_cam.py --out out/run1
```

Run for 10 seconds with custom resolution:

```bash
python3 track_marker_cam.py --out out/run2 --duration 10 --width 1280 --height 720
```

Use a specific Linux camera device and disable preview windows:

```bash
python3 track_marker_cam.py --out out/run3 --device /dev/video2 --no-preview
```

Tune HSV bounds (defaults are tuned for stricter red detection, using two hue ranges):

```bash
python3 track_marker_cam.py --out out/run4 --hsv-lower 0,120,90 --hsv-upper 10,255,255 --hsv-lower2 170,120,90 --hsv-upper2 179,255,255
```

## Outputs

Each run writes to `--out`:
- `data.csv` with columns: `t_s,cx_px,cy_px,displacement_px`
- `plot.png` displacement over time
- `debug_first_frame.png` first processed frame + mask for debugging
- `raw_preview.mp4` annotated capture recording (disable with `--no-mp4`)

## Frequency Extraction

Use Prony's method to estimate dominant oscillation frequencies from saved coordinate traces:

```bash
source ~/envs/env312/bin/activate
python extract_frequencies_prony.py \
  --input out/run22_preview/data.csv \
  --out out/run22_prony \
  --signals cx_px,cy_px \
  --order 6 \
  --top-k 2 \
  --min-frequency 0.2
```

What the analyzer does:
- reads coordinate-vs-time data from `data.csv`
- removes invalid samples and resamples each selected signal onto a uniform timeline
- linearly detrends the signal by default
- applies Prony's method to estimate damped oscillatory modes
- reports the strongest frequencies in Hz

Frequency analysis outputs:
- `frequencies.csv` with one row per detected mode
- `prepared_<signal>.csv` with the interpolated and detrended signal used by Prony's method

Notes:
- choose an even `--order`
- as a rule of thumb, keep `--order` at least `2 x` the number of oscillatory modes you expect
- `cx_px` and `cy_px` are usually better inputs than `displacement_px`, because displacement can fold multiple motions into one magnitude trace

## Linux camera notes

- Check camera nodes: `ls -l /dev/video*`
- If camera access fails, add your user to the `video` group and re-login:

```bash
sudo usermod -aG video "$USER"
```

## License

Apache-2.0 (license files already present in this repository).
