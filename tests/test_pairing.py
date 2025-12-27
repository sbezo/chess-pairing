import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--headless=new")  # headless mode
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.binary_location = "/usr/bin/chromium"

    service = Service("/usr/bin/chromedriver")      # system chromedriver
    driver = webdriver.Chrome(service=service, options=options)
    yield driver
    driver.quit()

# here are real tests...

BASE_URL = "https://chess-pairing.online/dev-auto-folder/"

def test_page_load(driver):
    # loading the main page
    driver.get(BASE_URL)
    assert "Add Player to Table" in driver.page_source

def test_palyers_table(driver):
    # add 2 players to table
    driver.get(BASE_URL)
    player_input = driver.find_element(By.ID, "name")
    player_input.send_keys("Magnus Carlsen")
    player_input = driver.find_element(By.ID, "Elo")
    player_input.send_keys("2822")
    add_button = driver.find_element(By.ID, "AddPlayer")
    add_button.click()
    player_input = driver.find_element(By.ID, "name")
    player_input.send_keys("Hikaru Nakamura")
    player_input = driver.find_element(By.ID, "Elo")
    player_input.send_keys("2801")
    add_button = driver.find_element(By.ID, "AddPlayer")
    add_button.click()
    ## Check players appear
    cells = driver.find_elements(By.TAG_NAME, "td")
    assert any("Magnus Carlsen" in cell.text for cell in cells)
    assert any("2822" in cell.text for cell in cells)
    assert any("Hikaru Nakamura" in cell.text for cell in cells)
    assert any("2801" in cell.text for cell in cells)


