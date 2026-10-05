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
 * @returns {{id: string, title: string, description: string, facts: string[], source?: string, sources?: Array<{name: string, description: string, reference: string}>}}
 */
function getStudyEntry(key) {
  const entry = FAMILIARIZATION_DATA[key] || fallbackEntry(key);

  // Если есть несколько источников, используем первый по умолчанию
  let description = entry.description;
  let source = entry.source;

  // Если есть sources, берем описание из первого источника
  if (entry.sources && entry.sources.length > 0) {
    description = entry.sources[0].description;
    source = entry.sources[0].reference;
  }

  return {
    id: entry.id || key,
    title: entry.title,
    description,
    facts: uniqueFacts(entry.questions || []),
    source,
    sources: entry.sources || null,
  };
}

/** Разметка карточки ознакомления. */
function studyCardHtml(entry) {
  const description = `<div class="fam-study-description">${entry.description}</div>`;

  let factsSection = "";
  if (entry.facts.length > 0) {
    const facts = entry.facts.map((text) => `<li>${text}</li>`).join("");
    factsSection = `
      <div class="fam-study-section">Устройство и нормы</div>
      <ul class="fam-study-facts">${facts}</ul>
    `;
  }

  let sourceSection = "";
  let sourceSwitcher = "";

  if (entry.sources && entry.sources.length > 1) {
    // Переключатель между источниками
    const sourceButtons = entry.sources.map((src, idx) => `
      <button class="fam-source-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}">
        ${src.name}
      </button>
    `).join("");

    sourceSwitcher = `
      <div class="fam-source-switcher">
        <span class="fam-source-label">Источник:</span>
        <div class="fam-source-buttons">${sourceButtons}</div>
      </div>
    `;

    // Показываем ссылку на активный источник
    const activeSource = entry.sources[0];
    sourceSection = `<div class="fam-study-source">${activeSource.reference}</div>`;
  } else if (entry.source) {
    sourceSection = `<div class="fam-study-source">Источник: ${entry.source}</div>`;
  }

  return `
    ${description}
    ${factsSection}
    ${sourceSwitcher}
    ${sourceSection}
  `;
}

export { getStudyEntry, studyCardHtml };
