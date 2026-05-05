class FinishReportModal {
  constructor({ onContinue, onMenu } = {}) {
    this.onContinue = typeof onContinue === "function" ? onContinue : null;
    this.onMenu = typeof onMenu === "function" ? onMenu : null;

    this._rootEl = document.createElement("div");
    this._rootEl.className = "finish-report-modal hidden";
    this._rootEl.setAttribute("role", "dialog");
    this._rootEl.setAttribute("aria-label", "Проверка выполнения");

    this._rootEl.innerHTML = `
      <div class="finish-report-modal-content">
        <div class="finish-report-header">
          <div class="finish-report-title" id="finishReportTitle"></div>
        </div>
        <div class="finish-report-body">
          <ol class="finish-report-list" id="finishReportList"></ol>
        </div>
        <div class="finish-report-actions">
          <button class="finish-report-btn" id="finishReportContinue" type="button">Продолжить</button>
          <button class="finish-report-btn finish-report-btn-secondary" id="finishReportMenu" type="button">В меню</button>
        </div>
      </div>
    `;

    document.body.appendChild(this._rootEl);

    this._titleEl = this._rootEl.querySelector("#finishReportTitle");
    this._listEl = this._rootEl.querySelector("#finishReportList");

    const continueBtn = this._rootEl.querySelector("#finishReportContinue");
    const menuBtn = this._rootEl.querySelector("#finishReportMenu");

    if (continueBtn) {
      continueBtn.addEventListener("click", () => {
        this.hide();
        if (this.onContinue) this.onContinue();
      });
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        this.hide();
        if (this.onMenu) this.onMenu();
      });
    }
  }

  show(report) {
    if (!this._rootEl) return;

    const title = String(report?.scenarioTitle || "Проверка");
    if (this._titleEl) this._titleEl.textContent = title;

    if (this._listEl) {
      const items = Array.isArray(report?.items) ? report.items : [];
      this._listEl.innerHTML = items
        .map((it) => {
          const safeTitle = String(it.title || "");
          const cls = it.done ? "finish-report-item is-done" : "finish-report-item";
          return `<li class="${cls}">${safeTitle}</li>`;
        })
        .join("\n");
    }

    this._rootEl.classList.remove("hidden");
  }

  hide() {
    if (!this._rootEl) return;
    this._rootEl.classList.add("hidden");
  }
}

export { FinishReportModal };
