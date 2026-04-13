import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select


def open_clean_app(driver, wait, base_url):
    # Start each test from a known-empty state.
    # The application auto-saves to browser localStorage, so without clearing it
    # a previous test could leave players, rounds, or settings behind and make
    # later assertions flaky.
    driver.get(base_url)
    wait.until(EC.presence_of_element_located((By.ID, "AddPlayer")))
    driver.execute_script("window.localStorage.clear();")
    driver.refresh()
    wait.until(EC.presence_of_element_located((By.ID, "AddPlayer")))


def add_player(driver, wait, name, elo):
    # Small helper used by many tests:
    # fill the player name and Elo inputs and submit the row.
    # Waiting for the name field to be clickable makes the tests less sensitive
    # to page-load timing and avoids interacting with half-initialized DOM.
    name_input = wait.until(EC.element_to_be_clickable((By.ID, "name")))
    elo_input = driver.find_element(By.ID, "Elo")
    add_button = driver.find_element(By.ID, "AddPlayer")

    name_input.clear()
    name_input.send_keys(name)
    elo_input.clear()
    elo_input.send_keys(str(elo))
    add_button.click()


def add_players(driver, wait, players):
    # Convenience wrapper for adding several players in sequence.
    for name, elo in players:
        add_player(driver, wait, name, elo)


def table_rows(driver, table_id):
    # Return table body rows so tests can make assertions against visible data
    # instead of relying on internal JavaScript state.
    return driver.find_elements(By.CSS_SELECTOR, f"#{table_id} tbody tr")


def click_tab(driver, wait, tab_text):
    # The app uses custom div-based tabs rather than semantic tab controls,
    # so the tests switch views by visible label.
    tab = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, f"//div[contains(@class, 'tab') and normalize-space()='{tab_text}']")
        )
    )
    tab.click()


def cross_table_value(driver, row_name, column_name):
    # Read one logical cell from the crosstable by player names.
    # This makes the assertion stable even if the exact row/column index shifts
    # because the pairing order changes in the future.
    table = driver.find_element(By.ID, "crossTable")
    rows = table.find_elements(By.TAG_NAME, "tr")
    headers = [cell.text for cell in rows[0].find_elements(By.XPATH, "./th")]
    column_index = headers.index(column_name)

    for row in rows[1:]:
        cells = row.find_elements(By.XPATH, "./th|./td")
        if cells[0].text == row_name:
            return cells[column_index].text

    raise AssertionError(f"Row not found in crosstable: {row_name}")


def confirm_popup(wait):
    # SweetAlert popups are used heavily in the UI.
    # This helper waits for a popup, confirms it, and waits until it is fully
    # gone so later clicks are not blocked by the overlay.
    wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "swal2-popup")))
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".swal2-confirm"))).click()
    wait.until(EC.invisibility_of_element_located((By.CLASS_NAME, "swal2-popup")))


@pytest.mark.local
def test_adding_duplicate_player_shows_error(driver, wait, local_base_url):
    # Goal:
    # verify that the UI protects tournament data from duplicate names.
    #
    # Why this matters:
    # several downstream features, such as lookup and standings rendering,
    # assume player names are unique. If duplicates are accepted, later screens
    # become ambiguous.
    open_clean_app(driver, wait, local_base_url)

    # First insert succeeds and creates one visible table row.
    add_player(driver, wait, "Magnus Carlsen", 2833)

    # Second insert uses the same name and should be rejected by the app.
    add_player(driver, wait, "Magnus Carlsen", 2833)

    # The user should see an explicit error message, and the players table
    # should still contain only the original row.
    popup = wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "swal2-popup")))
    assert "Player with same name already in tournament" in popup.text
    assert len(table_rows(driver, "dataTable")) == 1


@pytest.mark.local
def test_sort_players_orders_by_elo_descending(driver, wait, local_base_url):
    # Goal:
    # verify that the "Sort Players" button reorders the visible table by Elo,
    # from the highest-rated player to the lowest-rated player.
    open_clean_app(driver, wait, local_base_url)

    # Add players out of order so the sort action has something meaningful
    # to change.
    add_players(
        driver,
        wait,
        [
            ("Player C", 2100),
            ("Player A", 2500),
            ("Player B", 2300),
        ],
    )

    # Trigger the sort action from the real UI.
    driver.find_element(By.XPATH, "//button[normalize-space()='Sort Players']").click()

    # Read the visible order from the table and assert that it matches Elo
    # descending, not insertion order.
    rows = table_rows(driver, "dataTable")
    names = [row.find_elements(By.TAG_NAME, "td")[0].text for row in rows]
    assert names == ["Player A", "Player B", "Player C"]


