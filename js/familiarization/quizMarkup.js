/**
 * Разметка режима ознакомления: верхняя панель прогресса, карточка
 * с вопросом и содержимое самого вопроса.
 */

/** Панель прогресса поверх сцены. */
const TOP_BAR_HTML = `
  <div class="fam-info">
    <span class="fam-badge">ОЗНАКОМЛЕНИЕ</span>
    <span class="fam-title">Изучение кабины и приборов Т-72</span>
  </div>
  <div class="fam-progress-box">
    <div class="fam-progress-text">
      Изучено: <strong id="famProgressCount">0</strong> / <span id="famTotalCount">0</span>
      (<span id="famProgressPercent">0%</span>)
    </div>
    <div class="fam-progress-track">
      <div class="fam-progress-fill" id="famProgressFill" style="width: 0%"></div>
    </div>
  </div>
  <button class="fam-exit-btn" id="famExitBtn" type="button">← В меню</button>
`;

/** Карточка вопроса. */
const MODAL_HTML = `
  <div class="fam-modal-backdrop"></div>
  <div class="fam-modal-card">
    <div class="fam-modal-header">
      <div class="fam-modal-title-group">
        <span class="fam-modal-tag" id="famModalTag">ПРИБОР</span>
        <h3 class="fam-modal-title" id="famModalTitle">Название элемента</h3>
      </div>
      <button class="fam-modal-close-btn" id="famModalClose" type="button">&times;</button>
    </div>
    <div class="fam-modal-body" id="famModalBody"></div>
    <div class="fam-modal-footer">
      <button class="fam-modal-btn" id="famModalSubmitBtn" type="button">Проверить ответ</button>
      <button class="fam-modal-btn fam-btn-next hidden" id="famModalNextBtn" type="button">Продолжить</button>
    </div>
  </div>
`;

/** Варианты ответа. */
function optionsHtml(options) {
  const cards = options
    .map(
      (item, idx) => `
        <div class="fam-option-card" data-index="${idx}">
          <div class="fam-option-radio"></div>
          <div class="fam-option-label">${item.opt}</div>
        </div>
      `,
    )
    .join("");

  return `<div class="fam-options-list">${cards}</div>`;
}

/** Поле для числового ответа. */
function numberInputHtml(unit) {
  return `
    <div class="fam-input-group">
      <label class="fam-input-label">Введите числовое значение ${unit ? `(${unit})` : ""}:</label>
      <div class="fam-input-row">
        <input type="number" step="any" class="fam-number-input" id="famNumberInput" placeholder="0" />
        ${unit ? `<span class="fam-input-unit">${unit}</span>` : ""}
      </div>
    </div>
  `;
}

/**
 * Тело карточки: заголовок вопроса, поле ответа и место под отзыв.
 * @param {object} question вопрос
 * @param {Array} options перемешанные варианты (для вопросов с выбором)
 * @param {{index: number, total: number}} position номер вопроса в карточке
 */
function questionHtml(question, options, { index, total }) {
  const header = `
    <div class="fam-question-header">
      <span class="fam-question-counter">Вопрос ${index + 1} из ${total}</span>
      <div class="fam-question-text">${question.text}</div>
    </div>
  `;

  let answerArea = "";
  if (question.type === "choice") answerArea = optionsHtml(options);
  else if (question.type === "input") answerArea = numberInputHtml(question.unit);

  return `${header}${answerArea}<div class="fam-feedback-card hidden" id="famFeedbackCard"></div>`;
}

/** Отзыв на ответ: верно или неверно, с пояснением из базы. */
function feedbackHtml(question, isCorrect) {
  return `
    <div class="fam-feedback-title">${isCorrect ? "Верно!" : "Неверно"}</div>
    <div class="fam-feedback-desc">${question.explanation}</div>
  `;
}

export { TOP_BAR_HTML, MODAL_HTML, questionHtml, feedbackHtml };
