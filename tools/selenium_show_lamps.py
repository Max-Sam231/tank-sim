"""Открыть щиток КИП с горящими сигнальными лампами."""

from __future__ import annotations

import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

BASE_URL = "http://localhost:8000/sim.html"


def main() -> None:
    opts = Options()
    opts.add_argument("--autoplay-policy=no-user-gesture-required")
    opts.add_argument("--window-size=1440,900")
    opts.add_experimental_option("detach", True)
    driver = webdriver.Chrome(options=opts)
    wait = WebDriverWait(driver, 20)

    driver.get(BASE_URL)
    wait.until(lambda d: d.execute_script("return Boolean(window.__tankSim)"))
    try:
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#startFullscreenButton"))).click()
    except Exception:
        pass
    driver.execute_script("document.body.click()")
    time.sleep(0.3)

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-action='training']"))).click()
    time.sleep(0.3)
    Select(driver.find_element(By.CSS_SELECTOR, "#scenarioStartMethod")).select_by_value("electric-start")
    driver.find_element(By.CSS_SELECTOR, "#scenarioApply").click()
    time.sleep(1.0)

    info = driver.execute_script(
        """
        const api = window.__tankSim;
        api.changeScene('driver');
        if (!api.state.isBatteryOn) api.state.toggleBattery();
        api.state.setInstrumentPanelOpen(true);
        api.state.signalLamps = 2;
        api.state._emit();
        // пересобрать оверлеи щитка после открытия
        const lamps = [...document.querySelectorAll(
          '.instrument-panel-hitbox-layer [data-action^="lamp-"]'
        )].map((el) => el.dataset.action);
        const cabinLamps = [...document.querySelectorAll(
          '.cabin-hitbox-layer [data-action^="lamp-"]'
        )].length;
        return {
          panelOpen: Boolean(api.state.instrumentPanel),
          panelLamps: lamps,
          cabinLamps,
        };
        """
    )
    print(info)
    print("Смотри щиток: лампы на пластине под фарами, ~25 сек")
    time.sleep(25)


if __name__ == "__main__":
    main()
