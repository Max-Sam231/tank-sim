import { CONTROL_OVERLAY_DEFS } from "./ControlOverlayDefs.js";
import { ActionModals } from "./ui/ActionModals.js";
import { Tooltip } from "./ui/Tooltip.js";
import { renderHitboxLabels } from "./ui/hitboxLabels.js";
import { parsePolygonPoints, polygonBBox } from "./ui/polygonGeometry.js";
import { PEDAL_ACTIONS, runControlAction } from "./ui/controlActions.js";
import { renderStatusConsole } from "./ui/statusConsole.js";
import { OverlayRenderer } from "./ui/OverlayRenderer.js";
import { GaugeArrows } from "./ui/GaugeArrows.js";

class UIController {
  constructor({ rootEl, consoleEl, state, isDebug = true, actionNotifier = null }) {
    this.rootEl = rootEl;
    this.consoleEl = consoleEl;
    this.state = state;
    this.actionNotifier = actionNotifier;

    this.isDebug = Boolean(isDebug);

    this._svgEl = this.rootEl.querySelector("svg.hitbox-layer");
    this._lastClick = null;
    this._lastAction = null;
    this._touchHeldAction = null;
    this._hitboxVisible = this.isDebug;
    this._controlOverlayDefs = CONTROL_OVERLAY_DEFS;
    this._isManometerHovered = false;
    this._hoveredGauge = null;
    this._gaugeNames = {
      "gauge-coolant-temp": "Температура охлаждающей жидкости",
      "gauge-oil-temp": "Температура масла",
      "gauge-voltammeter": "Вольтамперметр ВА-540",
      "gauge-oil-pressure-engine": "Давление масла в двигателе",
      "gauge-oil-pressure-gearbox": "Давление смазки в КП",
      "gauge-fuel": "Топливомер",
      "gauge-speed": "Спидометр",
      "gauge-rpm": "Тахометр",
    };
    this._gaugeUnits = {
      "gauge-coolant-temp": "°C",
      "gauge-oil-temp": "°C",
      "gauge-voltammeter": "",
      "gauge-oil-pressure-engine": "кгс/см²",
      "gauge-oil-pressure-gearbox": "кгс/см²",
      "gauge-fuel": "л",
      "gauge-speed": "км/ч",
      "gauge-rpm": "об/мин",
    };

    this._overlays = new OverlayRenderer({
      rootEl: this.rootEl,
      defs: this._controlOverlayDefs,
      isDebug: this.isDebug,
    });

    this._ensureTooltips();

    this._actionModals = new ActionModals({
      state: this.state,
      onAction: (action) => this._notifyAction(action),
    });

    this._wireEvents();

    this._overlays.buildCabinOverlays();
    this._overlays.buildInstrumentPanelOverlays();
    if (this.isDebug) renderHitboxLabels(this.rootEl);
    this._syncHitboxVisibility();

    let prevEngineRunning = false;
    this.state.subscribe((snapshot) => {
      const isStarted = snapshot.engineRunning && snapshot.sensors.engine_rpm >= 500;
      if (isStarted && !prevEngineRunning) {
        this._notifyAction("engine-started");
      }
      prevEngineRunning = snapshot.engineRunning;
      this._render(snapshot);
    });

    this._render(this.state.getSnapshot());
  }

  _notifyAction(action, meta = {}) {
    if (!this.actionNotifier || !action) return;
    this.actionNotifier.notify(action, this.state.getSnapshot(), meta);
  }

  /** То, что нужно обработчику действия из таблицы controlActions. */
  _actionContext() {
    return {
      state: this.state,
      modals: this._actionModals,
      ui: this,
      notify: (action, meta) => this._notifyAction(action, meta),
    };
  }

  _ensureTooltips() {
    this._manometerTooltip = new Tooltip({
      className: "manometer-tooltip",
      parentEl: this.rootEl,
      fallbackWidth: 300,
      fallbackHeight: 120,
    });
    this._gaugeTooltip = new Tooltip({
      className: "gauge-tooltip",
      parentEl: document.body,
    });
  }

