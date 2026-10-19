"""Headless browser checks for the live lab page.

These run in Chromium with a fake camera, so no hardware is needed. They are
skipped when Playwright is not installed (it lives outside ~/envs/env312 on the
development machine; run them with the interpreter that has Playwright, e.g.
``python3 -m pytest tests/test_ui_live_lab.py``).
"""

import http.server
import json
import os
import socket
import threading
import time
from pathlib import Path

import pytest

playwright = pytest.importorskip("playwright")
from playwright.sync_api import sync_playwright  # noqa: E402

SITE_DIR = Path(os.environ.get("PHYS_LAB_SITE_DIR", Path(__file__).resolve().parent.parent))
STORAGE_KEY = "physlab-oscillation-lab-v2"
DELETE_BUTTONS = "#saved-runs-body button[data-delete-run-id]"


def seeded_state(n_runs: int) -> dict:
    runs = [
        {
            "id": f"run-seed-{i}",
            "savedAt": "2026-10-01T10:00:00.000Z",
            "mode": "mass-independence",
            "modeLabel": "Mass Independence",
            "mass": str(50 + 50 * i),
            "length": "0.750",
            "springConstant": "",
            "notes": "",
            "durationS": 8.0,
            "validSampleCount": 240,
            "totalSampleCount": 250,
            "detectionRate": 0.96,
            "qualityLabel": "Usable",
            "provisionalFrequencyHz": 0.58,
            "finalFrequencyHz": 0.58 + 0.001 * i,
            "primaryMode": None,
            "candidateModes": [],
            "sampleDtS": 1 / 30,
            "preparedSampleCount": 240,
        }
        for i in range(n_runs)
    ]
    empty_draft = {"mass": "", "length": "", "springConstant": "", "notes": ""}
    return {
        "activeMode": "mass-independence",
        "modes": {
            "mass-independence": {"draft": dict(empty_draft), "runs": runs, "lastSavedAt": None},
            "length-law": {"draft": dict(empty_draft), "runs": [], "lastSavedAt": None},
            "spring-pendulum": {"draft": dict(empty_draft), "runs": [], "lastSavedAt": None},
        },
    }


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE_DIR), **kwargs)

    def log_message(self, *_args):  # keep pytest output clean
        pass


@pytest.fixture(scope="module")
def site_url():
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), _QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        server.shutdown()


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        instance = p.chromium.launch(
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        )
        try:
            yield instance
        finally:
            instance.close()


@pytest.fixture
def page(browser, site_url):
    context = browser.new_context(viewport={"width": 1400, "height": 1000})
    context.grant_permissions(["camera"], origin=site_url)
    page = context.new_page()
    page.goto(f"{site_url}/index.html")
    page.wait_for_load_state("load")
    try:
        yield page
    finally:
        context.close()


def seed_and_reload(page, n_runs: int) -> None:
    page.evaluate("([k, v]) => localStorage.setItem(k, v)", [STORAGE_KEY, json.dumps(seeded_state(n_runs))])
    page.reload()
    page.wait_for_selector(DELETE_BUTTONS)


def enable_camera(page) -> None:
    page.locator("#camera-toggle-button").click()
    page.wait_for_function(
        "() => document.getElementById('run-state-value').textContent.trim() === 'Preview ready'",
        timeout=15000,
    )


def human_click_first_delete(page, hold_s: float = 0.08) -> None:
    """Press and release like a person would; the button node may be replaced between the two."""
    page.evaluate(
        "() => document.getElementById('saved-runs-body').closest('.table-wrap')"
        ".scrollIntoView({block: 'center', behavior: 'instant'})"
    )
    time.sleep(0.2)
    box = page.evaluate(
        "(sel) => { const r = document.querySelector(sel).getBoundingClientRect();"
        " return {x: r.x + r.width / 2, y: r.y + r.height / 2}; }",
        DELETE_BUTTONS,
    )
    page.mouse.move(box["x"], box["y"])
    page.mouse.down()
    time.sleep(hold_s)
    page.mouse.up()
    time.sleep(0.3)


def delete_count(page) -> int:
    return page.locator(DELETE_BUTTONS).count()


def test_delete_saved_run_works_while_camera_preview_is_on(page):
    seed_and_reload(page, 3)
    enable_camera(page)
    assert delete_count(page) == 3
    human_click_first_delete(page)
    assert delete_count(page) == 2, "Delete click was dropped while the camera preview was running"


def test_saved_runs_table_is_not_rebuilt_every_frame_while_previewing(page):
    seed_and_reload(page, 3)
    enable_camera(page)
    insertions = page.evaluate(
        """() => new Promise((resolve) => {
            const body = document.getElementById('saved-runs-body');
            let count = 0;
            const observer = new MutationObserver((records) => {
                for (const record of records) { count += record.addedNodes.length; }
            });
            observer.observe(body, { childList: true });
            setTimeout(() => { observer.disconnect(); resolve(count); }, 1000);
        })"""
    )
    assert insertions == 0, f"saved-runs table was rebuilt {insertions} times in one second"


def test_camera_preview_runs_without_console_errors(page):
    errors = []
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    seed_and_reload(page, 1)
    enable_camera(page)
    time.sleep(1.0)
    assert page.locator("#live-frequency-value").text_content().strip() == "Ready for run"
    assert errors == []
