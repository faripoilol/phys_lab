# Extracted Frequencies

Prony modes for the three capture runs kept as test fixtures, produced by
`extract_frequencies_prony.py` with the stability filter and energy ranking.

Analysis settings: `--signals cx_px,cy_px --order 6 --top-k 3 --min-frequency 0.2`
(defaults `--max-decay-rate 5.0 --max-growth-rate 0.75`).

Regenerate with:

```bash
source ~/envs/env312/bin/activate
for r in run21_preview run22_preview run23_preview; do
  python extract_frequencies_prony.py --input tests/fixtures/$r.csv --out out/prony_$r \
    --signals cx_px,cy_px --order 6 --top-k 3 --min-frequency 0.2
done
```

## Accepted modes

| Run | Rank | Signal | Frequency (Hz) | Period (s) | Amplitude (px) | Damping (1/s) |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| run21_preview | 1 | cx_px | 0.7273 | 1.3750 | 139.802 | -3.6061 |
| run21_preview | 1 | cy_px | 1.5253 | 0.6556 | 66.497 | -0.1434 |
| run22_preview | – | – | no accepted modes | | | |
| run23_preview | 1 | cx_px | 0.7533 | 1.3274 | 60.723 | -0.0314 |
| run23_preview | 1 | cy_px | 1.5250 | 0.6557 | 69.137 | -0.0326 |

## Rejected candidates

| Run | Signal | Frequency (Hz) | Amplitude (px) | Damping (1/s) | Status |
| --- | --- | ---: | ---: | ---: | --- |
| run21_preview | cx_px | 6.1778 | 18.066 | -6.0164 | rejected: overdamped |
| run21_preview | cx_px | 10.0730 | 9.914 | -11.3527 | rejected: overdamped |
| run21_preview | cy_px | 6.6429 | 27.111 | -9.0904 | rejected: overdamped |
| run21_preview | cy_px | 10.5994 | 11.361 | -10.1115 | rejected: overdamped |
| run22_preview | cx_px | 15.4061 | 254.311 | -34.6734 | rejected: overdamped |
| run22_preview | cx_px | 15.4061 | 170.184 | -26.8101 | rejected: overdamped |
| run22_preview | cx_px | 6.8355 | 24.044 | -15.1627 | rejected: overdamped |
| run22_preview | cy_px | 12.2970 | 25.506 | -30.7423 | rejected: overdamped |
| run22_preview | cy_px | 7.2000 | 17.533 | -21.1807 | rejected: overdamped |
| run23_preview | cx_px | 5.9873 | 30.976 | -10.1339 | rejected: overdamped |
| run23_preview | cy_px | 6.8317 | 32.129 | -14.3516 | rejected: overdamped |

## Reading the results

- Runs 21 and 23 are rope-pendulum swings. The horizontal signal gives the pendulum
  frequency (about 0.73–0.75 Hz, i.e. a length near 0.45 m), and the vertical signal
  oscillates at twice that frequency, as expected for a bob moving on an arc.
- Run 22 is a near-stationary marker (a few pixels of drift and noise). Every candidate
  is a fast-decaying transient, so the tool correctly reports no accepted mode and
  exits with status 1.
- The earlier version of this table ranked by raw amplitude and listed those
  transients first; it also cited `run30*` captures that are not in the repository.
