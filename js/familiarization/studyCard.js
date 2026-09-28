import { FAMILIARIZATION_DATA } from "./familiarizationData.js";

/**
 * Карточка ознакомления: что это за орган, как устроен и какие нормы.
 *
 * В отличие от проверки здесь ничего не спрашивают — курсант впервые
 * знакомится с кабиной, и задача карточки объяснить назначение.
 *
 * Одного описания для этого мало: в базе оно занимает строку. Зато
 * пояснения к вопросам несут всю фактуру — марки приборов, пределы
 * шкал, эксплуатационные нормы. В проверке они показываются по одному
 * после ответа, а здесь собираются вместе и составляют суть карточки.
 */

/** Описание для органа, которого нет в базе — чтобы режим не спотыкался. */
function fallbackEntry(key) {
  return {
    id: key,
    title: key,
    description: "Орган управления отделения управления механика-водителя танка Т-72.",
    questions: [],
  };
}

/** Убирает повторы, сохраняя порядок: пояснения местами пересказывают друг друга. */
function uniqueFacts(questions) {
  const seen = new Set();
  const facts = [];

  for (const question of questions) {
    const text = String(question.explanation || "").trim();
    if (!text || seen.has(text)) continue;

    seen.add(text);
    facts.push(text);
  }

  return facts;
}

/**
 * Что показать по органу управления.
 * @returns {{id: string, title: string, description: string, facts: string[]}}
 */
function getStudyEntry(key) {
  const entry = FAMILIARIZATION_DATA[key] || fallbackEntry(key);

  return {
    id: entry.id || key,
    title: entry.title,
    description: entry.description,
    facts: uniqueFacts(entry.questions || []),
  };
}

/** Разметка карточки ознакомления. */
function studyCardHtml(entry) {
  const description = `<div class="fam-study-description">${entry.description}</div>`;

  if (entry.facts.length === 0) return description;

  const facts = entry.facts.map((text) => `<li>${text}</li>`).join("");

  return `
    ${description}
    <div class="fam-study-section">Устройство и нормы</div>
    <ul class="fam-study-facts">${facts}</ul>
  `;
}

export { getStudyEntry, studyCardHtml };
