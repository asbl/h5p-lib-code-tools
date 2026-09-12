#!/usr/bin/env python3
"""Live browser test for the Mermaid renderer pipeline.

Loads tests/live/mermaid-live.html in a headless Chromium, waits until the
in-page harness has run all three render cases against the real Mermaid
library (loaded from esm.sh) and asserts the outcomes.

Because the in-page harness uses ES modules, the HTML cannot be opened from a
`file://` URL — Chrome blocks cross-origin module requests for that scheme.
This script therefore serves the `tests/live/` directory over HTTP on an
ephemeral port before navigating to the page.
"""

from __future__ import annotations

import http.server
import json
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[3]
TEST_RESULTS_DIR = REPO_ROOT / "test-results"


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):  # noqa: D401, ARG002 - silence default logging
        return


def serve(directory: Path):
    handler = lambda *args, **kwargs: _QuietHandler(*args, directory=str(directory), **kwargs)
    server = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


def main() -> int:
    server, port = serve(SCRIPT_DIR)
    url = f"http://127.0.0.1:{port}/mermaid-live.html"

    console_lines: list[str] = []
    results: dict = {}
    screenshot_path = str(TEST_RESULTS_DIR / "mermaid-live.png")

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                context = browser.new_context()
                page = context.new_page()

                page.on("pageerror", lambda exc: console_lines.append(f"pageerror: {exc}"))
                page.on("console", lambda msg: console_lines.append(f"{msg.type}: {msg.text}"))

                page.goto(url, wait_until="domcontentloaded")

                try:
                    page.wait_for_function(
                        "window.__mermaidResults && window.__mermaidResults.done",
                        timeout=60000,
                    )
                    results = page.evaluate("window.__mermaidResults") or {}
                    TEST_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
                    page.screenshot(path=screenshot_path, full_page=True)
                except Exception as wait_error:  # noqa: BLE001 - capture for diagnostics
                    console_lines.append(f"wait_for_function: {wait_error}")
                    snapshot = page.evaluate(
                        "() => ({"
                        "results: window.__mermaidResults || null, "
                        "bodyLen: document.body && document.body.innerHTML.length"
                        "})"
                    )
                    console_lines.append(f"snapshot: {json.dumps(snapshot)}")
                    results = {"fatalError": str(wait_error), "cases": []}
            finally:
                browser.close()
    finally:
        server.shutdown()

    print("=== Mermaid live results ===")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    print("--- console lines ---")
    for line in console_lines:
        print(line)

    failures: list[str] = []
    if results.get("fatalError"):
        failures.append(f"fatal harness error: {results['fatalError']}")

    cases = {case["name"]: case for case in results.get("cases", [])}

    flowchart = cases.get("flowchart")
    if not flowchart:
        failures.append("missing flowchart case")
    elif not flowchart["hasSvg"] or flowchart["hasError"]:
        failures.append(f"flowchart did not render an SVG: {flowchart}")

    sequence = cases.get("sequence")
    if not sequence:
        failures.append("missing sequence case")
    elif not sequence["hasSvg"] or sequence["hasError"]:
        failures.append(f"sequence diagram did not render an SVG: {sequence}")

    invalid = cases.get("invalid")
    if not invalid:
        failures.append("missing invalid case")
    elif not invalid["hasError"] or invalid["hasSvg"]:
        failures.append(f"invalid source should have triggered the error fallback: {invalid}")

    if failures:
        print("\nFAILED:")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("\nAll Mermaid live cases passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
