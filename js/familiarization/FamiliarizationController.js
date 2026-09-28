import { buildCard, renderedOptions, isAnswerCorrect, totalElements } from "./quiz.js";
import { TOP_BAR_HTML, MODAL_HTML, questionHtml, feedbackHtml } from "./quizMarkup.js";
import { markStudied, restoreMarks, clearMarks } from "./studiedMarks.js";
import { getStudyEntry, studyCardHtml } from "./studyCard.js";

/**
 * Режим ознакомления: клик по органу управления открывает карточку
 * вместо того, чтобы этот орган переключить.
 *
 * Два режима. «Изучение» рассказывает, что это за орган и зачем он —
 * с ним курсант знакомится с кабиной впервые. «Проверка» по тем же
 * органам задаёт вопросы. Прогресс у каждого свой.
 *
 * Перехват кликов идёт на фазе погружения по всему окну — так до
 * UIController они не доходят и состояние танка не меняется.
 * Изученный орган гаснет и больше не отвечает на клики.
 */
const RESTORE_DELAY_MS = 60;
const INPUT_FOCUS_DELAY_MS = 50;

/** Элементы, по которым клик пропускается дальше без карточки. */
const PASSTHROUGH_SELECTORS = ["#famTopBar", "#famModal", "[data-action='exit_to_hangar']"];

/** Что считается органом управления при клике по сцене. */
const INTERACTIVE_SELECTOR = ".hitbox, .overlay-control, [data-gauge], [data-action]";

/** Режимы работы. */
const MODE_STUDY = "study";
const MODE_QUIZ = "quiz";

const MODE_TITLES = {
  [MODE_STUDY]: "Изучение кабины и приборов Т-72",
  [MODE_QUIZ]: "Проверка: кабина и приборы Т-72",
};

const MODES = { MODE_STUDY, MODE_QUIZ };

export class FamiliarizationController {
  constructor({ app, onExit }) {
    this.app = app;
    this.onExit = onExit;

    this.isActive = false;
    this.mode = MODE_STUDY;

    // Прогресс раздельный: изучил — не значит сдал проверку
    this.progress = {
      [MODE_STUDY]: new Set(),
      [MODE_QUIZ]: new Set(),
    };

    this.currentKey = null;
    this.currentCard = null;
    this.currentQuestionIdx = 0;
    this.currentTargetEl = null;
    this.answer = {};
    this.isAnswered = false;

    this._captureHandler = this._handleCaptureClick.bind(this);

    this._initDOM();
  }

  /** Ключи, пройденные в текущем режиме. */
  get studiedKeys() {
    return this.progress[this.mode];
  }

  /** Совместимость с прежним именем поля. */
  get testedElements() {
    return this.studiedKeys;
  }

  get isStudyMode() {
    return this.mode === MODE_STUDY;
  }

  // --- Разметка ------------------------------------------------------------