@pytest.mark.local
def test_lock_pairing_updates_cross_table_and_standings(driver, wait, local_base_url):
    # Goal:
    # cover the core tournament workflow end to end:
    # add players -> generate pairings -> enter a result ->
    # verify that crosstable and standings both react.
    open_clean_app(driver, wait, local_base_url)

    # Four players produce a simple 3-round round-robin tournament without a bye,
    # which keeps the assertions straightforward.
    add_players(
        driver,
        wait,
        [
            ("Alpha", 2400),
            ("Bravo", 2300),
            ("Charlie", 2200),
            ("Delta", 2100),
        ],
    )

    # Start pairing and wait until the round tabs are created.
    driver.find_element(By.ID, "lockAndPairButton").click()
    wait.until(lambda browser: len(browser.find_elements(By.CSS_SELECTOR, "#roundTabs .round-tab")) == 3)

    # Inspect the first board in round 1 so the test can assert against the
    # actual generated pairing instead of hard-coding player positions.
    first_round = wait.until(EC.visibility_of_element_located((By.ID, "round1")))
    first_row_cells = first_round.find_elements(By.CSS_SELECTOR, "tbody tr")[0].find_elements(By.TAG_NAME, "td")
    player1_name = first_row_cells[0].text
    player2_name = first_row_cells[1].text

    # Record a decisive result: player 1 wins.
    Select(first_row_cells[2].find_element(By.TAG_NAME, "select")).select_by_value("1")

    # The crosstable should immediately reflect the entered result in both
    # directions: winner gets "1", loser gets "0".
    click_tab(driver, wait, "Crosstable")
    assert cross_table_value(driver, player1_name, player2_name) == "1"
    assert cross_table_value(driver, player2_name, player1_name) == "0"

    # The standings table should also update, placing the winner at the top
    # with exactly 1 point.
    click_tab(driver, wait, "Standing")
    standings_rows = wait.until(
        lambda browser: browser.find_elements(By.CSS_SELECTOR, "#standingsTable tbody tr")
    )
    assert standings_rows[0].find_elements(By.TAG_NAME, "td")[1].text == player1_name
    assert standings_rows[0].find_elements(By.TAG_NAME, "td")[3].text == "1"


@pytest.mark.local
def test_save_and_load_players_uses_browser_local_storage(driver, wait, local_base_url):
    # Goal:
    # verify the browser-local player-group workflow:
    # save a named group, clear the table, then restore it from localStorage.
    open_clean_app(driver, wait, local_base_url)

    players = [("Kasparov", 2812), ("Karpov", 2780)]
    add_players(driver, wait, players)

    # Save the current player list under a human-readable group name.
    driver.find_element(By.XPATH, "//button[normalize-space()='Save Players']").click()
    group_input = wait.until(EC.visibility_of_element_located((By.ID, "groupName")))
    group_input.send_keys("Legends")
    driver.find_element(By.CSS_SELECTOR, ".swal2-confirm").click()
    confirm_popup(wait)

    # Clear the visible table to prove that the later load action really
    # restores data from browser-local storage.
    driver.find_element(By.XPATH, "//button[normalize-space()='Clear Table']").click()
    wait.until(lambda browser: len(table_rows(browser, "dataTable")) == 0)

    # Load the saved group from the popup select box.
    driver.find_element(By.XPATH, "//button[normalize-space()='Load Players']").click()
    select_element = wait.until(EC.visibility_of_element_located((By.ID, "savedGroupSelect")))
    Select(select_element).select_by_visible_text("Legends")
    driver.find_element(By.CSS_SELECTOR, ".swal2-confirm").click()
    confirm_popup(wait)

    # The original player names should be restored into the visible players table.
    rows = table_rows(driver, "dataTable")
    restored_names = [row.find_elements(By.TAG_NAME, "td")[0].text for row in rows]
    assert restored_names == ["Kasparov", "Karpov"]


@pytest.mark.local
def test_players_persist_after_refresh(driver, wait, local_base_url):
    # Goal:
    # verify automatic persistence of in-progress data.
    # The app saves to browser localStorage after player edits, so a plain page
    # refresh should not wipe the players table.
    open_clean_app(driver, wait, local_base_url)

    add_players(
        driver,
        wait,
        [
            ("Player One", 2001),
            ("Player Two", 2002),
        ],
    )

    # Simulate a normal browser refresh, which should rehydrate state from
    # localStorage during app initialization.
    driver.refresh()
    wait.until(EC.presence_of_element_located((By.ID, "dataTable")))

    # The same players should still be visible after reload.
    rows = table_rows(driver, "dataTable")
    names = [row.find_elements(By.TAG_NAME, "td")[0].text for row in rows]
    assert names == ["Player One", "Player Two"]
