#!/usr/bin/env python3
"""Stage 1 camera CV spike with live webcam marker tracking."""

import argparse
import math
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Sequence

import cv2
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


@dataclass
class CaptureResult:
    """Samples collected by capture_run plus the first processed frame for debugging."""

    t_s: np.ndarray
    cx: np.ndarray
    cy: np.ndarray
    debug_preview: Optional[np.ndarray]
    debug_mask: Optional[np.ndarray]


class CaptureError(RuntimeError):
    """Raised by capture_run when the camera or the MP4 writer fails."""


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Track a colored marker from live camera input and save CSV + plot.",
    )
    parser.add_argument("--out", required=True, help="Output directory for run artifacts")
    parser.add_argument("--camera-index", type=int, default=0, help="Camera index (default: 0)")
    parser.add_argument("--device", default=None, help="Optional device path, e.g. /dev/video2")
    parser.add_argument("--width", type=int, default=None, help="Optional capture width in pixels")
    parser.add_argument("--height", type=int, default=None, help="Optional capture height in pixels")
    parser.add_argument("--duration", type=float, default=None, help="Optional capture duration in seconds")
    parser.add_argument("--hsv-lower", default="0,120,90", help="Primary HSV lower bound, e.g. 0,120,90")
    parser.add_argument("--hsv-upper", default="10,255,255", help="Primary HSV upper bound, e.g. 10,255,255")
    parser.add_argument(
        "--hsv-lower2",
        default="170,120,90",
        help="Optional secondary HSV lower bound, useful for red hue wrap-around",
    )
    parser.add_argument(
        "--hsv-upper2",
        default="179,255,255",
        help="Optional secondary HSV upper bound, useful for red hue wrap-around",
    )
    parser.add_argument("--min-area", type=int, default=220, help="Minimum contour area in pixels")
    parser.add_argument(
        "--max-gap",
        type=int,
        default=5,
        help="Max missing-frame gap to fill by linear interpolation",
    )
    parser.add_argument("--no-preview", action="store_true", help="Disable live preview windows")
    parser.add_argument("--no-mp4", action="store_true", help="Disable saving raw_preview.mp4")
    parser.add_argument("--show-plot", action="store_true", help="Show plot window after saving plot")
    return parser.parse_args(argv)


def parse_hsv_bound(text: str) -> np.ndarray:
    parts = text.split(",")
    if len(parts) != 3:
        raise ValueError(f"HSV bound must have 3 comma-separated integers, got: {text!r}")
    try:
        values = [int(x.strip()) for x in parts]
    except ValueError as exc:
        raise ValueError(f"HSV values must be integers, got: {text!r}") from exc
    if not (0 <= values[0] <= 179 and 0 <= values[1] <= 255 and 0 <= values[2] <= 255):
        raise ValueError(f"HSV values out of range, got: {values!r}")
    return np.array(values, dtype=np.uint8)


def open_camera(
    camera_index: int,
    device: Optional[str] = None,
    width: Optional[int] = None,
    height: Optional[int] = None,
) -> cv2.VideoCapture:
    source: int | str = device if device else camera_index
    cap = cv2.VideoCapture(source, cv2.CAP_V4L2)
    if cap.isOpened():
        if width is not None:
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, float(width))
        if height is not None:
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, float(height))
        return cap
    cap.release()

    cap = cv2.VideoCapture(source)
    if width is not None:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, float(width))
    if height is not None:
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, float(height))
    return cap


def process_frame(
    frame_bgr: np.ndarray,
    hsv_lower: np.ndarray,
    hsv_upper: np.ndarray,
    hsv_lower2: Optional[np.ndarray],
    hsv_upper2: Optional[np.ndarray],
    min_area: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, float, float]:
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, hsv_lower, hsv_upper)
    if hsv_lower2 is not None and hsv_upper2 is not None:
        mask2 = cv2.inRange(hsv, hsv_lower2, hsv_upper2)
        mask = cv2.bitwise_or(mask, mask2)
    kernel = np.ones((5, 5), dtype=np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    overlay = frame_bgr.copy()
    cx = math.nan
    cy = math.nan

    if contours:
        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        if area >= min_area:
            moments = cv2.moments(largest)
            if moments["m00"] > 0:
                cx = float(moments["m10"] / moments["m00"])
                cy = float(moments["m01"] / moments["m00"])
                cv2.drawContours(overlay, [largest], -1, (0, 255, 255), 2)
                cv2.circle(overlay, (int(round(cx)), int(round(cy))), 6, (0, 0, 255), -1)
                cv2.putText(
                    overlay,
                    f"({cx:.1f}, {cy:.1f})",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 255, 255),
                    2,
                    cv2.LINE_AA,
                )

    return overlay, mask, contours, cx, cy


