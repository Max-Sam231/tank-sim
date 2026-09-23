import { CONTROL_OVERLAY_DEFS } from "./ControlOverlayDefs.js";
import { ActionModals } from "./ui/ActionModals.js";
import { Tooltip } from "./ui/Tooltip.js";
import { renderHitboxLabels } from "./ui/hitboxLabels.js";
import { parsePolygonPoints, polygonBBox } from "./ui/polygonGeometry.js";

class UIController {
  constructor({ rootEl, consoleEl, state, isDebug = true, actionNotifier = null }) {
    this.rootEl = rootEl;
    this.consoleEl = consoleEl;
    this.state = state;
    this.actionNotifier = actionNotifier;

    this.isDebug = Boolean(isDebug);

    this._overlayLayerEl = this.rootEl.querySelector(".overlay-layer");
    this._overlayEls = Array.from(this.rootEl.querySelectorAll(".overlay[data-action][data-when]"));
    this._controlOverlayEls = new Map();
    this._controlOverlayMeta = new Map();
    this._gaugeArrowEls = new Map();
    this._svgEl = this.rootEl.querySelector("svg.hitbox-layer");
    this._lastClick = null;
    this._lastAction = null;
    this._touchHeldAction = null;
    this._hitboxVisible = this.isDebug;
    this._labelGroup = null;
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

    this._ensureTooltips();

    this._actionModals = new ActionModals({
      state: this.state,
      onAction: (action) => this._notifyAction(action),
    });

    this._wireEvents();

    this._ensureCabinControlOverlays();
    this._ensureInstrumentPanelControlOverlays();
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
      if (this._shouldUseSecondaryGauge(gaugeId, sw)) {
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

  _ensureCabinControlOverlays() {
    if (!this._overlayLayerEl || !this._svgEl) return;

    // Ensure overlay-container exists for proportional scaling
    let container = this._overlayLayerEl.querySelector(".overlay-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "overlay-container";
      this._overlayLayerEl.appendChild(container);
    }
    this._overlayContainerEl = container;

    for (const [, el] of this._controlOverlayEls) el.remove();
    this._controlOverlayEls.clear();
    this._controlOverlayMeta.clear();

    const vb = this._svgEl.viewBox.baseVal;
    const vbW = vb?.width || 1920;
    const vbH = vb?.height || 1080;

    const cabinSvg = this.rootEl.querySelector("svg.cabin-hitbox-layer") || this._svgEl;
    const hitboxes = Array.from(cabinSvg.querySelectorAll(".hitbox[data-action]"));

    for (const hitbox of hitboxes) {
      const action = hitbox.dataset.action;
      if (!action) continue;
      const def = this._controlOverlayDefs[action];
      if (!def) continue;

      const pointsAttr = hitbox.getAttribute("points") || "";
      const points = parsePolygonPoints(pointsAttr);
      if (points.length < 3) continue;

      const bbox = polygonBBox(points);
      if (!bbox) continue;

      const bboxW = bbox.maxX - bbox.minX;
      const bboxH = bbox.maxY - bbox.minY;
      const cx = bbox.minX + bboxW / 2;
      const cy = bbox.minY + bboxH / 2;
      const inflate = Number.isFinite(def.inflate) ? def.inflate : 1.6;
      const targetW = Math.max(1, bboxW * inflate);
      const targetH = Math.max(1, bboxH * inflate);

      const offsetX = Number.isFinite(def.offsetX) ? def.offsetX : 0;
      const offsetY = Number.isFinite(def.offsetY) ? def.offsetY : 0;
      const left = cx - targetW / 2 + offsetX;
      const top = cy - targetH / 2 + offsetY;

      const x = (left / vbW) * 100;
      const y = (top / vbH) * 100;
      const w = (targetW / vbW) * 100;
      const h = (targetH / vbH) * 100;

      const img = document.createElement("img");
      img.className = "overlay overlay-control is-visible";
      img.setAttribute("data-action", action);
      img.setAttribute("alt", "");
      img.setAttribute("draggable", "false");
      img.style.setProperty("--x", String(x));
      img.style.setProperty("--y", String(y));
      img.style.setProperty("--w", String(w));
      img.style.setProperty("--h", String(h));
      img.style.setProperty("--rot", "0");
      img.style.setProperty("--z", String(def.z ?? 50));

      this._overlayContainerEl.appendChild(img);
      this._controlOverlayEls.set(action, img);
      this._controlOverlayMeta.set(action, {
        vbW,
        vbH,
        cx,
        cy,
        bboxW,
        bboxH,
      });
    }
  }

  _ensureInstrumentPanelControlOverlays() {
    const panelStageEl = this.rootEl.querySelector(".instrument-panel-stage");
    if (!panelStageEl) return;

    const overlayLayerEl =
      Array.from(panelStageEl.children).find((el) => el.classList?.contains("overlay-layer")) ||
      null;
    const panelSvg = panelStageEl.querySelector("svg.instrument-panel-hitbox-layer");
    if (!overlayLayerEl || !panelSvg) return;

    // Ensure overlay-container exists for proportional scaling
    let panelContainer = overlayLayerEl.querySelector(".overlay-container");
    if (!panelContainer) {
      panelContainer = document.createElement("div");
      panelContainer.className = "overlay-container";
      overlayLayerEl.appendChild(panelContainer);
    }

    // Clean old overlays for the panel
    for (const [action, el] of this._controlOverlayEls) {
      if (el.closest(".instrument-panel-stage")) el.remove();
    }

    // Clean old gauge arrows
    for (const [action, el] of this._gaugeArrowEls || []) {
      el.remove();
    }
    this._gaugeArrowEls = new Map();

    const vb = panelSvg.viewBox.baseVal;
    const vbW = vb?.width || 1920;
    const vbH = vb?.height || 1080;

    const hitboxes = Array.from(panelSvg.querySelectorAll(".hitbox[data-action]"));
    for (const hitbox of hitboxes) {
      const action = hitbox.dataset.action;
      if (!action) continue;
      const def = this._controlOverlayDefs[action];
      if (!def) continue;

      if (def.kind === "gauge") continue;

      const pointsAttr = hitbox.getAttribute("points") || "";
      const points = parsePolygonPoints(pointsAttr);
      if (points.length < 3) continue;

      const bbox = polygonBBox(points);
      if (!bbox) continue;

      const bboxW = bbox.maxX - bbox.minX;
      const bboxH = bbox.maxY - bbox.minY;
      const cx = bbox.minX + bboxW / 2;
      const cy = bbox.minY + bboxH / 2;
      const inflate = Number.isFinite(def.inflate) ? def.inflate : 1.6;
      const targetW = Math.max(1, bboxW * inflate);
      const targetH = Math.max(1, bboxH * inflate);

      const offsetX = Number.isFinite(def.offsetX) ? def.offsetX : 0;
      const offsetY = Number.isFinite(def.offsetY) ? def.offsetY : 0;
      const left = cx - targetW / 2 + offsetX;
      const top = cy - targetH / 2 + offsetY;

      const x = (left / vbW) * 100;
      const y = (top / vbH) * 100;
      const w = (targetW / vbW) * 100;
      const h = (targetH / vbH) * 100;

      const img = document.createElement("img");
      img.className = "overlay overlay-control is-visible";
      img.setAttribute("data-action", action);
      img.setAttribute("alt", "");
      img.setAttribute("draggable", "false");
      img.style.setProperty("--x", String(x));
      img.style.setProperty("--y", String(y));
      img.style.setProperty("--w", String(w));
      img.style.setProperty("--h", String(h));
      img.style.setProperty("--rot", "0");
      img.style.setProperty("--z", String(def.z ?? 50));

      panelContainer.appendChild(img);
      this._controlOverlayEls.set(action, img);
      this._controlOverlayMeta.set(action, {
        vbW,
        vbH,
        cx,
        cy,
        bboxW,
        bboxH,
      });
    }

    // Create gauge arrows from defs (they have no hitbox polygons)
    for (const [action, def] of Object.entries(this._controlOverlayDefs)) {
      if (def.kind !== "gauge") continue;
      this._ensureGaugeArrow(action, def, panelContainer, vbW, vbH);
    }
  }

  _ensureGaugeArrow(action, def, overlayLayerEl, vbW, vbH) {
    if (!this._gaugeArrowEls) this._gaugeArrowEls = new Map();

    const img = document.createElement("img");
    img.className = "overlay gauge-arrow is-visible";
    img.setAttribute("data-action", action);
    img.setAttribute("alt", "");
    img.setAttribute("draggable", "false");
    img.src = def.arrowImage || "./img/12/14_0003_Фигура-1.png";

    const aw = def.arrowW || 70;
    const ah = def.arrowH || 70;

    // Center the arrow image on (cx, cy)
    const left = def.cx - aw / 2;
    const top = def.cy - ah / 2;

    const x = (left / vbW) * 100;
    const y = (top / vbH) * 100;
    const w = (aw / vbW) * 100;
    const h = (ah / vbH) * 100;

    img.style.setProperty("--x", String(x));
    img.style.setProperty("--y", String(y));
    img.style.setProperty("--w", String(w));
    img.style.setProperty("--h", String(h));
    img.style.setProperty("--rot", String(def.startAngle));
    img.style.setProperty("--z", String(def.z ?? 75));
    img.style.setProperty("--pivot-x", String(def.pivotX ?? 50) + "%");
    img.style.setProperty("--pivot-y", String(def.pivotY ?? 100) + "%");

    overlayLayerEl.appendChild(img);
    this._gaugeArrowEls.set(action, img);

    // Add pivot point indicator (yellow dot) for debugging
    const pivotX = def.pivotX ?? 50;
    const pivotY = def.pivotY ?? 100;
    const pivotAbsX = left + (pivotX / 100) * aw;
    const pivotAbsY = top + (pivotY / 100) * ah;

    const pivotDot = document.createElement("div");
    pivotDot.className = "pivot-indicator";
    pivotDot.style.position = "absolute";
    pivotDot.style.left = ((pivotAbsX / vbW) * 100) + "%";
    pivotDot.style.top = ((pivotAbsY / vbH) * 100) + "%";
    pivotDot.style.width = "8px";
    pivotDot.style.height = "8px";
    pivotDot.style.backgroundColor = "yellow";
    pivotDot.style.borderRadius = "50%";
    pivotDot.style.border = "1px solid black";
    pivotDot.style.zIndex = "100";
    pivotDot.style.transform = "translate(-50%, -50%)";
    pivotDot.style.pointerEvents = "none";

    overlayLayerEl.appendChild(pivotDot);
  }

  _updateGaugeArrows(snapshot) {
    if (!this._gaugeArrowEls || this._gaugeArrowEls.size === 0) return;

    for (const [action, img] of this._gaugeArrowEls) {
      const def = this._controlOverlayDefs[action];
      if (!def || def.kind !== "gauge") continue;

      // Read sensor value from snapshot.sensors
      let value = Number(snapshot.sensors?.[def.sensorKey] ?? snapshot[def.sensorKey]) || 0;
      let min = def.min;
      let max = def.max;

      // Dual gauges: voltammeter (amperage / voltage), fuel (internal / external)
      if (def.switchKey && def.secondarySensorKey) {
        const sw = snapshot[def.switchKey];
        if (this._shouldUseSecondaryGauge(action, sw)) {
          value =
            Number(
              snapshot.sensors?.[def.secondarySensorKey] ?? snapshot[def.secondarySensorKey],
            ) || 0;
          min = def.secondaryMin;
          max = def.secondaryMax;
        }
      }

      // Normalize value → angle
      // Support asymmetric scales (e.g., VA-540: 100-0-500 A with zero offset left)
      let normalized;
      if (typeof def.zeroOffset === "number") {
        // Asymmetric scale: map negative and positive separately
        if (value < 0) {
          // Left of zero: map [min, 0] → [0, zeroOffset]
          const leftRange = 0 - min; // e.g., 0 - (-100) = 100
          normalized = def.zeroOffset * (1 - Math.abs(value) / leftRange);
        } else {
          // Right of zero: map [0, max] → [zeroOffset, 1]
          const rightRange = max; // e.g., 500
          normalized = def.zeroOffset + (1 - def.zeroOffset) * (value / rightRange);
        }
        normalized = Math.max(0, Math.min(1, normalized));
      } else {
        // Standard linear scale
        normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
      }

      const angleRange = def.endAngle - def.startAngle;
      const angle = def.startAngle + normalized * angleRange;

      img.style.setProperty("--rot", String(angle));
    }
  }

  _shouldUseSecondaryGauge(action, switchValue) {
    if (action === "gauge-voltammeter") {
      return Boolean(switchValue); // ammeterButton pressed → show voltage
    }
    if (action === "gauge-fuel") {
      // leftRightTanks: 0 = right/external, 2 = left/internal
      return switchValue === 0;
    }
    return false;
  }

  _getControlOverlayFrame(action, snapshot) {
    const def = this._controlOverlayDefs[action];
    if (!def) return null;

    if (def.kind === "boolean") {
      const value = Boolean(snapshot[def.stateKey]);
      const src = value ? def.on : def.off;
      if (!src) return null;
      return {
        src,
        inflate: def.inflate,
        offsetX: def.offsetX,
        offsetY: def.offsetY,
        z: def.z,
      };
    }

    if (def.kind === "enum") {
      const key = snapshot[def.stateKey];
      const frame = def.frames?.[key] ?? def.frames?.neutral;
      if (!frame) return null;

      const src = typeof frame === "string" ? frame : frame.src;
      if (!src) return null;

      const inflate = Number.isFinite(frame.inflate) ? frame.inflate : def.inflate;
      const offsetX = Number.isFinite(frame.offsetX) ? frame.offsetX : def.offsetX;
      const offsetY = Number.isFinite(frame.offsetY) ? frame.offsetY : def.offsetY;
      const z = Number.isFinite(frame.z) ? frame.z : def.z;

      return { src, inflate, offsetX, offsetY, z };
    }

    if (def.kind === "range") {
      const value = Number(snapshot[def.stateKey]);
      if (!Array.isArray(def.frames) || def.frames.length === 0) return null;

      let best = def.frames[0];
      if (Number.isFinite(value)) {
        let bestDist = Infinity;
        for (const frame of def.frames) {
          const d = Math.abs(value - frame.at);
          if (d < bestDist) {
            bestDist = d;
            best = frame;
          }
        }
      }

      const src = typeof best === "string" ? best : best.src;
      if (!src) return null;

      const inflate = Number.isFinite(best.inflate) ? best.inflate : def.inflate;
      const offsetX = Number.isFinite(best.offsetX) ? best.offsetX : def.offsetX;
      const offsetY = Number.isFinite(best.offsetY) ? best.offsetY : def.offsetY;
      const z = Number.isFinite(best.z) ? best.z : def.z;

      return { src, inflate, offsetX, offsetY, z };
    }

    return null;
  }

  _getControlOverlaySrc(action, snapshot) {
    const def = this._controlOverlayDefs[action];
    if (!def) return null;

    if (def.kind === "boolean") {
      const value = Boolean(snapshot[def.stateKey]);
      return value ? def.on : def.off;
    }

    if (def.kind === "enum") {
      const key = snapshot[def.stateKey];
      const frame = def.frames?.[key] ?? def.frames?.neutral;
      if (!frame) return null;
      return typeof frame === "string" ? frame : frame.src;
    }

    if (def.kind === "range") {
      const value = Number(snapshot[def.stateKey]);
      if (!Number.isFinite(value)) return def.frames[0]?.src || null;

      let best = def.frames[0];
      let bestDist = Infinity;
      for (const frame of def.frames) {
        const d = Math.abs(value - frame.at);
        if (d < bestDist) {
          bestDist = d;
          best = frame;
        }
      }
      return best?.src || null;
    }

    return null;
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

      // Handle all cabin controls
      switch (action) {
        case "battery-toggle":
          this.state.toggleBattery();
          break;
        case "manometer":
          // Manometer shows value on hover, handled by mouseover event
          break;
        case "instrument-panel":
          this._showInstrumentPanel();
          this.state.setInstrumentPanelOpen(true);
          break;
        case "left-tank":
          this.state.toggleLeftTank();
          break;
        case "bcn":
          this._actionModals.open("bcn");
          break;
        case "shutters":
          this._actionModals.open("shutters");
          break;
        case "right-tank":
          this.state.toggleRightTank();
          break;
        case "fuel-primer-lever":
          this.state.pumpFuelPrimerLever();
          break;
        case "fuel-manual-feed":
          this._actionModals.open("fuelFeed");
          break;
        case "gear-lever":
          this._actionModals.open("gear");
          break;
        case "air-bleed-valve":
          this.state.toggleAirBleedValve();
          break;
        case "azr":
          this.state.cycleAzr();
          break;
        case "epk":
          this.state.toggleEpk();
          break;
        case "horn":
          this.state.toggleHorn();
          break;
        case "mzn-engine":
          this.state.toggleMznEngine();
          break;
        case "ammeter-button":
          this.state.toggleAmmeterButton();
          break;
        case "left-right-tanks":
          this.state.cycleLeftRightTanks();
          break;
        case "spark-plug":
          this.state.cycleSparkPlug();
          break;
        case "engine-start":
          this.state.cycleEngineStart();
          break;
        case "emergency-hatch-rotation":
          this.state.toggleEmergencyHatchRotation();
          break;
        case "oil-pump-gearbox":
          this.state.toggleOilPumpGearbox();
          break;
        // Note: commander-call and air-intake are indicator lamps only (non-interactive)
        case "heating":
          this.state.toggleHeating();
          break;
        case "combined":
          this.state.toggleCombined();
          break;
        case "left-lights":
          this.state.toggleLeftLights();
          break;
        case "right-lights":
          this.state.toggleRightLights();
          break;
        case "gabrate-lights":
          this.state.toggleGabrateLights();
          break;
        case "lights-all":
          this.state.toggleLightsAll();
          break;
        case "water-antifreeze":
          this.state.toggleWaterAntifreeze();
          break;
        case "gpk":
          this.state.toggleGpk();
          break;
        case "bca-tca":
          this.state.cycleBcaTca();
          break;
        case "mzn-tow":
          this.state.cycleMznTow();
          break;
        case "starter":
          this.state.cycleStarter();
          break;
        case "signal-lamps":
          this.state.cycleSignalLamps();
          break;
        case "cabin-light":
          this.state.toggleCabinLight();
          break;
        case "side-panel-open":
          sceneManager.change(null, sceneId || "scene-side-panel-open");
          break;
      }

      const notifyActions = new Set([
        "battery-toggle",
        "instrument-panel",
        "left-tank",
        "right-tank",
        "fuel-primer-lever",
        "fuel-manual-feed",
        "air-bleed-valve",
        "azr",
        "epk",
        "horn",
        "mzn-engine",
        "ammeter-button",
        "left-right-tanks",
        "spark-plug",
        "engine-start",
        "emergency-hatch-rotation",
        "oil-pump-gearbox",
        // Note: commander-call and air-intake are indicator lamps only (no notifications)
        "heating",
        "combined",
        "left-lights",
        "right-lights",
        "gabrate-lights",
        "lights-all",
        "water-antifreeze",
        "gpk",
        "bca-tca",
        "mzn-tow",
        "starter",
        "signal-lamps",
        "cabin-light",
      ]);
      if (notifyActions.has(action)) this._notifyAction(action);
    });

    this.rootEl.addEventListener("mousedown", (event) => {
      const el = event.target.closest(".hitbox, .overlay-control");
      if (!el) return;

      const action = el.dataset.action;
      this._lastAction = action || null;
      if (action === "brake-pedal") {
        event.preventDefault();
        this.state.setBrakePressed(true);
        this._notifyAction(action);
      } else if (action === "gas-pedal") {
        event.preventDefault();
        this.state.setGasPedal(true);
        this._notifyAction(action);
      }
    });

    const releasePedals = (event) => {
      const el = event.target.closest?.(".hitbox, .overlay-control");
      const action = el?.dataset?.action;

      if (action === "brake-pedal" || action === "gas-pedal") {
        event.preventDefault();
        this._notifyAction(action, { released: true });
      }
      this.state.setBrakePressed(false);
      this.state.setGasPedal(false);
    };

    window.addEventListener("mouseup", releasePedals);

    this.rootEl.addEventListener("mouseleave", () => {
      this.state.setBrakePressed(false);
      this.state.setGasPedal(false);
    });

    this.rootEl.addEventListener(
      "touchstart",
      (event) => {
        this._capturePointer(event);

        const el = event.target.closest(".hitbox, .overlay-control");
        if (!el) return;

        const action = el.dataset.action;
        this._lastAction = action || null;
        if (action === "battery-toggle") {
          event.preventDefault();
          this.state.toggleBattery();
          this._notifyAction(action);
          return;
        }

        if (action === "brake-pedal") {
          event.preventDefault();
          this._touchHeldAction = "brake-pedal";
          this.state.setBrakePressed(true);
          this._notifyAction(action);
        } else if (action === "gas-pedal") {
          event.preventDefault();
          this._touchHeldAction = "gas-pedal";
          this.state.setGasPedal(true);
          this._notifyAction(action);
        }
      },
      { passive: false },
    );

    window.addEventListener(
      "touchend",
      (event) => {
        if (this._touchHeldAction) event.preventDefault();
        if (this._touchHeldAction) this._notifyAction(this._touchHeldAction, { released: true });
        this.state.setBrakePressed(false);
        this.state.setGasPedal(false);
        this._touchHeldAction = null;
      },
      { passive: false },
    );

    this.rootEl.addEventListener("mousemove", (event) => {
      if (this._isManometerHovered) {
        this._moveManometerTooltip(event.clientX, event.clientY);
      }
      if (this._hoveredGauge) {
        this._moveGaugeTooltip(event.clientX, event.clientY);
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
        const overlayControl = this._controlOverlayEls.get(action);
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
        const overlayControl = this._controlOverlayEls.get(action);
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
    this._renderOverlays(snapshot);
    this._updateGaugeArrows(snapshot);
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

    if (!this.consoleEl) return;

    if (!this.isDebug) {
      const safeFixed = (value, digits) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return "-";
        return n.toFixed(digits);
      };

      const safeInt = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return "-";
        return String(Math.round(n));
      };

      const lines = [
        "ПРИБОРЫ",
        `Давление воздуха (лев.):  ${safeFixed(snapshot.air_left_cylinder, 1)} кгс/см²`,
        `Давление воздуха (прав.): ${safeFixed(snapshot.air_right_cylinder, 1)} кгс/см²`,
        `Давление пуска (воздух): ${safeFixed(snapshot.air_start_pressure, 1)} кгс/см²`,
        `Обороты двигателя:        ${safeInt(snapshot.engine_rpm)} об/мин`,
        `Давление масла (двиг.):   ${safeFixed(snapshot.oil_pressure_engine, 1)} кгс/см²`,
        `Давление масла (КПП):     ${safeFixed(snapshot.oil_pressure_gearbox, 1)} кгс/см²`,
        `Давление топлива:         ${safeFixed(snapshot.fuel_pressure, 1)} кгс/см²`,
        `Температура ОЖ:           ${safeInt(snapshot.coolant_temp)} °C`,
        `Температура масла:        ${safeInt(snapshot.oil_temp)} °C`,
        `Напряжение бортсети:      ${safeFixed(snapshot.voltage, 1)} В`,
        `Скорость:                ${safeFixed(snapshot.speed_kmh, 1)} км/ч`,
        `Топливо (внутр.):         ${safeFixed(snapshot.fuel_level_internal, 0)} л`,
        `Топливо (наруж.):         ${safeFixed(snapshot.fuel_level_external, 0)} л`,
      ];

      this.consoleEl.textContent = lines.join("\n");
      return;
    }

    const lines = [
      "TankState",
      `battery: ${snapshot.isBatteryOn ? "ON" : "OFF"}`,
      `brake:   ${snapshot.isBrakePressed ? "PRESSED" : "RELEASED"}`,
      `gas:     ${snapshot.gasPedal ? "PRESSED" : "RELEASED"}`,
      `last:    ${this._lastAction || "-"}`,
      "",
      "Controls:",
      `manometer: ${snapshot.manometer > 0 ? snapshot.manometer + " kg/cm²" : "0 kg/cm²"}`,
      `left tank: ${snapshot.leftTank ? "ON" : "OFF"}`,
      `right tank: ${snapshot.rightTank ? "ON" : "OFF"}`,
      `BCN: ${snapshot.bcn.toUpperCase()}`,
      `shutters: ${snapshot.shutters}/4`,
      `fuel primer pumps: ${snapshot.fuelPrimerPumps}`,
      `fuel feed: ${snapshot.fuelManualFeed}%`,
      `gear: ${snapshot.gearLever}`,
      `air bleed: ${snapshot.airBleedValve ? "OPEN" : "CLOSED"}`,
      `AZR: ${snapshot.azr}`,
      `EPK: ${snapshot.epk ? "ON" : "OFF"}`,
      `HORN: ${snapshot.horn ? "ON" : "OFF"}`,
      `MZN engine: ${snapshot.mznEngine ? "ON" : "OFF"}`,
      `ammeter button: ${snapshot.ammeterButton ? "ON" : "OFF"}`,
      `left-right-tanks: ${snapshot.leftRightTanks}`,
      `spark-plug: ${snapshot.sparkPlug}`,
      `engine-start: ${snapshot.engineStart}`,
      `emergency-hatch-rotation: ${snapshot.emergencyHatchRotation ? "ON" : "OFF"}`,
      `oil-pump-gearbox: ${snapshot.oilPumpGearbox ? "ON" : "OFF"}`,
      // Note: commander-call and air-intake are now in lamps section
      `heating: ${snapshot.heating ? "ON" : "OFF"}`,
      `combined: ${snapshot.combined ? "ON" : "OFF"}`,
      `left-lights: ${snapshot.leftLights ? "ON" : "OFF"}`,
      `right-lights: ${snapshot.rightLights ? "ON" : "OFF"}`,
      `gabrate-lights: ${snapshot.gabrateLights ? "ON" : "OFF"}`,
      `lights-all: ${snapshot.lightsAll ? "ON" : "OFF"}`,
      `water-antifreeze: ${snapshot.waterAntifreeze ? "ON" : "OFF"}`,
      `gpk: ${snapshot.gpk ? "ON" : "OFF"}`,
      `bca-tca: ${snapshot.bcaTca === 0 ? "БЦН" : snapshot.bcaTca === 1 ? "OFF" : "ТДА"}`,
      `mzn-tow: ${snapshot.mznTow}`,
      `starter: ${snapshot.starter}`,
      `signal-lamps: ${snapshot.signalLamps}`,
      "",
      "Sensors:",
      `air L: ${snapshot.air_left_cylinder.toFixed(1)} kg/cm²`,
      `air R: ${snapshot.air_right_cylinder.toFixed(1)} kg/cm²`,
      `air start: ${snapshot.air_start_pressure.toFixed(1)} kg/cm²`,
      `rpm: ${snapshot.engine_rpm}`,
      `oil eng: ${snapshot.oil_pressure_engine.toFixed(1)} kg/cm²`,
      `oil kpp: ${snapshot.oil_pressure_gearbox.toFixed(1)} kg/cm²`,
      `fuel p: ${snapshot.fuel_pressure.toFixed(1)} kg/cm²`,
      `coolant: ${snapshot.coolant_temp.toFixed(0)}°C`,
      `oil t: ${snapshot.oil_temp.toFixed(0)}°C`,
      `voltage: ${snapshot.voltage.toFixed(1)} V`,
      `speed: ${snapshot.speed_kmh.toFixed(1)} km/h`,
      "",
      "Lamps:",
      `charge: ${snapshot.lamp_battery_charge ? "ON" : "OFF"}`,
      `oil alarm: ${snapshot.lamp_oil_pressure_alarm ? "ON" : "OFF"}`,
      `overheat: ${snapshot.lamp_overheat ? "ON" : "OFF"}`,
      `fuel reserve: ${snapshot.lamp_fuel_reserve ? "ON" : "OFF"}`,
      `gear: ${snapshot.lamp_gear_engaged ? "ON" : "OFF"}`,
      `cmdr call: ${snapshot.lamp_commander_call ? "ON" : "OFF"}`,
      `air intake: ${snapshot.lamp_air_intake ? "ON" : "OFF"}`,
      "",
      `hitbox:  ${this._hitboxVisible ? "VISIBLE" : "HIDDEN"}`,
      "[H] toggle",
    ];

    if (this._lastClick) {
      lines.push("");
      lines.push("Pointer (SVG coords)");
      lines.push(`client: ${this._lastClick.clientX}, ${this._lastClick.clientY}`);
      lines.push(`viewBox: ${this._lastClick.vbX}, ${this._lastClick.vbY}`);
    }

    this.consoleEl.textContent = lines.join("\n");
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

  _renderOverlays(snapshot) {
    // --- Для командира ---
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
      panelModal.classList.toggle("hidden", !snapshot.instrumentPanel);
      this.rootEl.classList.toggle("instrument-panel-open", Boolean(snapshot.instrumentPanel));
    }
    for (const el of this._overlayEls) {
      const action = el.dataset.action;
      const when = el.dataset.when;

      let shouldShow = false;

      if (action === "battery-toggle") {
        if (snapshot.isBatteryOn && when === "on") shouldShow = true;
        if (!snapshot.isBatteryOn && when === "off") shouldShow = true;
      }

      el.classList.toggle("is-visible", shouldShow);
    }

    for (const [action, el] of this._controlOverlayEls) {
      const frame = this._getControlOverlayFrame(action, snapshot);
      if (!frame) continue;

      if (el.getAttribute("src") !== frame.src) el.setAttribute("src", frame.src);
      el.classList.add("is-visible");

      const meta = this._controlOverlayMeta.get(action);
      if (!meta) continue;

      const inflate = Number.isFinite(frame.inflate) ? frame.inflate : 1.6;
      const targetW = Math.max(1, meta.bboxW * inflate);
      const targetH = Math.max(1, meta.bboxH * inflate);

      const offsetX = Number.isFinite(frame.offsetX) ? frame.offsetX : 0;
      const offsetY = Number.isFinite(frame.offsetY) ? frame.offsetY : 0;

      const left = meta.cx - targetW / 2 + offsetX;
      const top = meta.cy - targetH / 2 + offsetY;

      const x = (left / meta.vbW) * 100;
      const y = (top / meta.vbH) * 100;
      const w = (targetW / meta.vbW) * 100;
      const h = (targetH / meta.vbH) * 100;

      el.style.setProperty("--x", String(x));
      el.style.setProperty("--y", String(y));
      el.style.setProperty("--w", String(w));
      el.style.setProperty("--h", String(h));
      if (Number.isFinite(frame.z)) el.style.setProperty("--z", String(frame.z));
    }
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

  _showInstrumentPanel() {
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
