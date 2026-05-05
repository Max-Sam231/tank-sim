import { getScenarioDefinition } from "./TrainingScenarios.js";

class TrainingEngine {
  constructor({ state }) {
    this.state = state;
    this._scenario = null;
    this._steps = [];
    this._done = new Map();
    this._activeIndex = 0;
    this._gateBaseline = new Map();
    this._armed = new Map();

    this.state.subscribe((snapshot) => {
      this._onSnapshot(snapshot);
    });

    this._onSnapshot(this.state.getSnapshot());
  }

  setGoal({ startMethod, ambientTempC }) {
    const def = getScenarioDefinition({ startMethod, ambientTempC });
    this._scenario = def;
    this._steps = Array.isArray(def?.steps) ? def.steps : [];
    this._done = new Map();
    this._gateBaseline = new Map();
    this._armed = new Map();
    for (const step of this._steps) this._done.set(step.id, false);
    this._activeIndex = 0;

    this._primeActiveGateBaseline(this.state.getSnapshot());
    this._onSnapshot(this.state.getSnapshot());
  }

  _primeActiveGateBaseline(snapshot) {
    const step = this._steps[this._activeIndex] || null;
    if (!step) return;
    const keys = Array.isArray(step.gateKeys) ? step.gateKeys : [];
    const base = {};
    for (const key of keys) base[key] = snapshot[key];
    this._gateBaseline.set(step.id, base);
    this._armed.set(step.id, false);
  }

  _hasGateChanged(step, snapshot) {
    const keys = Array.isArray(step.gateKeys) ? step.gateKeys : [];
    if (keys.length === 0) return false;
    const base = this._gateBaseline.get(step.id);
    if (!base) return false;
    for (const key of keys) {
      if (snapshot[key] !== base[key]) return true;
    }
    return false;
  }

  _isArmed(step) {
    return Boolean(this._armed.get(step.id));
  }

  _arm(step) {
    if (this._armed.get(step.id) === true) return;
    this._armed.set(step.id, true);
  }

  getScenarioTitle() {
    return this._scenario?.title || "";
  }

  getReport() {
    const items = [];
    for (let i = 0; i < this._steps.length; i++) {
      const step = this._steps[i];
      items.push({
        id: step.id,
        title: step.title,
        done: Boolean(this._done.get(step.id)),
        index: i,
      });
    }

    return {
      scenarioId: this._scenario?.id || null,
      scenarioTitle: this._scenario?.title || "",
      items,
    };
  }

  _isStepDone(stepId) {
    return Boolean(this._done.get(stepId));
  }

  _markDone(stepId) {
    if (!this._done.has(stepId)) return false;
    if (this._done.get(stepId) === true) return false;
    this._done.set(stepId, true);
    return true;
  }

  _onSnapshot(snapshot) {
    if (!this._scenario) return;

    while (this._activeIndex < this._steps.length) {
      const step = this._steps[this._activeIndex];
      if (this._isStepDone(step.id)) {
        this._activeIndex += 1;
        continue;
      }

      const fn = step.completeWhen;
      const ok = typeof fn === "function" ? Boolean(fn(snapshot)) : false;

      if (!Boolean(step.auto) && this._hasGateChanged(step, snapshot)) {
        this._arm(step);
      }

      const ready = Boolean(step.auto) ? true : this._isArmed(step);
      const shouldComplete = ok && ready;
      if (!shouldComplete) break;

      this._markDone(step.id);
      this._activeIndex += 1;

      this._primeActiveGateBaseline(snapshot);
    }
  }
}

export { TrainingEngine };
