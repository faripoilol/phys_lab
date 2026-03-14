#!/usr/bin/env python3
"""Extract dominant coordinate frequencies from time-series data using Prony's method."""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

import numpy as np
import pandas as pd


@dataclass
class PreparedSignal:
    """Uniformly resampled signal prepared for Prony analysis."""

    name: str
    t_s: np.ndarray
    raw_interpolated: np.ndarray
    prepared: np.ndarray
    dt_s: float


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Estimate dominant oscillation frequencies from coordinate-vs-time data "
            "using Prony's method."
        )
    )
    parser.add_argument("--input", required=True, help="Input CSV with time and coordinate columns")
    parser.add_argument("--out", required=True, help="Output directory for Prony analysis artifacts")
    parser.add_argument("--time-column", default="t_s", help="Time column name (default: t_s)")
    parser.add_argument(
        "--signals",
        default="cx_px,cy_px",
        help="Comma-separated signal columns to analyze (default: cx_px,cy_px)",
    )
    parser.add_argument(
        "--order",
        type=int,
        default=6,
        help=(
            "Prony model order. Use an even number and keep it at least twice the "
            "number of expected oscillatory modes."
        ),
    )
    parser.add_argument("--top-k", type=int, default=3, help="Number of dominant modes to report")
    parser.add_argument(
        "--min-frequency",
        type=float,
        default=0.1,
        help="Minimum frequency in Hz to keep (default: 0.1)",
    )
    parser.add_argument(
        "--max-frequency",
        type=float,
        default=None,
        help="Maximum frequency in Hz to keep (default: Nyquist frequency)",
    )
    parser.add_argument(
        "--no-detrend",
        action="store_true",
        help="Disable linear detrending before Prony analysis",
    )
    return parser.parse_args(argv)


def parse_signal_names(text: str) -> list[str]:
    names = [part.strip() for part in text.split(",") if part.strip()]
    if not names:
        raise ValueError("At least one signal column must be provided.")
    return names