def interpolate_small_gaps(values: np.ndarray, max_gap: int) -> np.ndarray:
    out = values.astype(float).copy()
    n = len(out)
    i = 0
    while i < n:
        if not np.isnan(out[i]):
            i += 1
            continue
        gap_start = i
        while i < n and np.isnan(out[i]):
            i += 1
        gap_end = i - 1
        gap_len = gap_end - gap_start + 1
        left = gap_start - 1
        right = gap_end + 1
        if (
            gap_len <= max_gap
            and left >= 0
            and right < n
            and not np.isnan(out[left])
            and not np.isnan(out[right])
        ):
            out[gap_start : gap_end + 1] = np.linspace(
                out[left],
                out[right],
                gap_len + 2,
                dtype=float,
            )[1:-1]
    return out


def interpolate_gaps(cx: np.ndarray, cy: np.ndarray, max_gap: int) -> tuple[np.ndarray, np.ndarray]:
    return interpolate_small_gaps(cx, max_gap), interpolate_small_gaps(cy, max_gap)


def compute_displacement(cx: np.ndarray, cy: np.ndarray) -> np.ndarray:
    displacement = np.full_like(cx, np.nan, dtype=float)
    valid = np.where(~np.isnan(cx) & ~np.isnan(cy))[0]
    if valid.size == 0:
        return displacement
    first = valid[0]
    cx0 = cx[first]
    cy0 = cy[first]
    displacement = np.sqrt((cx - cx0) ** 2 + (cy - cy0) ** 2)
    displacement[np.isnan(cx) | np.isnan(cy)] = np.nan
    return displacement


def save_outputs(
    out_dir: Path,
    t_s: np.ndarray,
    cx: np.ndarray,
    cy: np.ndarray,
    displacement: np.ndarray,
    debug_preview: np.ndarray,
    debug_mask: np.ndarray,
    show_plot: bool,
) -> None:
    df = pd.DataFrame(
        {
            "t_s": t_s,
            "cx_px": cx,
            "cy_px": cy,
            "displacement_px": displacement,
        }
    )
    df.to_csv(out_dir / "data.csv", index=False)

    plt.figure(figsize=(10, 4))
    plt.plot(t_s, displacement, linewidth=1.5)
    plt.xlabel("t_s")
    plt.ylabel("displacement_px")
    plt.title("Displacement vs Time")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plot_path = out_dir / "plot.png"
    plt.savefig(plot_path, dpi=150)
    if show_plot:
        plt.show()
    plt.close()

    mask_vis = cv2.cvtColor(debug_mask, cv2.COLOR_GRAY2BGR)
    combined = np.hstack([debug_preview, mask_vis])
    cv2.imwrite(str(out_dir / "debug_first_frame.png"), combined)


