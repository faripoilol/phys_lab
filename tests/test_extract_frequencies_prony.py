import contextlib
import io
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

import extract_frequencies_prony as prony

FIXTURES = Path(__file__).parent / "fixtures"
FIXTURE_ARGS = ["--signals", "cx_px,cy_px", "--order", "6", "--top-k", "3", "--min-frequency", "0.2"]


def run_fixture(name: str, out_dir: Path) -> tuple[int, pd.DataFrame, str]:
    """Run main() on a fixture CSV; return (exit code, frequencies.csv, stdout)."""
    stdout = io.StringIO()
    with contextlib.redirect_stdout(stdout):
        rc = prony.main(["--input", str(FIXTURES / name), "--out", str(out_dir), *FIXTURE_ARGS])
    return rc, pd.read_csv(out_dir / "frequencies.csv"), stdout.getvalue()


def top_mode(frequencies: pd.DataFrame, signal: str) -> pd.Series:
    rows = frequencies[(frequencies["signal"] == signal) & (frequencies["mode_rank"] == 1)]
    if len(rows) != 1:
        raise AssertionError(f"Expected exactly one #1 mode for {signal}, got {len(rows)}")
    return rows.iloc[0]


class ExtractFrequenciesPronyTests(unittest.TestCase):
    def assert_candidate_layout(self, frequencies: pd.DataFrame, top_k: int) -> None:
        """Accepted rows first (rank 1..k in energy order), rejected rows after with rank 0."""
        self.assertIn("status", frequencies.columns)
        self.assertIn("energy", frequencies.columns)
        for signal, group in frequencies.groupby("signal", sort=False):
            statuses = group["status"].tolist()
            accepted = [s == "accepted" for s in statuses]
            n_accepted = sum(accepted)
            self.assertLessEqual(n_accepted, top_k)
            self.assertEqual(accepted, [True] * n_accepted + [False] * (len(statuses) - n_accepted), signal)
            ranks = group["mode_rank"].tolist()
            self.assertEqual(ranks, list(range(1, n_accepted + 1)) + [0] * (len(statuses) - n_accepted), signal)
            energies = group["energy"].to_numpy()[:n_accepted]
            self.assertTrue(np.all(np.diff(energies) <= 0.0), f"{signal}: accepted energies not descending")
            for status in statuses[n_accepted:]:
                self.assertTrue(status.startswith("rejected: "), status)

    def test_run23_fixture_ranks_pendulum_modes_first(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            rc, frequencies, _ = run_fixture("run23_preview.csv", Path(tmpdir))

        self.assertEqual(rc, 0)
        self.assert_candidate_layout(frequencies, top_k=3)
        self.assertAlmostEqual(float(top_mode(frequencies, "cx_px")["frequency_hz"]), 0.753, delta=0.05)
        self.assertAlmostEqual(float(top_mode(frequencies, "cy_px")["frequency_hz"]), 1.525, delta=0.05)

    def test_run21_fixture_ranks_pendulum_mode_first(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            rc, frequencies, _ = run_fixture("run21_preview.csv", Path(tmpdir))

        self.assertEqual(rc, 0)
        self.assert_candidate_layout(frequencies, top_k=3)
        self.assertAlmostEqual(float(top_mode(frequencies, "cx_px")["frequency_hz"]), 0.727, delta=0.05)

    def test_run22_fixture_does_not_accept_overdamped_transient(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            _rc, frequencies, _ = run_fixture("run22_preview.csv", Path(tmpdir))

        cx = frequencies[frequencies["signal"] == "cx_px"]
        self.assertGreater(len(cx), 0)
        self.assert_candidate_layout(frequencies, top_k=3)

        accepted = cx[cx["status"] == "accepted"]
        self.assertTrue(np.all(accepted["damping_per_s"].to_numpy() >= -5.0), accepted)

        transient = cx[np.abs(cx["frequency_hz"] - 15.4) < 0.1]
        self.assertGreaterEqual(len(transient), 1, "15.4 Hz transient should still be listed as a candidate")
        self.assertEqual(set(transient["status"]), {"rejected: overdamped"}, transient)
        self.assertEqual(set(transient["mode_rank"]), {0}, transient)

    def test_main_returns_1_when_every_candidate_is_rejected(self) -> None:
        t_s = np.arange(0.0, 12.0, 0.025)
        signal = np.exp(-0.05 * t_s) * np.cos(2.0 * np.pi * 0.6 * t_s)
        frame = pd.DataFrame({"t_s": t_s, "cx_px": signal})

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            input_path = tmp_path / "data.csv"
            out_dir = tmp_path / "prony_out"
            frame.to_csv(input_path, index=False)
            base = ["--input", str(input_path), "--out", str(out_dir), "--signals", "cx_px", "--order", "2"]

            with contextlib.redirect_stdout(io.StringIO()):
                rc_default = prony.main(base)
                rc_strict = prony.main([*base, "--max-decay-rate", "0.01"])
            frequencies = pd.read_csv(out_dir / "frequencies.csv")

        self.assertEqual(rc_default, 0)
        self.assertEqual(rc_strict, 1)
        self.assertEqual(len(frequencies), 1)
        self.assertEqual(str(frequencies.loc[0, "status"]), "rejected: overdamped")
        self.assertEqual(int(frequencies.loc[0, "mode_rank"]), 0)

    def test_synthetic_transient_is_rejected_as_overdamped(self) -> None:
        fs_hz = 40.0
        t_s = np.arange(0.0, 12.0, 1.0 / fs_hz)
        signal = 1.0 * np.exp(-0.05 * t_s) * np.cos(2.0 * np.pi * 0.6 * t_s + 0.3) + 3.0 * np.exp(
            -10.0 * t_s
        ) * np.cos(2.0 * np.pi * 4.0 * t_s - 0.7)
        frame = pd.DataFrame({"t_s": t_s, "cx_px": signal})

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            input_path = tmp_path / "data.csv"
            out_dir = tmp_path / "prony_out"
            frame.to_csv(input_path, index=False)

            stdout = io.StringIO()
            with contextlib.redirect_stdout(stdout):
                rc = prony.main(
                    [
                        "--input",
                        str(input_path),
                        "--out",
                        str(out_dir),
                        "--signals",
                        "cx_px",
                        "--order",
                        "6",
                        "--top-k",
                        "3",
                        "--min-frequency",
                        "0.2",
                    ]
                )
            frequencies = pd.read_csv(out_dir / "frequencies.csv")

        self.assertEqual(rc, 0)
        self.assert_candidate_layout(frequencies, top_k=3)
        self.assertAlmostEqual(float(top_mode(frequencies, "cx_px")["frequency_hz"]), 0.6, delta=0.02)

        transient = frequencies[np.abs(frequencies["frequency_hz"] - 4.0) < 0.2]
        self.assertEqual(len(transient), 1, frequencies)
        self.assertEqual(str(transient.iloc[0]["status"]), "rejected: overdamped")
        self.assertAlmostEqual(float(transient.iloc[0]["damping_per_s"]), -10.0, delta=1.0)

        printed = stdout.getvalue()
        summary_lines = [line for line in printed.splitlines() if line.startswith("  #")]
        self.assertTrue(summary_lines, printed)
        self.assertTrue(summary_lines[0].startswith("  #1: 0.6"), summary_lines[0])
        for line in summary_lines:
            printed_hz = float(line.split(":", 1)[1].split("Hz", 1)[0])
            self.assertGreater(abs(printed_hz - 4.0), 0.2, f"rejected transient was printed: {line}")
        n_rejected = int((frequencies["status"] != "accepted").sum())
        self.assertGreaterEqual(n_rejected, 1)
        noun = "candidate" if n_rejected == 1 else "candidates"
        self.assertIn(f"  ({n_rejected} {noun} rejected)", printed)

    def test_main_rejects_negative_stability_limits(self) -> None:
        frame = pd.DataFrame({"t_s": np.arange(0.0, 2.0, 0.05), "cx_px": np.zeros(40)})
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            input_path = tmp_path / "data.csv"
            frame.to_csv(input_path, index=False)
            base = ["--input", str(input_path), "--out", str(tmp_path / "out"), "--signals", "cx_px"]
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(prony.main([*base, "--max-decay-rate", "-1.0"]), 2)
                self.assertEqual(prony.main([*base, "--max-growth-rate", "-0.1"]), 2)

    def test_analyze_signal_recovers_two_known_frequencies(self) -> None:
        t_s = np.arange(0.0, 12.0, 0.01)
        signal = (
            2.0 * np.exp(-0.03 * t_s) * np.cos(2.0 * np.pi * 1.5 * t_s + 0.2)
            + 0.8 * np.exp(-0.06 * t_s) * np.cos(2.0 * np.pi * 3.25 * t_s - 0.4)
        )

        modes, prepared = prony.analyze_signal(
            t_s,
            signal,
            "cx_px",
            order=4,
            top_k=2,
            min_frequency=0.5,
            max_frequency=5.0,
            detrend=True,
        )

        self.assertGreater(len(prepared.t_s), 1000)
        frequencies = sorted(float(mode["frequency_hz"]) for mode in modes)
        self.assertEqual(len(frequencies), 2)
        self.assertAlmostEqual(frequencies[0], 1.5, delta=0.03)
        self.assertAlmostEqual(frequencies[1], 3.25, delta=0.03)

    def test_main_writes_frequency_summary_for_csv_input(self) -> None:
        dt_s = 0.02
        t_uniform = dt_s * np.arange(800)
        t_irregular = t_uniform + 0.001 * np.sin(np.linspace(0.0, 4.0 * np.pi, len(t_uniform)))
        cx_signal = 1.7 * np.exp(-0.04 * t_uniform) * np.cos(2.0 * np.pi * 2.2 * t_uniform + 0.1)
        cy_signal = 0.5 * np.exp(-0.02 * t_uniform) * np.cos(2.0 * np.pi * 0.8 * t_uniform - 0.3)
        cx_signal[::60] = np.nan

        frame = pd.DataFrame(
            {
                "t_s": t_irregular,
                "cx_px": cx_signal,
                "cy_px": cy_signal,
                "displacement_px": np.sqrt(np.nan_to_num(cx_signal) ** 2 + cy_signal**2),
            }
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            input_path = tmp_path / "data.csv"
            out_dir = tmp_path / "prony_out"
            frame.to_csv(input_path, index=False)

            rc = prony.main(
                [
                    "--input",
                    str(input_path),
                    "--out",
                    str(out_dir),
                    "--signals",
                    "cx_px",
                    "--order",
                    "2",
                    "--top-k",
                    "1",
                    "--min-frequency",
                    "0.5",
                    "--max-frequency",
                    "4.0",
                ]
            )

            self.assertEqual(rc, 0)
            frequencies = pd.read_csv(out_dir / "frequencies.csv")
            prepared = pd.read_csv(out_dir / "prepared_cx_px.csv")

            self.assertEqual(len(frequencies), 1)
            self.assertAlmostEqual(float(frequencies.loc[0, "frequency_hz"]), 2.2, delta=0.05)
            self.assertIn("prepared_signal", prepared.columns)


if __name__ == "__main__":
    unittest.main()
