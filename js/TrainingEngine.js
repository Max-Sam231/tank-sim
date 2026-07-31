import { getScenarioDefinition } from "./TrainingScenarios.js";

class TrainingEngine {
  constructor({ state }) {
    this.state = state;
    this._scenario = null;
    this._stages = [];
    this._steps = [];
    this._done = new Map();
    this._activeStageIndex = 0;
    this._activeIndex = 0;
    this._gateBaseline = new Map();
    this._armed = new Map();

    this.state.subscribe((snapshot) => {
      this._onSnapshot(snapshot);
    });

    this._onSnapshot(this.state.getSnapshot());
  }

  setGoal({ startMethod, ambientTempC, fuelType }) {
    const def = getScenarioDefinition({ startMethod, ambientTempC, fuelType });
    this._scenario = def;
    this._stages = Array.isArray(def?.stages) ? def.stages : [];
    this._steps = [];
    
    for (const stage of this._stages) {
      if (Array.isArray(stage.steps)) {
        this._steps.push(...stage.steps);
      }
    }

    // For backwards compatibility with old scenarios that use a flat .steps array:
    if (this._stages.length === 0 && Array.isArray(def?.steps)) {
      this._steps = def.steps;
      this._stages = [{ id: "default", strict: true, steps: def.steps }];
    }

    this._done = new Map();
    this._gateBaseline = new Map();
    this._armed = new Map();
    for (const step of this._steps) this._done.set(step.id, false);
    this._activeStageIndex = 0;
    this._activeIndex = 0;

    this._onSnapshot(this.state.getSnapshot());
  }

  _primeStepBaseline(step, snapshot) {
    if (!this._gateBaseline.has(step.id)) {
      const keys = Array.isArray(step.gateKeys) ? step.gateKeys : [];
      const base = {};
      for (const key of keys) base[key] = snapshot[key];
      this._gateBaseline.set(step.id, base);
      this._armed.set(step.id, false);
    }
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
    if (!this._scenario || this._activeStageIndex >= this._stages.length) return;

    let changedAny = true;

    while (changedAny) {
      changedAny = false;
      const currentStage = this._stages[this._activeStageIndex];
      if (!currentStage) break;

      if (currentStage.strict === false) {
        // Non-strict: check all incomplete steps in this stage
        for (const step of currentStage.steps) {
          if (this._isStepDone(step.id)) continue;

          this._primeStepBaseline(step, snapshot);

          if (!Boolean(step.auto) && this._hasGateChanged(step, snapshot)) {
            this._arm(step);
          }

          const fn = step.completeWhen;
          const ok = typeof fn === "function" ? Boolean(fn(snapshot)) : false;
          const ready = true; // Complete immediately when condition is met

          if (ok && ready) {
            this._markDone(step.id);
            changedAny = true;
          }
        }
      } else {
        // Strict: only check the first incomplete step in this stage
        const step = currentStage.steps.find(s => !this._isStepDone(s.id));
        if (step) {
          this._primeStepBaseline(step, snapshot);

          if (!Boolean(step.auto) && this._hasGateChanged(step, snapshot)) {
            this._arm(step);
          }

          const fn = step.completeWhen;
          const ok = typeof fn === "function" ? Boolean(fn(snapshot)) : false;
          const ready = true; // Complete immediately when condition is met

          if (ok && ready) {
            this._markDone(step.id);
            changedAny = true;
          }
        }
      }

      // If all steps in current stage are completed, transition to next stage
      const isStageDone = currentStage.steps.every(s => this._isStepDone(s.id));
      if (isStageDone) {
        this._activeStageIndex += 1;
        changedAny = true;
      }
    }

    // Update _activeIndex to point to the first incomplete step in the flat array
    let nextActive = 0;
    while (nextActive < this._steps.length && this._isStepDone(this._steps[nextActive].id)) {
      nextActive++;
    }
    this._activeIndex = nextActive;
  }
}


export { TrainingEngine };
