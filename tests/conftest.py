from __future__ import annotations

import contextlib
import os
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait


REPO_ROOT = Path(__file__).resolve().parents[1]
REMOTE_BASE_URL = os.environ.get(
    "REMOTE_BASE_URL",
    "https://chess-pairing.online/dev-auto-folder/",
).rstrip("/")


def pytest_addoption(parser):
    parser.addoption(
        "--run-remote",
        action="store_true",
        default=False,
        help="Run Selenium smoke tests against the deployed dev page.",
    )


def pytest_configure(config):
    config.addinivalue_line("markers", "local: test against a local server")
    config.addinivalue_line("markers", "remote: test against the deployed dev page")


def pytest_collection_modifyitems(config, items):
    if config.getoption("--run-remote"):
        return

    skip_remote = pytest.mark.skip(
        reason="remote smoke tests are disabled by default; use --run-remote"
    )
    for item in items:
        if "remote" in item.keywords:
            item.add_marker(skip_remote)


def _find_free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _wait_for_server(url: str, timeout: float = 10.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1):
                return
        except Exception:
            time.sleep(0.1)
    raise RuntimeError(f"Local server did not start in time: {url}")


@pytest.fixture(scope="session")
def local_base_url():
    port = _find_free_port()
    process = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "-b", "127.0.0.1"],
        cwd=REPO_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    url = f"http://127.0.0.1:{port}"

    try:
        _wait_for_server(url)
        yield url
    finally:
        process.terminate()
        with contextlib.suppress(subprocess.TimeoutExpired):
            process.wait(timeout=5)
        if process.poll() is None:
            process.kill()


@pytest.fixture
def remote_base_url():
    return REMOTE_BASE_URL


@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.binary_location = "/usr/bin/chromium"

    service = Service("/usr/bin/chromedriver")
    browser = webdriver.Chrome(service=service, options=options)
    browser.set_window_size(1440, 1200)
    yield browser
    browser.quit()


@pytest.fixture
def wait(driver):
    return WebDriverWait(driver, 10)