  _getManometerPressure(snapshot) {
    const leftOpen = Boolean(snapshot.leftTank);
    const rightOpen = Boolean(snapshot.rightTank);
    if (!leftOpen && !rightOpen) return 0;

    const left = Number(snapshot.air_left_cylinder) || 0;
    const right = Number(snapshot.air_right_cylinder) || 0;
    const openPressures = [];
    if (leftOpen) openPressures.push(left);
    if (rightOpen) openPressures.push(right);
    return openPressures.length ? openPressures.reduce((a, b) => a + b, 0) / openPressures.length : 0;
  }

  _renderManometerTooltip(snapshot) {
    if (!this._isManometerHovered) return;
    this._manometerTooltip.setText(`${this._getManometerPressure(snapshot).toFixed(1)} кгс/см²`);
  }

  _showManometerTooltip(event, snapshot) {
    this._isManometerHovered = true;
    this._manometerTooltip.show();
    this._renderManometerTooltip(snapshot);
    this._manometerTooltip.moveTo(event.clientX, event.clientY);
  }

  _hideManometerTooltip() {
    this._isManometerHovered = false;
    this._manometerTooltip.hide();
  }

  _getGaugeValue(gaugeId, snapshot) {
    const def = this._controlOverlayDefs[gaugeId];
    if (!def || def.kind !== "gauge") return null;

    let value = Number(snapshot.sensors?.[def.sensorKey] ?? snapshot[def.sensorKey]) || 0;
    let unit = this._gaugeUnits[gaugeId] || "";
    let label = this._gaugeNames[gaugeId] || gaugeId;

    // Dual gauges: voltammeter (amperage / voltage), fuel (internal / external)
    if (def.switchKey && def.secondarySensorKey) {
      const sw = snapshot[def.switchKey];
      if (GaugeArrows.usesSecondaryScale(gaugeId, sw)) {
        value =
          Number(
            snapshot.sensors?.[def.secondarySensorKey] ?? snapshot[def.secondarySensorKey],
          ) || 0;
        // Update unit/label for secondary
        if (gaugeId === "gauge-voltammeter") {
          label = "Напряжение бортсети";
          unit = "В";
        } else if (gaugeId === "gauge-fuel") {
          label = "Топливо (внешний бак)";
          unit = "л";
        }
      } else {
        if (gaugeId === "gauge-voltammeter") {
          label = "Сила тока";
          unit = "А";
        } else if (gaugeId === "gauge-fuel") {
          label = "Топливо (внутренний бак)";
          unit = "л";
        }
      }
    }

    return { value, unit, label };
  }

  _renderGaugeTooltip() {
    if (!this._hoveredGauge) return;

    const data = this._getGaugeValue(this._hoveredGauge, this.state.getSnapshot());
    if (!data) return;

    const digits = data.unit === "л" || data.unit === "об/мин" ? 0 : 1;
    const formattedValue = Number.isFinite(data.value) ? data.value.toFixed(digits) : "-";

    this._gaugeTooltip.setHtml(`<div class="gauge-tooltip-value">${formattedValue} ${data.unit}</div>`);
  }

  _showGaugeTooltip(gaugeId, event) {
    this._hoveredGauge = gaugeId;
    this._gaugeTooltip.show();
    this._renderGaugeTooltip();
    this._gaugeTooltip.moveTo(event.clientX, event.clientY);
  }

  _hideGaugeTooltip() {
    this._hoveredGauge = null;
    this._gaugeTooltip.hide();
  }

