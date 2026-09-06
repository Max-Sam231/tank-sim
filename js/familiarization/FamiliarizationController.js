import { FAMILIARIZATION_DATA } from "./familiarizationData.js";

export class FamiliarizationController {
  constructor({ app, onExit }) {
    this.app = app;
    this.onExit = onExit;

    this.isActive = false;
    this.testedElements = new Set();
    this.currentKey = null;
    this.currentData = null;
    this.currentQuestionIdx = 0;
    this.selectedChoice = null;
    this.inputValue = null;
    this.currentStepAnswered = false;

    this._captureHandler = this._handleCaptureClick.bind(this);

    this._initDOM();
  }

  _initDOM() {
    // 1. Top bar
    let topBar = document.getElementById("famTopBar");
    if (!topBar) {
      topBar = document.createElement("div");
      topBar.id = "famTopBar";
      topBar.className = "fam-top-bar hidden";
      topBar.innerHTML = `
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
      document.body.appendChild(topBar);
    }
    this.topBarEl = topBar;

    document.getElementById("famExitBtn")?.addEventListener("click", () => {
      this.stop();
      if (this.onExit) this.onExit();
    });

    // 2. Modal
    let modal = document.getElementById("famModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "famModal";
      modal.className = "fam-modal hidden";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.innerHTML = `
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
      document.body.appendChild(modal);
    }
    this.modalEl = modal;

    document.getElementById("famModalClose")?.addEventListener("click", () => {
      this.closeModal();
    });

    document.querySelector("#famModal .fam-modal-backdrop")?.addEventListener("click", () => {
      this.closeModal();
    });

    this.submitBtn = document.getElementById("famModalSubmitBtn");
    this.nextBtn = document.getElementById("famModalNextBtn");

    this.submitBtn?.addEventListener("click", () => this._handleSubmitAnswer());
    this.nextBtn?.addEventListener("click", () => this._handleNextStep());
  }

  start() {
    this.isActive = true;
    this.testedElements.clear();
    this._removeHighlightClasses();

    document.body.classList.add("familiarization-mode-active");
    this.topBarEl.classList.remove("hidden");

    const totalCount = Object.keys(FAMILIARIZATION_DATA).length;
    const totalEl = document.getElementById("famTotalCount");
    if (totalEl) totalEl.textContent = String(totalCount);

    this._updateProgress();

    // Attach capture event listener to document
    window.addEventListener("click", this._captureHandler, true);
  }

  stop() {
    this.isActive = false;
    this.closeModal();

    document.body.classList.remove("familiarization-mode-active");
    this.topBarEl?.classList.add("hidden");
    this._removeHighlightClasses();

    window.removeEventListener("click", this._captureHandler, true);
  }

  _handleCaptureClick(event) {
    if (!this.isActive) return;

    // Ignore clicks inside top bar or modal
    if (event.target.closest("#famTopBar, #famModal")) {
      return;
    }

    // Allow clicking the "Назад в кабину" button inside instrument panel
    if (event.target.closest("#instrumentPanelBack")) {
      setTimeout(() => this.restoreHighlights(), 60);
      return;
    }
    if (event.target.closest("[data-action='exit_to_hangar']")) {
      return;
    }

    // Allow opening the instrument panel modal from cabin view
    const ipAction = event.target.closest('[data-action="instrument-panel"]');
    const isPanelOpen = document.getElementById("scene")?.classList.contains("instrument-panel-open");
    if (ipAction && !isPanelOpen) {
      setTimeout(() => this.restoreHighlights(), 60);
      return; // UIController will open the instrument panel
    }

    // Check if clicked element is an interactive hitbox or gauge
    const targetEl = event.target.closest(".hitbox, .overlay-control, [data-gauge], [data-action]");
    if (!targetEl) return;

    const key = targetEl.dataset.gauge || targetEl.dataset.action;
    if (!key) return;

    if (this.testedElements.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return; // Элемент уже изучен, повторно карточка не открывается
    }

    // Prevent standard tank state actuation!
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.openQuiz(key, targetEl);
  }

  openQuiz(key, targetEl = null) {
    const data = FAMILIARIZATION_DATA[key] || {
      id: key,
      title: key,
      description: "Орган управления танка Т-72.",
      questions: [
        {
          id: "q1",
          type: "choice",
          text: `Что это за орган управления (${key})?`,
          options: ["Орган управления систем танка", "Резервный переключатель", "Контрольный индикатор"],
          correct: 0,
          explanation: "Элемент отделения управления механика-водителя танка Т-72."
        }
      ]
    };

    const allQuestions = (data.questions || []).map((q) => ({ ...q }));
    const countToPick = allQuestions.length <= 2 ? allQuestions.length : (Math.random() < 0.5 ? 1 : 2);
    const pool = [...allQuestions];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selectedQuestions = pool.slice(0, countToPick);

    this.currentKey = key;
    this.currentData = { ...data, questions: selectedQuestions };
    this.currentQuestionIdx = 0;
    this.currentTargetEl = targetEl;

    this._renderModal();
    this.modalEl.classList.remove("hidden");
  }