  /** Создаёт элемент по id, если его ещё нет на странице. */
  _ensureElement(id, className, html, attributes = {}) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.className = className;
      for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
      el.innerHTML = html;
      document.body.appendChild(el);
    }
    return el;
  }

  _initDOM() {
    this.topBarEl = this._ensureElement("famTopBar", "fam-top-bar hidden", TOP_BAR_HTML);
    this.modalEl = this._ensureElement("famModal", "fam-modal hidden", MODAL_HTML, {
      role: "dialog",
      "aria-modal": "true",
    });

    document.getElementById("famExitBtn")?.addEventListener("click", () => {
      this.stop();
      this.onExit?.();
    });

    document.getElementById("famModalClose")?.addEventListener("click", () => this.closeModal());
    document
      .querySelector("#famModal .fam-modal-backdrop")
      ?.addEventListener("click", () => this.closeModal());

    this.submitBtn = document.getElementById("famModalSubmitBtn");
    this.nextBtn = document.getElementById("famModalNextBtn");

    this.submitBtn?.addEventListener("click", () => this._handleSubmitAnswer());
    this.nextBtn?.addEventListener("click", () => this._handleNextStep());
  }

  // --- Жизненный цикл режима ----------------------------------------------

  /**
   * @param {"study"|"quiz"} [mode] изучение или проверка
   */
  start(mode = MODE_STUDY) {
    this.mode = mode === MODE_QUIZ ? MODE_QUIZ : MODE_STUDY;

    this.isActive = true;
    this.studiedKeys.clear();
    clearMarks();

    document.body.classList.add("familiarization-mode-active");
    this.topBarEl.classList.remove("hidden");

    const titleEl = this.topBarEl.querySelector(".fam-title");
    if (titleEl) titleEl.textContent = MODE_TITLES[this.mode];

    const badgeEl = this.topBarEl.querySelector(".fam-badge");
    if (badgeEl) badgeEl.textContent = this.isStudyMode ? "ОЗНАКОМЛЕНИЕ" : "ПРОВЕРКА";

    const totalEl = document.getElementById("famTotalCount");
    if (totalEl) totalEl.textContent = String(totalElements());

    this._updateProgress();

    window.addEventListener("click", this._captureHandler, true);
  }

  stop() {
    this.isActive = false;
    this.closeModal();

    document.body.classList.remove("familiarization-mode-active");
    this.topBarEl?.classList.add("hidden");
    clearMarks();

    window.removeEventListener("click", this._captureHandler, true);
  }

  // --- Перехват кликов по сцене -------------------------------------------

  _handleCaptureClick(event) {
    if (!this.isActive) return;

    if (PASSTHROUGH_SELECTORS.some((selector) => event.target.closest(selector))) return;

    // Возврат из приборной панели: спрайты пересоздаются, пометки нужно вернуть
    if (event.target.closest("#instrumentPanelBack")) {
      setTimeout(() => this.restoreHighlights(), RESTORE_DELAY_MS);
      return;
    }

    // Открыть саму панель приборов разрешаем — там свои органы управления
    const isPanelOpen = document
      .getElementById("scene")
      ?.classList.contains("instrument-panel-open");
    if (event.target.closest('[data-action="instrument-panel"]') && !isPanelOpen) {
      setTimeout(() => this.restoreHighlights(), RESTORE_DELAY_MS);
      return;
    }

    const targetEl = event.target.closest(INTERACTIVE_SELECTOR);
    const key = targetEl?.dataset.gauge || targetEl?.dataset.action;
    if (!key) return;

    // Орган не должен сработать: в этом режиме он изучается, а не включается
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (this.studiedKeys.has(key)) return;

    this.openCard(key, targetEl);
  }

  // --- Карточка вопросов ---------------------------------------------------

  /** Открывает карточку по органу — описание или вопросы, смотря по режиму. */
  openCard(key, targetEl = null) {
    this.currentKey = key;
    this.currentTargetEl = targetEl;
    this.currentQuestionIdx = 0;
    this.currentCard = this.isStudyMode ? null : buildCard(key);

    if (this.isStudyMode) this._renderStudyCard();
    else this._renderModal();

    this.modalEl.classList.remove("hidden");
  }

  /** Совместимость: прежнее имя метода открывало карточку вопросов. */
  openQuiz(key, targetEl = null) {
    this.openCard(key, targetEl);
  }

  /** Карточка изучения: название, тип и описание органа. */
  _renderStudyCard() {
    const entry = getStudyEntry(this.currentKey);

    const tagEl = document.getElementById("famModalTag");
    const titleEl = document.getElementById("famModalTitle");
    const bodyEl = document.getElementById("famModalBody");

    if (tagEl) tagEl.textContent = this._elementTag(entry.id);
    if (titleEl) titleEl.textContent = entry.title;
    if (bodyEl) bodyEl.innerHTML = studyCardHtml(entry);

    // Проверять нечего: карточка закрывается одной кнопкой
    this.submitBtn.classList.add("hidden");
    this.nextBtn.textContent = "Понятно";
    this.nextBtn.classList.remove("hidden");
  }

  /** Приборы щитка и органы управления подписаны по-разному. */
  _elementTag(id) {
    return String(id).startsWith("gauge-") ? "ПРИБОР КИП" : "ОРГАН УПРАВЛЕНИЯ";
  }

  closeModal() {
    this.modalEl.classList.add("hidden");
    this.currentKey = null;
    this.currentCard = null;
    this.currentQuestionIdx = 0;
    this.answer = {};
    this.isAnswered = false;
  }

  get _currentQuestion() {
    return this.currentCard?.questions?.[this.currentQuestionIdx];
  }

  _renderModal() {
    if (!this.currentCard) return;

    const question = this._currentQuestion;

    const tagEl = document.getElementById("famModalTag");
    const titleEl = document.getElementById("famModalTitle");
    if (tagEl) tagEl.textContent = this._elementTag(this.currentCard.id);
    if (titleEl) titleEl.textContent = this.currentCard.title;

    this.isAnswered = false;
    this.answer = {};

    this.submitBtn.classList.remove("hidden");
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "Проверить ответ";
    this.nextBtn.classList.add("hidden");

    const options = question.type === "choice" ? renderedOptions(question) : [];
    const bodyEl = document.getElementById("famModalBody");
    if (bodyEl) {
      bodyEl.innerHTML = questionHtml(question, options, {
        index: this.currentQuestionIdx,
        total: this.currentCard.questions.length,
      });
    }

    if (question.type === "choice") this._wireChoice(bodyEl);
    else if (question.type === "input") this._wireNumberInput();
  }

  _wireChoice(bodyEl) {
    const cards = bodyEl.querySelectorAll(".fam-option-card");

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        if (this.isAnswered) return;

        cards.forEach((other) => other.classList.remove("is-selected"));
        card.classList.add("is-selected");

        this.answer = { choice: Number.parseInt(card.dataset.index, 10) };
        this.submitBtn.disabled = false;
      });
    });
  }

  _wireNumberInput() {
    const inputEl = document.getElementById("famNumberInput");
    if (!inputEl) return;

    inputEl.addEventListener("input", (event) => {
      if (this.isAnswered) return;

      const value = Number.parseFloat(event.target.value);
      this.answer = Number.isFinite(value) ? { value } : {};
      this.submitBtn.disabled = !Number.isFinite(value);
    });

    inputEl.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || this.submitBtn.disabled || this.isAnswered) return;
      this._handleSubmitAnswer();
    });

    setTimeout(() => inputEl.focus(), INPUT_FOCUS_DELAY_MS);
  }

  // --- Проверка ответа -----------------------------------------------------

  _handleSubmitAnswer() {
    if (!this.currentCard || this.isAnswered) return;

    const question = this._currentQuestion;
    const isCorrect = isAnswerCorrect(question, this.answer);

    this.isAnswered = true;
    this.submitBtn.classList.add("hidden");

    this._showAnswerMarks(question, isCorrect);
    this._showFeedback(question, isCorrect);

    const hasMore = this.currentQuestionIdx + 1 < this.currentCard.questions.length;
    if (!hasMore) this._completeCard();

    this.nextBtn.textContent = hasMore ? "Следующий вопрос →" : "Завершить карточку ✓";
    this.nextBtn.classList.remove("hidden");
  }

  /** Подсвечивает правильный ответ и ошибку курсанта. */
  _showAnswerMarks(question, isCorrect) {
    if (question.type === "choice") {
      this.modalEl.querySelectorAll(".fam-option-card").forEach((card, idx) => {
        if (question._renderedOptions?.[idx]?.isCorrect) card.classList.add("is-correct");
        else if (idx === this.answer.choice && !isCorrect) card.classList.add("is-wrong");
      });
      return;
    }

    const inputEl = document.getElementById("famNumberInput");
    if (!inputEl) return;
    inputEl.classList.add(isCorrect ? "input-correct" : "input-wrong");
    inputEl.disabled = true;
  }

  _showFeedback(question, isCorrect) {
    const feedbackEl = document.getElementById("famFeedbackCard");
    if (!feedbackEl) return;

    feedbackEl.className = `fam-feedback-card ${isCorrect ? "feedback-success" : "feedback-error"}`;
    feedbackEl.innerHTML = feedbackHtml(question, isCorrect);
    feedbackEl.classList.remove("hidden");
  }

  /** Карточка пройдена: орган гаснет и засчитывается в прогресс. */
  _completeCard() {
    this.studiedKeys.add(this.currentKey);
    markStudied(this.currentKey, this.currentTargetEl);
    this._updateProgress();
  }

  _handleNextStep() {
    if (this.isStudyMode) {
      this._completeCard();
      this.closeModal();
      return;
    }

    if (this.currentQuestionIdx + 1 < this.currentCard.questions.length) {
      this.currentQuestionIdx += 1;
      this._renderModal();
      return;
    }

    this.closeModal();
  }

  // --- Прогресс ------------------------------------------------------------

  restoreHighlights() {
    restoreMarks(this.studiedKeys);
  }

  _updateProgress() {
    const count = this.studiedKeys.size;
    const total = totalElements();
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    const countEl = document.getElementById("famProgressCount");
    const percentEl = document.getElementById("famProgressPercent");
    const fillEl = document.getElementById("famProgressFill");

    if (countEl) countEl.textContent = String(count);
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (fillEl) fillEl.style.width = `${percent}%`;
  }
}

export { MODE_STUDY, MODE_QUIZ, MODES };
