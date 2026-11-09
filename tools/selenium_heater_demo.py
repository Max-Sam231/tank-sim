"""Демо: видимый запуск подогревателя, окно держим открытым."""

from __future__ import annotations

import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

BASE_URL = "http://localhost:8000/sim.html"
HOLD_SEC = 30


def main() -> None:
    opts = Options()
    opts.add_argument("--autoplay-policy=no-user-gesture-required")
    opts.add_argument("--window-size=1440,900")
    opts.add_experimental_option("detach", True)

    driver = webdriver.Chrome(options=opts)
    wait = WebDriverWait(driver, 20)

    print("Открываю sim…")
    driver.get(BASE_URL)
    wait.until(lambda d: d.execute_script("return Boolean(window.__tankSim)"))

    try:
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#startFullscreenButton"))).click()
    except Exception:
        pass
    driver.execute_script("document.body.click()")
    time.sleep(0.4)

    print("Menu: training / heater-warmup")
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-action='training']"))).click()
    time.sleep(0.5)
    Select(driver.find_element(By.CSS_SELECTOR, "#scenarioStartMethod")).select_by_value("heater-warmup")
    Select(driver.find_element(By.CSS_SELECTOR, "#scenarioAmbientTemp")).select_by_value("-20")
    driver.find_element(By.CSS_SELECTOR, "#scenarioApply").click()
    time.sleep(1.2)

    print("Сцена подогревателя + розжиг")
    result = driver.execute_script(
        """
        const api = window.__tankSim;
        api.audio.init();
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        api.changeScene('heater');
        const snap = api.igniteHeater();
        api.startLoop();
        for (let i = 0; i < 8; i++) api.state.tick(0.1);
        const after = api.state.getSnapshot();
        const burn = api.audio.sounds.heaterBurn;
        const fx = document.getElementById('heater-exhaust-fx');
        const smoke = document.getElementById('heater-smoke-container');
        return {
          heaterBurning: after.heaterBurning,
          sidePanelOpen: after.sidePanelOpen,
          exhaustCapInstalled: after.exhaustCapInstalled,
          burnPaused: burn.paused,
          heaterVisible: !document.getElementById('scene-heater')?.classList.contains('hidden'),
          closeup: document.getElementById('scene-heater')?.classList.contains('heater-closeup'),
          fxActive: fx && !fx.classList.contains('invisible'),
          tongues: fx ? fx.querySelectorAll('.heater-tongue').length : 0,
          particles: smoke ? smoke.querySelectorAll('.smoke-particle').length : 0,
        };
        """
    )
    print("Результат:", result)
    print(f"Смотри окно Chrome ~{HOLD_SEC} сек (звук гула подогревателя)…")
    time.sleep(HOLD_SEC)
    print("Демо завершено. Chrome можно закрыть вручную.")


if __name__ == "__main__":
    main()
