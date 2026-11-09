"""
Selenium: запуск предпускового подогревателя и проверка звуков.

Требования: pip install selenium
Сервер: npm run serve  (http://localhost:8000)

Запуск:
  python tools/selenium_heater_start.py
"""

from __future__ import annotations

import sys
import time

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

BASE_URL = "http://localhost:8000/sim.html"
WAIT_S = 20


def make_driver() -> webdriver.Chrome:
    opts = Options()
    opts.add_argument("--autoplay-policy=no-user-gesture-required")
    opts.add_argument("--window-size=1440,900")
    return webdriver.Chrome(options=opts)


def dismiss_overlays(driver: webdriver.Chrome) -> None:
    try:
        btn = WebDriverWait(driver, 4).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "#startFullscreenButton"))
        )
        btn.click()
        time.sleep(0.2)
    except Exception:
        pass

    driver.execute_script("document.body.click()")


def start_heater_scenario(driver: webdriver.Chrome) -> None:
    wait = WebDriverWait(driver, WAIT_S)

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-action='training']"))).click()
    time.sleep(0.3)

    method = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#scenarioStartMethod")))
    Select(method).select_by_value("heater-warmup")

    temp = driver.find_element(By.CSS_SELECTOR, "#scenarioAmbientTemp")
    Select(temp).select_by_value("-20")

    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#scenarioApply"))).click()
    time.sleep(0.8)


def ignite_via_hook(driver: webdriver.Chrome) -> dict:
    return driver.execute_script(
        """
        const api = window.__tankSim;
        if (!api) throw new Error('window.__tankSim не найден');
        api.audio.init();
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const snap = api.igniteHeater();
        api.startLoop();
        // дать глотку тика физике и аудио
        for (let i = 0; i < 5; i++) api.state.tick(0.05);
        const after = api.state.getSnapshot();
        const burn = api.audio.sounds.heaterBurn;
        const ignite = api.audio.sounds.heaterIgnite;
        return {
          heaterBurning: Boolean(after.heaterBurning),
          heaterFuelValve: Boolean(after.heaterFuelValve),
          exhaustCapInstalled: Boolean(after.exhaustCapInstalled),
          isBatteryOn: Boolean(after.isBatteryOn),
          sparkPlug: after.sparkPlug,
          engineStart: after.engineStart,
          burnPaused: burn ? burn.paused : null,
          burnVolume: burn ? burn.volume : null,
          igniteSrc: ignite ? ignite.currentSrc : null,
          burnSrc: burn ? burn.currentSrc : null,
        };
        """
    )


def main() -> int:
    print(f"Открываю {BASE_URL} …")
    driver = make_driver()
    try:
        driver.get(BASE_URL)
        WebDriverWait(driver, WAIT_S).until(
            lambda d: d.execute_script("return Boolean(window.__tankSim)")
        )
        dismiss_overlays(driver)

        try:
            start_heater_scenario(driver)
            print("Сценарий heater-warmup выбран из меню")
        except Exception as err:
            print(f"Меню пропущено ({err}); розжиг через __tankSim")

        result = ignite_via_hook(driver)
        print("Результат розжига:")
        for key, value in result.items():
            print(f"  {key}: {value}")

        ok = (
            result.get("heaterBurning") is True
            and result.get("burnPaused") is False
            and bool(result.get("igniteSrc"))
            and bool(result.get("burnSrc"))
        )

        time.sleep(2.5)

        if ok:
            print("OK: подогреватель горит, гул играет")
            return 0

        print("FAIL: подогреватель не зажёгся или звук не пошёл")
        return 1
    finally:
        driver.quit()


if __name__ == "__main__":
    sys.exit(main())
