import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
import pandas as pd

import track_marker_cam as tmc

FRAME_W = 64
FRAME_H = 48
N_FRAMES = 5


def make_frame(offset_px: int) -> np.ndarray:
    """Black BGR frame with a 20x20 pure-red square whose left edge sits at 10 + offset_px."""
    frame = np.zeros((FRAME_H, FRAME_W, 3), dtype=np.uint8)
    frame[10:30, 10 + offset_px : 30 + offset_px] = (0, 0, 255)
    return frame


class FakeCapture:
    """Stands in for cv2.VideoCapture: yields canned frames, then raises KeyboardInterrupt."""

    def __init__(self, frames: list[np.ndarray]) -> None:
        self._frames = list(frames)
        self.released = False

    def isOpened(self) -> bool:
        return True

    def read(self) -> tuple[bool, np.ndarray]:
        if not self._frames:
            raise KeyboardInterrupt
        return True, self._frames.pop(0)

    def get(self, _prop: int) -> float:
        return 0.0

    def release(self) -> None:
        self.released = True


def interrupted_capture() -> FakeCapture:
    return FakeCapture([make_frame(2 * i) for i in range(N_FRAMES)])


class InterpolateSmallGapsTests(unittest.TestCase):
    def test_fills_gap_up_to_max_gap_linearly(self) -> None:
        values = np.array([1.0, np.nan, np.nan, 4.0])
        np.testing.assert_allclose(tmc.interpolate_small_gaps(values, max_gap=2), [1.0, 2.0, 3.0, 4.0])

    def test_leaves_gap_longer_than_max_gap(self) -> None:
        values = np.array([1.0, np.nan, np.nan, np.nan, 5.0])
        out = tmc.interpolate_small_gaps(values, max_gap=2)
        self.assertEqual(out[0], 1.0)
        self.assertEqual(out[-1], 5.0)
        self.assertTrue(np.all(np.isnan(out[1:4])), out)

    def test_leaves_leading_and_trailing_gaps(self) -> None:
        values = np.array([np.nan, np.nan, 1.0, np.nan, 3.0, np.nan])
        out = tmc.interpolate_small_gaps(values, max_gap=5)
        self.assertTrue(np.all(np.isnan(out[:2])), out)
        self.assertTrue(np.isnan(out[-1]), out)
        np.testing.assert_allclose(out[2:5], [1.0, 2.0, 3.0])

    def test_does_not_modify_input(self) -> None:
        values = np.array([1.0, np.nan, 3.0])
        tmc.interpolate_small_gaps(values, max_gap=1)
        self.assertTrue(np.isnan(values[1]))


class ComputeDisplacementTests(unittest.TestCase):
    def test_is_measured_from_first_valid_sample(self) -> None:
        cx = np.array([np.nan, 3.0, 6.0, 0.0])
        cy = np.array([np.nan, 4.0, 8.0, 0.0])
        out = tmc.compute_displacement(cx, cy)
        self.assertTrue(np.isnan(out[0]))
        np.testing.assert_allclose(out[1:], [0.0, 5.0, 5.0])

    def test_is_nan_where_either_coordinate_is_nan(self) -> None:
        cx = np.array([0.0, np.nan, 3.0, 3.0])
        cy = np.array([0.0, 4.0, np.nan, 4.0])
        out = tmc.compute_displacement(cx, cy)
        self.assertEqual(out[0], 0.0)
        self.assertTrue(np.isnan(out[1]))
        self.assertTrue(np.isnan(out[2]))
        self.assertAlmostEqual(out[3], 5.0)

    def test_all_nan_input_gives_all_nan(self) -> None:
        out = tmc.compute_displacement(np.array([np.nan, np.nan]), np.array([np.nan, np.nan]))
        self.assertTrue(np.all(np.isnan(out)))


class KeyboardInterruptTests(unittest.TestCase):
    def test_capture_run_keeps_frames_captured_before_interrupt(self) -> None:
        cap = interrupted_capture()
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir)
            args = tmc.parse_args(["--out", str(out_dir), "--no-preview", "--no-mp4"])
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                result = tmc.capture_run(
                    cap,
                    args,
                    out_dir,
                    hsv_lower=tmc.parse_hsv_bound(args.hsv_lower),
                    hsv_upper=tmc.parse_hsv_bound(args.hsv_upper),
                    hsv_lower2=tmc.parse_hsv_bound(args.hsv_lower2),
                    hsv_upper2=tmc.parse_hsv_bound(args.hsv_upper2),
                )

        self.assertIn("Interrupted: saving captured data", stderr.getvalue())
        self.assertTrue(cap.released)
        self.assertEqual(len(result.t_s), N_FRAMES)
        self.assertEqual(len(result.cx), N_FRAMES)
        self.assertEqual(len(result.cy), N_FRAMES)
        self.assertFalse(np.any(np.isnan(result.cx)), result.cx)
        self.assertTrue(np.all(np.diff(result.cx) > 0.0), result.cx)
        self.assertIsNotNone(result.debug_preview)
        self.assertIsNotNone(result.debug_mask)
        self.assertEqual(result.debug_preview.shape, (FRAME_H, FRAME_W, 3))
        self.assertEqual(result.debug_mask.shape, (FRAME_H, FRAME_W))

    def test_main_saves_outputs_after_keyboard_interrupt(self) -> None:
        cap = interrupted_capture()
        with tempfile.TemporaryDirectory() as tmpdir:
            out_dir = Path(tmpdir) / "run"
            stdout = io.StringIO()
            stderr = io.StringIO()
            with mock.patch.object(tmc, "open_camera", return_value=cap):
                with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                    rc = tmc.main(["--out", str(out_dir), "--no-preview", "--no-mp4"])

            self.assertEqual(rc, 0, stderr.getvalue())
            self.assertIn("Interrupted: saving captured data", stderr.getvalue())
            self.assertTrue((out_dir / "data.csv").is_file())
            self.assertTrue((out_dir / "plot.png").is_file())
            self.assertTrue((out_dir / "debug_first_frame.png").is_file())
            self.assertFalse((out_dir / "raw_preview.mp4").exists())

            data = pd.read_csv(out_dir / "data.csv")
            self.assertEqual(list(data.columns), ["t_s", "cx_px", "cy_px", "displacement_px"])
            self.assertEqual(len(data), N_FRAMES)
            self.assertFalse(data["cx_px"].isna().any())
            self.assertEqual(float(data.loc[0, "displacement_px"]), 0.0)
            self.assertTrue((data["displacement_px"].diff().dropna() > 0.0).all())

            printed = stdout.getvalue()
            self.assertIn(f"Saved: {out_dir / 'data.csv'}", printed)
            self.assertIn(f"Saved: {out_dir / 'plot.png'}", printed)
            self.assertIn(f"Saved: {out_dir / 'debug_first_frame.png'}", printed)
            self.assertNotIn("raw_preview.mp4", printed)


if __name__ == "__main__":
    unittest.main()
