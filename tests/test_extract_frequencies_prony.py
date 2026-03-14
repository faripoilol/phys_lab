import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

import extract_frequencies_prony as prony


class ExtractFrequenciesPronyTests(unittest.TestCase):
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
