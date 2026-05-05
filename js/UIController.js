import { CONTROL_OVERLAY_DEFS } from './ControlOverlayDefs.js';

class UIController {
  constructor({ rootEl, consoleEl, state, isDebug = true }) {
    this.rootEl = rootEl;
    this.consoleEl = consoleEl;
    this.state = state;

    this.isDebug = Boolean(isDebug);

    this._overlayLayerEl = this.rootEl.querySelector(".overlay-layer");
    this._overlayEls = Array.from(this.rootEl.querySelectorAll(".overlay[data-action][data-when]"));
    this._controlOverlayEls = new Map();
    this._controlOverlayMeta = new Map();
    this._svgEl = this.rootEl.querySelector("svg.hitbox-layer");
    this._lastClick = null;
    this._lastAction = null;
    this._touchHeldAction = null;
    this._hitboxVisible = this.isDebug;
    this._labelGroup = null;
    this._controlOverlayDefs = CONTROL_OVERLAY_DEFS;

    this._wireEvents();

    this._ensureCabinControlOverlays();
    this._ensureInstrumentPanelControlOverlays();
    if (this.isDebug) this._ensureHitboxLabels();
    this._syncHitboxVisibility();

    this.state.subscribe((snapshot) => {
      this._render(snapshot);
    });

    this._render(this.state.getSnapshot());
  }

