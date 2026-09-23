import { FAMILIARIZATION_DATA } from "./familiarizationData.js";

/**
 * Составление карточки вопросов и проверка ответов.
 *
 * Чистая логика без DOM: по ключу органа управления собирает набор
 * вопросов, перемешивает варианты и говорит, верен ли ответ.
 *
 * Источник случайности передаётся снаружи, чтобы поведение можно было
 * проверить: по умолчанию Math.random.
 */
const MAX_QUESTIONS_PER_CARD = 2;
const DEFAULT_INPUT_TOLERANCE = 0.1;

/** Карточка для органа, которого нет в базе — чтобы режим не спотыкался. */
function fallbackCard(key) {
  return {
    id: key,
    title: key,
    description: "Орган управления танка Т-72.",
    questions: [
      {
        id: "q1",
        type: "choice",
        text: `Что это за орган управления (${key})?`,
        options: [
          "Орган управления систем танка",
          "Резервный переключатель",
          "Контрольный индикатор",
        ],
        correct: 0,
        explanation: "Элемент отделения управления механика-водителя танка Т-72.",
      },
    ],
  };
}

/** Перемешивание Фишера — Йетса, на месте. */
function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Собирает карточку: один-два вопроса из базы в случайном порядке.
 * Если вопросов всего два или меньше, задаются все.
 */
function buildCard(key, rng = Math.random) {
  const data = FAMILIARIZATION_DATA[key] || fallbackCard(key);
  const all = (data.questions || []).map((question) => ({ ...question }));

  const count =
    all.length <= MAX_QUESTIONS_PER_CARD
      ? all.length
      : (rng() < 0.5 ? 1 : MAX_QUESTIONS_PER_CARD);

  return { ...data, questions: shuffle(all, rng).slice(0, count) };
}

/**
 * Варианты ответа в перемешанном порядке, с пометкой правильного.
 * Порядок запоминается в самом вопросе: при возврате к нему варианты
 * не должны прыгать.
 */
function renderedOptions(question, rng = Math.random) {
  if (!question._renderedOptions) {
    question._renderedOptions = shuffle(
      question.options.map((opt, idx) => ({ opt, isCorrect: idx === question.correct })),
      rng,
    );
  }
  return question._renderedOptions;
}

/**
 * Верен ли ответ.
 * @param {object} question вопрос из карточки
 * @param {{choice?: number, value?: number}} answer выбор варианта или введённое число
 */
function isAnswerCorrect(question, answer) {
  if (question.type === "choice") {
    return Boolean(question._renderedOptions?.[answer.choice]?.isCorrect);
  }

  if (question.type !== "input") return false;

  const value = answer.value;
  if (!Number.isFinite(value)) return false;

  // Числовой ответ засчитывается либо по диапазону, либо с допуском
  if (typeof question.min === "number" && typeof question.max === "number") {
    return value >= question.min && value <= question.max;
  }

  return Math.abs(value - question.expected) <= (question.tolerance || DEFAULT_INPUT_TOLERANCE);
}

/** Сколько всего органов управления можно изучить. */
function totalElements() {
  return Object.keys(FAMILIARIZATION_DATA).length;
}

export { buildCard, renderedOptions, isAnswerCorrect, totalElements, shuffle };
