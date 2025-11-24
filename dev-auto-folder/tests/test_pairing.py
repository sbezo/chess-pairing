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

def add_players(driver):
    # add players
    driver.get(BASE_URL)
    player_input = driver.find_element(By.ID, "name")
    player_input.send_keys("Magnus Carlsen")
    player_input = driver.find_element(By.ID, "Elo")
    player_input.send_keys("2822")
    add_button = driver.find_element(By.CSS_SELECTOR, "div#tab1 button")
    add_button.click()
    player_input = driver.find_element(By.ID, "name")
    player_input.send_keys("Hikaru Nakamura")
    player_input = driver.find_element(By.ID, "Elo")
    player_input.send_keys("2811")
    add_button.click()

    ## Check players appear
    cells = driver.find_elements(By.TAG_NAME, "td")
    texts = [c.text for c in cells]
    assert "Magnus Carlsen" in texts
    assert "Hikaru Nakamura" in texts
    assert "2822" in texts
    assert "2811" in texts