  closeModal() {
    this.modalEl.classList.add("hidden");
    this.currentKey = null;
    this.currentData = null;
    this.currentQuestionIdx = 0;
    this.selectedChoice = null;
    this.inputValue = null;
    this.currentStepAnswered = false;
  }

  _renderModal() {
    if (!this.currentData) return;

    const data = this.currentData;
    const qIdx = this.currentQuestionIdx;
    const question = data.questions[qIdx];

    const tagEl = document.getElementById("famModalTag");
    const titleEl = document.getElementById("famModalTitle");
    const bodyEl = document.getElementById("famModalBody");

    const isGauge = data.id.startsWith("gauge-");
    if (tagEl) tagEl.textContent = isGauge ? "ПРИБОР КИП" : "ОРГАН УПРАВЛЕНИЯ";
    if (titleEl) titleEl.textContent = data.title;

    this.currentStepAnswered = false;
    this.selectedChoice = null;
    this.inputValue = null;

    this.submitBtn.classList.remove("hidden");
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "Проверить ответ";
    this.nextBtn.classList.add("hidden");

    let qHtml = `
      <div class="fam-question-header">
        <span class="fam-question-counter">Вопрос ${qIdx + 1} из ${data.questions.length}</span>
        <div class="fam-question-text">${question.text}</div>
      </div>
    `;

    if (question.type === "choice") {
      if (!question._renderedOptions) {
        const mapped = question.options.map((opt, idx) => ({ opt, isCorrect: idx === question.correct }));
        for (let i = mapped.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
        }
        question._renderedOptions = mapped;
      }

      qHtml += `<div class="fam-options-list">`;
      question._renderedOptions.forEach((item, idx) => {
        qHtml += `
          <div class="fam-option-card" data-index="${idx}">
            <div class="fam-option-radio"></div>
            <div class="fam-option-label">${item.opt}</div>
          </div>
        `;
      });
      qHtml += `</div>`;
    } else if (question.type === "input") {
      qHtml += `
        <div class="fam-input-group">
          <label class="fam-input-label">Введите числовое значение ${question.unit ? `(${question.unit})` : ""}:</label>
          <div class="fam-input-row">
            <input type="number" step="any" class="fam-number-input" id="famNumberInput" placeholder="0" />
            ${question.unit ? `<span class="fam-input-unit">${question.unit}</span>` : ""}
          </div>
        </div>
      `;
    }

    qHtml += `<div class="fam-feedback-card hidden" id="famFeedbackCard"></div>`;

    if (bodyEl) bodyEl.innerHTML = qHtml;

    // Bind choice selection
    if (question.type === "choice") {
      const optionCards = bodyEl.querySelectorAll(".fam-option-card");
      optionCards.forEach((card) => {
        card.addEventListener("click", () => {
          if (this.currentStepAnswered) return;
          optionCards.forEach((c) => c.classList.remove("is-selected"));
          card.classList.add("is-selected");
          this.selectedChoice = parseInt(card.dataset.index, 10);
          this.submitBtn.disabled = false;
        });
      });
    } else if (question.type === "input") {
      const inputEl = document.getElementById("famNumberInput");
      inputEl?.addEventListener("input", (e) => {
        if (this.currentStepAnswered) return;
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          this.inputValue = val;
          this.submitBtn.disabled = false;
        } else {
          this.inputValue = null;
          this.submitBtn.disabled = true;
        }
      });
      inputEl?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !this.submitBtn.disabled && !this.currentStepAnswered) {
          this._handleSubmitAnswer();
        }
      });
      setTimeout(() => inputEl?.focus(), 50);
    }
  }

  _handleSubmitAnswer() {
    if (!this.currentData || this.currentStepAnswered) return;

    const question = this.currentData.questions[this.currentQuestionIdx];
    let isCorrect = false;

    if (question.type === "choice") {
      isCorrect = question._renderedOptions?.[this.selectedChoice]?.isCorrect || false;
    } else if (question.type === "input") {
      const val = this.inputValue;
      if (typeof question.min === "number" && typeof question.max === "number") {
        isCorrect = val >= question.min && val <= question.max;
      } else {
        isCorrect = Math.abs(val - question.expected) <= (question.tolerance || 0.1);
      }
    }

    this.currentStepAnswered = true;
    this.submitBtn.classList.add("hidden");

    // Highlight choices
    if (question.type === "choice") {
      const cards = this.modalEl.querySelectorAll(".fam-option-card");
      cards.forEach((card, idx) => {
        if (question._renderedOptions?.[idx]?.isCorrect) {
          card.classList.add("is-correct");
        } else if (idx === this.selectedChoice && !isCorrect) {
          card.classList.add("is-wrong");
        }
      });
    } else if (question.type === "input") {
      const inputEl = document.getElementById("famNumberInput");
      if (inputEl) {
        inputEl.classList.add(isCorrect ? "input-correct" : "input-wrong");
        inputEl.disabled = true;
      }
    }

    // Feedback card
    const feedbackEl = document.getElementById("famFeedbackCard");
    if (feedbackEl) {
      feedbackEl.className = `fam-feedback-card ${isCorrect ? "feedback-success" : "feedback-error"}`;
      feedbackEl.innerHTML = `
        <div class="fam-feedback-title">${isCorrect ? "Верно!" : "Неверно"}</div>
        <div class="fam-feedback-desc">${question.explanation}</div>
      `;
      feedbackEl.classList.remove("hidden");
    }

    const hasNextQuestion = this.currentQuestionIdx + 1 < this.currentData.questions.length;
    if (hasNextQuestion) {
      this.nextBtn.textContent = "Следующий вопрос →";
      this.nextBtn.classList.remove("hidden");
    } else {
      // Completed all questions for this element!
      this.testedElements.add(this.currentKey);
      this._markElementTested(this.currentKey, this.currentTargetEl);
      this._updateProgress();

      this.nextBtn.textContent = "Завершить карточку ✓";
      this.nextBtn.classList.remove("hidden");
    }
  }

  _handleNextStep() {
    const hasNextQuestion = this.currentQuestionIdx + 1 < this.currentData.questions.length;
    if (hasNextQuestion) {
      this.currentQuestionIdx += 1;
      this._renderModal();
    } else {
      this.closeModal();
    }
  }

  _markElementTested(key, el) {
    const inactiveSelector = `.hitbox[data-action="${key}"], .hitbox[data-gauge="${key}"], .overlay-control[data-action="${key}"], .overlay-control[data-gauge="${key}"]`;
    document.querySelectorAll(inactiveSelector).forEach((node) => {
      node.classList.add("fam-item-inactive");
    });

    const selector = `.overlay-control[data-action="${key}"], .overlay-control[data-gauge="${key}"], img[data-action="${key}"], img[data-gauge="${key}"]`;
    const overlayNodes = document.querySelectorAll(selector);
    if (overlayNodes.length > 0) {
      overlayNodes.forEach((node) => {
        node.classList.add("fam-item-tested");
      });
    } else {
      // Pure SVG hitboxes without sprite image overlays (e.g. manometer, cabin-light)
      document.querySelectorAll(`.hitbox[data-action="${key}"], .hitbox[data-gauge="${key}"]`).forEach((node) => {
        node.classList.add("fam-item-tested-hitbox");
      });
    }

    if (el && (el.tagName === "IMG" || el.classList?.contains("overlay-control"))) {
      el.classList.add("fam-item-tested");
    } else if (el && el.classList?.contains("hitbox") && overlayNodes.length === 0) {
      el.classList.add("fam-item-tested-hitbox");
    }
  }

  restoreHighlights() {
    this.testedElements.forEach((key) => {
      this._markElementTested(key, null);
    });
  }

  _updateProgress() {
    const count = this.testedElements.size;
    const total = Object.keys(FAMILIARIZATION_DATA).length;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;

    const countEl = document.getElementById("famProgressCount");
    const percentEl = document.getElementById("famProgressPercent");
    const fillEl = document.getElementById("famProgressFill");

    if (countEl) countEl.textContent = String(count);
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (fillEl) fillEl.style.width = `${percent}%`;
  }

  _removeHighlightClasses() {
    document.querySelectorAll(".fam-item-tested").forEach((el) => {
      el.classList.remove("fam-item-tested");
    });
    document.querySelectorAll(".fam-item-tested-hitbox").forEach((el) => {
      el.classList.remove("fam-item-tested-hitbox");
    });
    document.querySelectorAll(".fam-item-inactive").forEach((el) => {
      el.classList.remove("fam-item-inactive");
    });
  }
}
