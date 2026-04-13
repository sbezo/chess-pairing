import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC


def open_clean_app(driver, wait, base_url):
    # Even for the deployed dev page we want deterministic state.
    # Clearing localStorage avoids reusing leftover browser data from an earlier
    # test in the same Selenium session.
    driver.get(base_url)
    wait.until(EC.presence_of_element_located((By.ID, "AddPlayer")))
    driver.execute_script("window.localStorage.clear();")
    driver.refresh()
    wait.until(EC.presence_of_element_located((By.ID, "AddPlayer")))


def add_player(driver, wait, name, elo):
    # Minimal helper for remote smoke tests.
    # Keep it simple: we only want to prove that the deployed page still accepts
    # basic user input and reacts as expected.
    name_input = wait.until(EC.element_to_be_clickable((By.ID, "name")))
    elo_input = driver.find_element(By.ID, "Elo")
    add_button = driver.find_element(By.ID, "AddPlayer")

    name_input.clear()
    name_input.send_keys(name)
    elo_input.clear()
    elo_input.send_keys(str(elo))
    add_button.click()


@pytest.mark.remote
def test_remote_page_loads(driver, wait, remote_base_url):
    # This is the most basic remote smoke check:
    # can the real dev deployment be reached, and does it render the expected
    # landing UI for adding players?
    open_clean_app(driver, wait, remote_base_url)
    assert "Add Player to Table" in driver.page_source


@pytest.mark.remote
def test_remote_dev_page_allows_basic_pairing_flow(driver, wait, remote_base_url):
    # This is intentionally lightweight.
    # We are not trying to duplicate all local regression coverage on the live
    # site; we only want to confirm that the deployed dev page still supports a
    # simple happy-path pairing flow.
    open_clean_app(driver, wait, remote_base_url)

    # Add four players, which should be enough to generate a complete
    # round-robin schedule with three rounds and no bye player.
    add_player(driver, wait, "Remote Alpha", 2500)
    add_player(driver, wait, "Remote Beta", 2400)
    add_player(driver, wait, "Remote Gamma", 2300)
    add_player(driver, wait, "Remote Delta", 2200)

    # Start pairing and wait for the dynamically generated round tabs.
    driver.find_element(By.ID, "lockAndPairButton").click()
    wait.until(lambda browser: len(browser.find_elements(By.CSS_SELECTOR, "#roundTabs .round-tab")) == 3)

    # Round 1 should show exactly two boards for four players.
    round_one_rows = driver.find_elements(By.CSS_SELECTOR, "#round1 tbody tr")
    assert len(round_one_rows) == 2