  _ensureHitboxLabels() {
    // Process all SVG hitbox layers
    const svgLayers = this.rootEl.querySelectorAll("svg.hitbox-layer");
    
    svgLayers.forEach(svgEl => {
      const existing = svgEl.querySelector("g.hitbox-labels");
      if (existing) existing.remove();

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "hitbox-labels");

      const hitboxes = Array.from(svgEl.querySelectorAll(".hitbox"));
      for (const hitbox of hitboxes) {
        const label = (hitbox.dataset.label || hitbox.dataset.action || "hitbox").trim() || "hitbox";
        const pointsAttr = hitbox.getAttribute("points") || "";
        const points = this._parsePolygonPoints(pointsAttr);
        if (points.length < 3) continue;

        const c = this._polygonCentroid(points);
        if (!c) continue;

        const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textEl.setAttribute("class", "hitbox-label");
        textEl.setAttribute("x", String(c.x));
        textEl.setAttribute("y", String(c.y));
        textEl.setAttribute("text-anchor", "middle");
        textEl.setAttribute("dominant-baseline", "middle");
        textEl.textContent = label;
        group.appendChild(textEl);
      }

      svgEl.appendChild(group);
    });
  }

  _parsePolygonPoints(pointsAttr) {
    return pointsAttr
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(","))
      .map(([x, y]) => ({ x: Number(x), y: Number(y) }))
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  }

  _polygonCentroid(points) {
    let area2 = 0;
    let cx = 0;
    let cy = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const p0 = points[i];
      const p1 = points[(i + 1) % n];
      const cross = p0.x * p1.y - p1.x * p0.y;
      area2 += cross;
      cx += (p0.x + p1.x) * cross;
      cy += (p0.y + p1.y) * cross;
    }

    if (area2 === 0) return null;
    const area = area2 / 2;
    return { x: Math.round(cx / (6 * area)), y: Math.round(cy / (6 * area)) };
  }

  _polygonBBox(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    return { minX, minY, maxX, maxY };
  }

  _ensureCabinControlOverlays() {
    if (!this._overlayLayerEl || !this._svgEl) return;

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
      const points = this._parsePolygonPoints(pointsAttr);
      if (points.length < 3) continue;

      const bbox = this._polygonBBox(points);
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

      this._overlayLayerEl.appendChild(img);
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

    const overlayLayerEl = Array.from(panelStageEl.children).find((el) => el.classList?.contains("overlay-layer")) || null;
    const panelSvg = panelStageEl.querySelector("svg.instrument-panel-hitbox-layer");
    if (!overlayLayerEl || !panelSvg) return;

    // Clean old overlays for the panel
    for (const [action, el] of this._controlOverlayEls) {
      if (el.closest(".instrument-panel-stage")) el.remove();
    }

    const vb = panelSvg.viewBox.baseVal;
    const vbW = vb?.width || 1920;
    const vbH = vb?.height || 1080;

    const hitboxes = Array.from(panelSvg.querySelectorAll(".hitbox[data-action]"));
    for (const hitbox of hitboxes) {
      const action = hitbox.dataset.action;
      if (!action) continue;
      const def = this._controlOverlayDefs[action];
      if (!def) continue;

      const pointsAttr = hitbox.getAttribute("points") || "";
      const points = this._parsePolygonPoints(pointsAttr);
      if (points.length < 3) continue;

      const bbox = this._polygonBBox(points);
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

      overlayLayerEl.appendChild(img);
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
          this.state.toggleBcn();
          break;
        case "shutters":
          this.state.toggleShutters();
          break;
        case "right-tank":
          this.state.toggleRightTank();
          break;
        case "fuel-primer-lever":
          this.state.toggleFuelPrimerLever();
          break;
        case "fuel-manual-feed":
          // Increase fuel feed by 10% on click
          this.state.adjustFuelManualFeed(event.shiftKey ? -10 : 10);
          break;
        case "gear-lever":
          this.state.cycleGearLever();
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
        case "commander-call":
          this.state.toggleCommanderCall();
          break;
        case "air-intake":
          this.state.toggleAirIntake();
          break;
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
          this.state.toggleBcaTca();
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
      }
    });

    this.rootEl.addEventListener("mousedown", (event) => {
      const el = event.target.closest(".hitbox, .overlay-control");
      if (!el) return;

      const action = el.dataset.action;
      this._lastAction = action || null;
      if (action === "brake-pedal") {
        event.preventDefault();
        this.state.setBrakePressed(true);
      } else if (action === "gas-pedal") {
        event.preventDefault();
        this.state.setGasPedal(true);
      }
    });

    const releasePedals = (event) => {
      const el = event.target.closest?.(".hitbox, .overlay-control");
      const action = el?.dataset?.action;

      if (action === "brake-pedal" || action === "gas-pedal") {
        event.preventDefault();
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
          return;
        }

        if (action === "brake-pedal") {
          event.preventDefault();
          this._touchHeldAction = "brake-pedal";
          this.state.setBrakePressed(true);
        } else if (action === "gas-pedal") {
          event.preventDefault();
          this._touchHeldAction = "gas-pedal";
          this.state.setGasPedal(true);
        }
      },
      { passive: false }
    );

    window.addEventListener(
      "touchend",
      (event) => {
        if (this._touchHeldAction) event.preventDefault();
        this.state.setBrakePressed(false);
        this.state.setGasPedal(false);
        this._touchHeldAction = null;
      },
      { passive: false }
    );

    // Mouse events for manometer
    this.rootEl.addEventListener("mouseover", (event) => {
      const hitbox = event.target.closest(".hitbox");
      if (!hitbox) return;
      
      const action = hitbox.dataset.action;
      if (action === "manometer") {
        const snapshot = this.state.getSnapshot();
        this.state.setManometer(Math.round(Number(snapshot.air_start_pressure) || 0));
      }
    });

    this.rootEl.addEventListener("mouseout", (event) => {
      const hitbox = event.target.closest(".hitbox");
      if (!hitbox) return;
      
      const action = hitbox.dataset.action;
      if (action === "manometer") {
        // Reset pressure when not hovering
        this.state.setManometer(0);
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
      backButton.addEventListener("click", () => {
        this.state.setInstrumentPanelOpen(false);
      });
    }
  }

  _render(snapshot) {
    this._renderOverlays(snapshot);

    const panelModal = document.getElementById("instrumentPanelModal");
    if (panelModal) {
      panelModal.classList.toggle("hidden", !snapshot.instrumentPanel);
      this.rootEl.classList.toggle("instrument-panel-open", Boolean(snapshot.instrumentPanel));
    }

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
        `Уровень топлива:          ${safeFixed(snapshot.fuel_level, 0)} %`,
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
      `BCN: ${snapshot.bcn ? "ON" : "OFF"}`,
      `shutters: ${snapshot.shutters ? "OPEN" : "CLOSED"}`,
      `fuel primer: ${snapshot.fuelPrimerLever ? "ON" : "OFF"}`,
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
      `commander-call: ${snapshot.commanderCall ? "ON" : "OFF"}`,
      `air-intake: ${snapshot.airIntake ? "ON" : "OFF"}`,
      `heating: ${snapshot.heating ? "ON" : "OFF"}`,
      `combined: ${snapshot.combined ? "ON" : "OFF"}`,
      `left-lights: ${snapshot.leftLights ? "ON" : "OFF"}`,
      `right-lights: ${snapshot.rightLights ? "ON" : "OFF"}`,
      `gabrate-lights: ${snapshot.gabrateLights ? "ON" : "OFF"}`,
      `lights-all: ${snapshot.lightsAll ? "ON" : "OFF"}`,
      `water-antifreeze: ${snapshot.waterAntifreeze ? "ON" : "OFF"}`,
      `gpk: ${snapshot.gpk ? "ON" : "OFF"}`,
      `bca-tca: ${snapshot.bcaTca ? "ON" : "OFF"}`,
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
      "",
      `hitbox:  ${this._hitboxVisible ? "VISIBLE" : "HIDDEN"}`,
      "[H] toggle"
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
    svgLayers.forEach(svgEl => {
      svgEl.classList.toggle("labels-visible", this._hitboxVisible);
    });
  }

  _showInstrumentPanel() {
    const modal = document.getElementById("instrumentPanelModal");
    if (modal) {
      modal.classList.remove("hidden");
      this.rootEl.classList.add("instrument-panel-open");
    }
  }
}

export { UIController };