def average_duplicate_times(t_s: np.ndarray, values: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    order = np.argsort(t_s)
    t_sorted = t_s[order]
    v_sorted = values[order]
    unique_t, inverse = np.unique(t_sorted, return_inverse=True)
    if len(unique_t) == len(t_sorted):
        return t_sorted, v_sorted
    sums = np.bincount(inverse, weights=v_sorted)
    counts = np.bincount(inverse)
    return unique_t, sums / counts


def prepare_signal(
    t_s: np.ndarray,
    values: np.ndarray,
    *,
    signal_name: str,
    detrend: bool,
) -> PreparedSignal:
    mask = np.isfinite(t_s) & np.isfinite(values)
    if mask.sum() < 4:
        raise ValueError(f"Signal {signal_name!r} does not have enough finite samples.")

    t_valid = np.asarray(t_s[mask], dtype=float)
    v_valid = np.asarray(values[mask], dtype=float)
    t_unique, v_unique = average_duplicate_times(t_valid, v_valid)

    if len(t_unique) < 4:
        raise ValueError(f"Signal {signal_name!r} does not have enough unique time samples.")

    deltas = np.diff(t_unique)
    if np.any(deltas <= 0):
        raise ValueError(f"Signal {signal_name!r} must have strictly increasing time values.")

    dt_s = float(np.median(deltas))
    if dt_s <= 0.0:
        raise ValueError(f"Signal {signal_name!r} has a non-positive sampling interval.")

    t_uniform = t_unique[0] + dt_s * np.arange(int(np.rint((t_unique[-1] - t_unique[0]) / dt_s)) + 1)
    t_uniform = t_uniform[t_uniform <= t_unique[-1]]
    if len(t_uniform) < 4:
        raise ValueError(f"Signal {signal_name!r} does not span enough samples after resampling.")

    raw_interpolated = np.interp(t_uniform, t_unique, v_unique)

    if detrend and len(t_uniform) >= 2:
        coeffs = np.polyfit(t_uniform, raw_interpolated, deg=1)
        trend = np.polyval(coeffs, t_uniform)
        prepared = raw_interpolated - trend
    else:
        prepared = raw_interpolated - raw_interpolated.mean()

    return PreparedSignal(
        name=signal_name,
        t_s=t_uniform,
        raw_interpolated=raw_interpolated,
        prepared=prepared,
        dt_s=dt_s,
    )


def solve_prony_roots(signal: np.ndarray, order: int) -> np.ndarray:
    if order < 2:
        raise ValueError("Prony order must be at least 2.")
    if len(signal) <= 2 * order:
        raise ValueError(
            f"Need more than 2 * order samples for Prony analysis, got {len(signal)} samples "
            f"for order {order}."
        )

    rhs = -signal[order:]
    lhs = np.column_stack(
        [signal[order - lag - 1 : len(signal) - lag - 1] for lag in range(order)]
    )
    coeffs, *_ = np.linalg.lstsq(lhs, rhs, rcond=None)
    return np.roots(np.concatenate(([1.0], coeffs)))


def fit_mode_amplitudes(signal: np.ndarray, roots: np.ndarray) -> np.ndarray:
    vandermonde = np.vander(roots, N=len(signal), increasing=True).T
    amplitudes, *_ = np.linalg.lstsq(vandermonde, signal, rcond=None)
    return amplitudes


def select_dominant_modes(
    rows: list[dict[str, float | int | str]],
    *,
    top_k: int,
) -> list[dict[str, float | int | str]]:
    selected: list[dict[str, float | int | str]] = []
    for row in sorted(rows, key=lambda item: float(item["amplitude_px"]), reverse=True):
        frequency = float(row["frequency_hz"])
        too_close = any(
            abs(frequency - float(chosen["frequency_hz"])) <= max(0.05, 0.02 * frequency)
            for chosen in selected
        )
        if too_close:
            continue
        selected.append(row)
        if len(selected) >= top_k:
            break
    for idx, row in enumerate(selected, start=1):
        row["mode_rank"] = idx
    return selected


def analyze_signal(
    t_s: np.ndarray,
    values: np.ndarray,
    signal_name: str,
    *,
    order: int,
    top_k: int,
    min_frequency: float,
    max_frequency: float | None,
    detrend: bool,
) -> tuple[list[dict[str, float | int | str]], PreparedSignal]:
    prepared = prepare_signal(t_s, values, signal_name=signal_name, detrend=detrend)

    if np.allclose(prepared.prepared, 0.0):
        return [], prepared

    roots = solve_prony_roots(prepared.prepared, order=order)
    amplitudes = fit_mode_amplitudes(prepared.prepared, roots)

    nyquist_hz = 0.5 / prepared.dt_s
    frequency_limit = nyquist_hz if max_frequency is None else min(max_frequency, nyquist_hz)

    rows: list[dict[str, float | int | str]] = []
    for root, amplitude in zip(roots, amplitudes):
        if abs(root) == 0.0:
            continue
        exponent = np.log(root) / prepared.dt_s
        if not np.isfinite(exponent.real) or not np.isfinite(exponent.imag):
            continue
        if exponent.imag <= 1e-9:
            continue

        frequency_hz = float(exponent.imag / (2.0 * np.pi))
        if frequency_hz < min_frequency or frequency_hz > frequency_limit:
            continue

        rows.append(
            {
                "signal": signal_name,
                "mode_rank": 0,
                "frequency_hz": frequency_hz,
                "period_s": float(1.0 / frequency_hz),
                "damping_per_s": float(exponent.real),
                "amplitude_px": float(2.0 * abs(amplitude)),
                "phase_rad": float(np.angle(amplitude)),
                "root_magnitude": float(abs(root)),
                "sample_dt_s": float(prepared.dt_s),
                "n_prepared_samples": int(len(prepared.t_s)),
            }
        )

    return select_dominant_modes(rows, top_k=top_k), prepared


def save_prepared_signal(out_dir: Path, prepared: PreparedSignal) -> Path:
    output_path = out_dir / f"prepared_{prepared.name}.csv"
    pd.DataFrame(
        {
            "t_s": prepared.t_s,
            "interpolated_signal": prepared.raw_interpolated,
            "prepared_signal": prepared.prepared,
        }
    ).to_csv(output_path, index=False)
    return output_path


def summarize_modes(rows: list[dict[str, float | int | str]]) -> list[str]:
    lines: list[str] = []
    for row in rows:
        lines.append(
            "  "
            f"#{int(row['mode_rank'])}: "
            f"{float(row['frequency_hz']):.4f} Hz "
            f"(period {float(row['period_s']):.4f} s, "
            f"amplitude {float(row['amplitude_px']):.3f} px, "
            f"damping {float(row['damping_per_s']):.4f} 1/s)"
        )
    return lines


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        signal_names = parse_signal_names(args.signals)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    if args.top_k < 1:
        print("ERROR: --top-k must be at least 1.", file=sys.stderr)
        return 2
    if args.min_frequency < 0.0:
        print("ERROR: --min-frequency must be non-negative.", file=sys.stderr)
        return 2

    input_path = Path(args.input)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        frame = pd.read_csv(input_path)
    except FileNotFoundError:
        print(f"ERROR: Input file not found: {input_path}", file=sys.stderr)
        return 1

    missing_columns = [name for name in [args.time_column, *signal_names] if name not in frame.columns]
    if missing_columns:
        print(
            f"ERROR: Missing required columns in {input_path}: {', '.join(missing_columns)}",
            file=sys.stderr,
        )
        return 1

    all_rows: list[dict[str, float | int | str]] = []
    prepared_paths: list[Path] = []

    for signal_name in signal_names:
        try:
            rows, prepared = analyze_signal(
                frame[args.time_column].to_numpy(dtype=float),
                frame[signal_name].to_numpy(dtype=float),
                signal_name,
                order=args.order,
                top_k=args.top_k,
                min_frequency=args.min_frequency,
                max_frequency=args.max_frequency,
                detrend=not args.no_detrend,
            )
        except ValueError as exc:
            print(f"WARNING: Skipping {signal_name}: {exc}", file=sys.stderr)
            continue

        prepared_path = save_prepared_signal(out_dir, prepared)
        prepared_paths.append(prepared_path)

        if not rows:
            print(f"No oscillatory modes detected for {signal_name}.")
            continue

        all_rows.extend(rows)
        print(f"Signal {signal_name}:")
        for line in summarize_modes(rows):
            print(line)

    frequencies_path = out_dir / "frequencies.csv"
    pd.DataFrame(
        all_rows,
        columns=[
            "signal",
            "mode_rank",
            "frequency_hz",
            "period_s",
            "damping_per_s",
            "amplitude_px",
            "phase_rad",
            "root_magnitude",
            "sample_dt_s",
            "n_prepared_samples",
        ],
    ).to_csv(frequencies_path, index=False)

    print(f"Saved: {frequencies_path}")
    for prepared_path in prepared_paths:
        print(f"Saved: {prepared_path}")

    return 0 if all_rows else 1


if __name__ == "__main__":
    raise SystemExit(main())