def capture_run(
    cap,
    args: argparse.Namespace,
    out_dir: Path,
    *,
    hsv_lower: np.ndarray,
    hsv_upper: np.ndarray,
    hsv_lower2: Optional[np.ndarray],
    hsv_upper2: Optional[np.ndarray],
) -> CaptureResult:
    """Read frames from ``cap`` until the stop condition and return the tracked samples.

    Capture stops on ``--duration``, on ``q`` in the preview window, or on Ctrl-C
    (KeyboardInterrupt), in which case the samples collected so far are returned so
    the caller can still save them. ``cap`` only needs ``read``, ``get`` and
    ``release``, so a fake capture object can be injected in tests.
    Raises CaptureError when a frame cannot be read or the MP4 writer cannot be opened.
    """
    t_vals: list[float] = []
    cx_vals: list[float] = []
    cy_vals: list[float] = []
    first_debug_preview: Optional[np.ndarray] = None
    first_debug_mask: Optional[np.ndarray] = None
    video_writer: Optional[cv2.VideoWriter] = None

    start_t = time.monotonic()
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                raise CaptureError("Failed to read frame from camera.")

            if video_writer is None and not args.no_mp4:
                frame_h, frame_w = frame.shape[:2]
                fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                fps = cap.get(cv2.CAP_PROP_FPS)
                if not fps or fps <= 0:
                    fps = 30.0
                video_path = out_dir / "raw_preview.mp4"
                video_writer = cv2.VideoWriter(str(video_path), fourcc, float(fps), (frame_w, frame_h))
                if not video_writer.isOpened():
                    raise CaptureError(f"Failed to initialize MP4 writer at {video_path}.")

            t_s = time.monotonic() - start_t
            overlay, mask, _contours, cx, cy = process_frame(
                frame,
                hsv_lower,
                hsv_upper,
                hsv_lower2,
                hsv_upper2,
                args.min_area,
            )

            if first_debug_preview is None:
                first_debug_preview = overlay.copy()
                first_debug_mask = mask.copy()

            if video_writer is not None:
                video_writer.write(overlay)

            t_vals.append(t_s)
            cx_vals.append(cx)
            cy_vals.append(cy)

            if not args.no_preview:
                cv2.imshow("preview", overlay)
                cv2.imshow("mask", mask)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            if args.duration is not None and t_s >= args.duration:
                break
    except KeyboardInterrupt:
        print("Interrupted: saving captured data", file=sys.stderr)
    finally:
        if video_writer is not None:
            video_writer.release()
        cap.release()
        if not args.no_preview:
            cv2.destroyAllWindows()

    return CaptureResult(
        t_s=np.array(t_vals, dtype=float),
        cx=np.array(cx_vals, dtype=float),
        cy=np.array(cy_vals, dtype=float),
        debug_preview=first_debug_preview,
        debug_mask=first_debug_mask,
    )


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        hsv_lower = parse_hsv_bound(args.hsv_lower)
        hsv_upper = parse_hsv_bound(args.hsv_upper)
        hsv_lower2 = parse_hsv_bound(args.hsv_lower2) if args.hsv_lower2 else None
        hsv_upper2 = parse_hsv_bound(args.hsv_upper2) if args.hsv_upper2 else None
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    cap = open_camera(args.camera_index, args.device, args.width, args.height)
    if not cap.isOpened():
        source = args.device if args.device else f"index={args.camera_index}"
        print(
            f"ERROR: Could not open camera source ({source}). "
            "On Linux, verify /dev/video* and user membership in the video group.",
            file=sys.stderr,
        )
        return 1

    try:
        result = capture_run(
            cap,
            args,
            out_dir,
            hsv_lower=hsv_lower,
            hsv_upper=hsv_upper,
            hsv_lower2=hsv_lower2,
            hsv_upper2=hsv_upper2,
        )
    except CaptureError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    if len(result.t_s) == 0:
        print("ERROR: No frames captured.", file=sys.stderr)
        return 1

    if result.debug_preview is None or result.debug_mask is None:
        print("ERROR: Unable to capture debug frame.", file=sys.stderr)
        return 1

    cx_filled, cy_filled = interpolate_gaps(result.cx, result.cy, args.max_gap)
    displacement = compute_displacement(cx_filled, cy_filled)

    save_outputs(
        out_dir=out_dir,
        t_s=result.t_s,
        cx=cx_filled,
        cy=cy_filled,
        displacement=displacement,
        debug_preview=result.debug_preview,
        debug_mask=result.debug_mask,
        show_plot=args.show_plot,
    )

    print(f"Saved: {out_dir / 'data.csv'}")
    print(f"Saved: {out_dir / 'plot.png'}")
    print(f"Saved: {out_dir / 'debug_first_frame.png'}")
    if not args.no_mp4:
        print(f"Saved: {out_dir / 'raw_preview.mp4'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
