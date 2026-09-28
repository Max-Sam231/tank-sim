import { FAMILIARIZATION_DATA } from "./familiarizationData.js";

/**
 * Карточка ознакомления: что это за орган и для чего он.
 *
 * В отличие от проверки здесь ничего не спрашивают — курсант впервые
 * знакомится с кабиной, и задача карточки назвать орган и объяснить
 * его назначение. Вопросы по тому же элементу задаются отдельно,
 * в режиме проверки.
 */

/** Описание для органа, которого нет в базе — чтобы режим не спотыкался. */
function fallbackEntry(key) {
  return {
    id: key,
    title: key,
    description: "Орган управления отделения управления механика-водителя танка Т-72.",
  };
}

/**
 * Что показать по органу управления.
 * @returns {{id: string, title: string, description: string}}
 */
function getStudyEntry(key) {
  const entry = FAMILIARIZATION_DATA[key] || fallbackEntry(key);

  return {
    id: entry.id || key,
    title: entry.title,
    description: entry.description,
  };
}

/** Разметка карточки ознакомления. */
function studyCardHtml(entry) {
  return `<div class="fam-study-description">${entry.description}</div>`;
}

export { getStudyEntry, studyCardHtml };