  _wireEvents() {
    this.rootEl.addEventListener("click", (event) => {
      this._capturePointer(event);
    });

    this.rootEl.addEventListener("click", (event) => {
      const el = event.target.closest(".hitbox, .overlay-control");
      if (!el) return;

      const action = el.dataset.action;
      this._lastAction = action || null;

      runControlAction(action, this._actionContext());
    });

    this.rootEl.addEventListener("mousedown", (event) => {
      const el = event.target.closest(".hitbox, .overlay-control");
      if (!el) return;

      const action = el.dataset.action;
      this._lastAction = action || null;

      const setter = PEDAL_ACTIONS[action];
      if (!setter) return;

      event.preventDefault();
      this.state[setter](true);
      this._notifyAction(action);
    });

    const releasePedals = (event) => {
      const el = event.target.closest?.(".hitbox, .overlay-control");
      const action = el?.dataset?.action;

      if (PEDAL_ACTIONS[action]) {
        event.preventDefault();
        this._notifyAction(action, { released: true });
      }

      // Отпускаем обе педали: курсор мог уйти с той, что была нажата
      for (const pedalSetter of Object.values(PEDAL_ACTIONS)) this.state[pedalSetter](false);
    };

    window.addEventListener("mouseup", releasePedals);

    this.rootEl.addEventListener("mouseleave", () => {
      for (const pedalSetter of Object.values(PEDAL_ACTIONS)) this.state[pedalSetter](false);
    });

    this.rootEl.addEventListener(
      "touchstart",
      (event) => {
        this._capturePointer(event);

        const el = event.target.closest(".hitbox, .overlay-control");
        if (!el) return;

        const action = el.dataset.action;
        this._lastAction = action || null;

        // Касание по массе отрабатывает сразу: click на тачскрине приходит с задержкой
        if (action === "battery-toggle") {
          event.preventDefault();
          runControlAction(action, this._actionContext());
          return;
        }

        const setter = PEDAL_ACTIONS[action];
        if (!setter) return;

        event.preventDefault();
        this._touchHeldAction = action;
        this.state[setter](true);
        this._notifyAction(action);
      },
      { passive: false },
    );

    window.addEventListener(
      "touchend",
      (event) => {
        if (this._touchHeldAction) {
          event.preventDefault();
          this._notifyAction(this._touchHeldAction, { released: true });
        }
        for (const pedalSetter of Object.values(PEDAL_ACTIONS)) this.state[pedalSetter](false);
        this._touchHeldAction = null;
      },
      { passive: false },
    );

    this.rootEl.addEventListener("mousemove", (event) => {
      if (this._isManometerHovered) {
        this._manometerTooltip.moveTo(event.clientX, event.clientY);
      }
      if (this._hoveredGauge) {
        this._gaugeTooltip.moveTo(event.clientX, event.clientY);
      }
    });

    // Sync hover between hitboxes and overlay-controls
    this.rootEl.addEventListener("mouseover", (event) => {
      const hitbox = event.target.closest(".hitbox");
      if (!hitbox) return;

      const action = hitbox.dataset.action;
      const gauge = hitbox.dataset.gauge;

      // Manometer special handling
      if (action === "manometer") {
        const snapshot = this.state.getSnapshot();
        this.state.setManometer(Math.round(this._getManometerPressure(snapshot)));
        this._showManometerTooltip(event, snapshot);
      }

      // Gauge hitbox handling
      if (gauge) {
        this._showGaugeTooltip(gauge, event);
      }

      // Highlight corresponding overlay-control
      if (action) {
        const overlayControl = this._overlays.getElement(action);
        if (overlayControl) {
          overlayControl.classList.add("hitbox-hovered");
        }
      }
    });

    this.rootEl.addEventListener("mouseout", (event) => {
      const hitbox = event.target.closest(".hitbox");
      if (!hitbox) return;

      const action = hitbox.dataset.action;
      const gauge = hitbox.dataset.gauge;

      // Manometer special handling
      if (action === "manometer") {
        this.state.setManometer(0);
        this._hideManometerTooltip();
      }

      // Gauge hitbox handling
      if (gauge) {
        this._hideGaugeTooltip();
      }

      // Remove highlight from corresponding overlay-control
      if (action) {
        const overlayControl = this._overlays.getElement(action);
        if (overlayControl) {
          overlayControl.classList.remove("hitbox-hovered");
        }
      }
    });

    // Keyboard events
    if (this.isDebug) {
      window.addEventListener("keydown", (event) => {
        if (event.key === "h" || event.key === "H") {
          event.preventDefault();
          this._toggleHitboxVisibility();
        }
      });
    }

    const backButton = document.getElementById("instrumentPanelBack");
    if (backButton) {
      backButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.state.setInstrumentPanelOpen(false);
      });
    }

    // Test sensors button
    const testSensorsBtn = document.getElementById("testSensorsButton");
    if (testSensorsBtn) {
      testSensorsBtn.addEventListener("click", () => {
        this.state.sensors.coolant_temp = 120;
        this.state.sensors.oil_temp = 120;
        this.state.sensors.amperage = 500;
        this.state.sensors.voltage = 30;
        this.state.sensors.oil_pressure_engine = 15;
        this.state.sensors.oil_pressure_gearbox = 15;
        this.state.sensors.fuel_level_internal = 190;
        this.state.sensors.fuel_level_external = 400;
        this.state.sensors.speed_kmh = 100;
        this.state.sensors.engine_rpm = 4000;
        this.state._emit();
      });
    }
  }

  _render(snapshot) {
    this._overlays.render(snapshot);
    this._renderManometerTooltip(snapshot);
    this._renderGaugeTooltip();

    // Для командира
    const commanderSection = document.getElementById("scene-commander");

    // Проверяем, активна ли сейчас сцена командира (она не скрыта)
    if (commanderSection && !commanderSection.classList.contains("hidden")) {
      if (snapshot.commanderView === "tilted") {
        commanderSection.classList.add("commander-view-tilted");
      } else {
        commanderSection.classList.remove("commander-view-tilted");
      }
    }

    const panelModal = document.getElementById("instrumentPanelModal");
    if (panelModal) {
      const wasOpen = !panelModal.classList.contains("hidden");
      const isOpen = Boolean(snapshot.instrumentPanel);
      panelModal.classList.toggle("hidden", !isOpen);
      this.rootEl.classList.toggle("instrument-panel-open", isOpen);
      // Sync hitbox visibility when panel opens/closes
      if (wasOpen !== isOpen) {
        this._syncHitboxVisibility();
      }
    }

    // Управление светом в кабине механика-водителя
    const driverSection = document.getElementById("scene-driver");
    if (driverSection && !driverSection.classList.contains("hidden")) {
      const isLightsOn = snapshot.isBatteryOn && snapshot.cabinLight;
      if (isLightsOn) {
        driverSection.classList.add("cabin-lights-on");
      } else {
        driverSection.classList.remove("cabin-lights-on");
      }
    }

    renderStatusConsole(this.consoleEl, snapshot, {
      isDebug: this.isDebug,
      lastAction: this._lastAction,
      hitboxVisible: this._hitboxVisible,
      lastClick: this._lastClick,
    });
  }

  _capturePointer(event) {
    if (!this._svgEl) return;

    let clientX;
    let clientY;

    if (event.touches && event.touches[0]) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    if (typeof clientX !== "number" || typeof clientY !== "number") return;

    const rect = this._svgEl.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    const vb = this._svgEl.viewBox.baseVal;
    const vbX = Math.round(vb.x + x * vb.width);
    const vbY = Math.round(vb.y + y * vb.height);

    this._lastClick = {
      clientX: Math.round(clientX),
      clientY: Math.round(clientY),
      vbX,
      vbY,
    };

    this._render(this.state.getSnapshot());
  }

  _toggleHitboxVisibility() {
    if (!this.isDebug) return;

    this._hitboxVisible = !this._hitboxVisible;

    this._syncHitboxVisibility();

    this._render(this.state.getSnapshot());
  }

  _syncHitboxVisibility() {
    if (!this.isDebug) this._hitboxVisible = false;

    const hitboxes = this.rootEl.querySelectorAll(".hitbox");
    hitboxes.forEach((hitbox) => {
      hitbox.classList.toggle("transparent", !this._hitboxVisible);
    });

    this.rootEl.classList.toggle("overlays-debug", this._hitboxVisible);

    const svgLayers = this.rootEl.querySelectorAll("svg.hitbox-layer");
    svgLayers.forEach((svgEl) => {
      svgEl.classList.toggle("labels-visible", this._hitboxVisible);
    });
  }

  showInstrumentPanel() {
    const modal = document.getElementById("instrumentPanelModal");
    if (modal) {
      modal.classList.remove("hidden");
      this.rootEl.classList.add("instrument-panel-open");
      // Re-sync hitbox visibility for instrument panel gauge hitboxes
      this._syncHitboxVisibility();
    }
  }
}

export { UIController };
