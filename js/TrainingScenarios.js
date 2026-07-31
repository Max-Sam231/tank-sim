import { getAirStart20CScenario } from "./scenarios/air-start.js";
import { getPreparationToStart20CScenario } from "./scenarios/preparation-to-start.js";
import { getElectricStart20CScenario } from "./scenarios/electric-start.js";
import { getCombinedStart20CScenario } from "./scenarios/combined-start.js";
import { getHeaterWarmupScenario } from "./scenarios/heater-warmup.js";

function getScenarioDefinition({ startMethod, ambientTempC, fuelType }) {
  const method = String(startMethod || "");
  const t = Math.round(Number(ambientTempC));
  const fuel = String(fuelType || "diesel");

  if (method === "heater-warmup") {
    return getHeaterWarmupScenario(t);
  }

  if (method === "prestart-preparation" && t === 20 && fuel === "diesel") {
    return getPreparationToStart20CScenario();
  }

  if (method === "air-start" && t === 20 && fuel === "diesel") {
    return getAirStart20CScenario();
  }

  if (method === "electric-start" && t === 20 && fuel === "diesel") {
    return getElectricStart20CScenario();
  }

  if (method === "combined-start" && t === 20 && fuel === "diesel") {
    return getCombinedStart20CScenario();
  }

  return null;
}

export { getScenarioDefinition };

