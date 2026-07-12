import { getAirStart20CScenario } from "./air-start.js";
import { getPreparationToStart20CScenario } from "./preparation-to-start.js";

function getScenarioDefinition({ startMethod, ambientTempC, fuelType }) {
  const method = String(startMethod || "");
  const t = Math.round(Number(ambientTempC));
  const fuel = String(fuelType || "diesel");

  if (method === "prestart-preparation" && t === 20 && fuel === "diesel") {
    return getPreparationToStart20CScenario();
  }

  if (method === "air-start" && t === 20 && fuel === "diesel") {
    return getAirStart20CScenario();
  }

  return null;
}

export { getScenarioDefinition };
