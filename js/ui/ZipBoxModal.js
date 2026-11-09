import { ZIP_BOX_2_ITEMS, ZIP_BOX_2_CATEGORIES } from "../scenes/hangar/zipBox2Data.js";
import { Tooltip } from "./Tooltip.js";

/**
 * Интерактивное модальное окно ящика ЗИП №2.
 * Поддерживает 2 режима отображения:
 * 1. "collage" (по умолчанию) — аутентичная раскладка инструментов на общем фоне (как на Рис. 3.4 в учебнике)
 * 2. "grid" — каталог-сетка карточек с фильтром по категориям и поиском
 */
export class ZipBoxModal {
  constructor({ state, onInventoryChange } = {}) {
    this.state = state;
    this.onInventoryChange = onInventoryChange;
    this.items = ZIP_BOX_2_ITEMS;
    this.selectedItem = this.items.find((it) => it.pos === 13) || this.items[0];
    this.viewMode = "collage"; // "collage" | "grid"
    this.activeCategory = "all";
    this.searchQuery = "";

    this._createDOM();
    this._bindEvents();
    this.tooltip = new Tooltip({
      className: "zip-floating-tooltip",
      parentEl: document.body,
      fallbackWidth: 320,
      fallbackHeight: 140,
    });
  }

  _createDOM() {
    this.rootEl = document.createElement("div");
    this.rootEl.className = "zip-box-modal hidden";
    this.rootEl.id = "zipBoxModal";
    this.rootEl.setAttribute("role", "dialog");
    this.rootEl.setAttribute("aria-label", "Ящик ЗИП №2");

    this.rootEl.innerHTML = `
      <div class="zip-modal-backdrop" data-action="close"></div>
      <div class="zip-modal-window">
        <header class="zip-modal-header">
          <div class="zip-header-title-group">
            <div class="zip-badge-row">
              <span class="zip-military-badge">Т-72А • ЗИП</span>
              <span class="zip-location-badge">Правая надгусеничная полка, средний ящик</span>
            </div>
            <h2 class="zip-modal-title">ЯЩИК ЗИП №2 (ИНСТРУМЕНТ МЕХАНИКА-ВОДИТЕЛЯ)</h2>
            <p class="zip-modal-subtitle">Раскладка предметов возимого комплекта (31 наименование по Рис. 3.4 руководства)</p>
          </div>
          <div class="zip-header-right">
            <div class="zip-view-switcher">
              <button class="zip-view-btn ${this.viewMode === "collage" ? "active" : ""}" data-view="collage" type="button" title="Раскладка как в учебнике">
                🗃 Раскладка (как в учебнике)
              </button>
              <button class="zip-view-btn ${this.viewMode === "grid" ? "active" : ""}" data-view="grid" type="button" title="Сетка карточек с поиском">
                ⊞ Сетка
              </button>
            </div>
            <button class="zip-modal-close-btn" data-action="close" type="button" title="Закрыть (Esc)">✕</button>
          </div>
        </header>

        <div class="zip-modal-controls ${this.viewMode === "collage" ? "hidden" : ""}" id="zipGridControls">
          <div class="zip-search-box">
            <span class="zip-search-icon">🔍</span>
            <input type="search" class="zip-search-input" id="zipSearchInput" placeholder="Поиск инструмента по названию или номеру..." autocomplete="off" />
          </div>
          <div class="zip-category-tabs" id="zipCategoryTabs">
            ${ZIP_BOX_2_CATEGORIES.map(
              (cat) => `
              <button class="zip-tab-btn ${cat.id === "all" ? "active" : ""}" data-category="${cat.id}" type="button">
                ${cat.label}
              </button>
            `,
            ).join("")}
          </div>
        </div>

        <div class="zip-modal-body">
          <!-- Режим 1: Раскладка на фоне (как в учебнике) -->
          <div class="zip-board-container ${this.viewMode === "collage" ? "" : "hidden"}" id="zipBoardContainer">
            <div class="zip-board" id="zipBoard">
              ${this._renderCollageHtml()}
            </div>
          </div>

          <!-- Режим 2: Каталог-сетка карточек -->
          <div class="zip-grid-container ${this.viewMode === "grid" ? "" : "hidden"}" id="zipGridContainer">
            <div class="zip-grid" id="zipItemsGrid">
              ${this._renderCardsHtml()}
            </div>
          </div>
        </div>

        <footer class="zip-modal-footer" id="zipModalFooter">
          ${this._renderFooterHtml()}
        </footer>
      </div>
    `;

    document.body.appendChild(this.rootEl);

    this.boardEl = this.rootEl.querySelector("#zipBoard");
    this.boardContainerEl = this.rootEl.querySelector("#zipBoardContainer");
    this.gridContainerEl = this.rootEl.querySelector("#zipGridContainer");
    this.gridControlsEl = this.rootEl.querySelector("#zipGridControls");
    this.gridEl = this.rootEl.querySelector("#zipItemsGrid");
    this.footerEl = this.rootEl.querySelector("#zipModalFooter");
    this.searchInputEl = this.rootEl.querySelector("#zipSearchInput");
    this.tabsContainerEl = this.rootEl.querySelector("#zipCategoryTabs");
  }

  /** Отрисовка раскладки инструментов на общем фоне (как на Рис. 3.4 в учебнике) */
  _renderCollageHtml() {
    return this.items
      .map((it) => {
        const isTaken = this._isItemTaken(it);
        const isActionable = Boolean(it.isActionable);
        const isSelected = this.selectedItem && this.selectedItem.pos === it.pos;
        const l = it.layout;

        return `
          <div class="zip-board-item ${isSelected ? "selected" : ""} ${isActionable ? "actionable" : ""} ${isTaken ? "is-taken" : ""}"
               data-pos="${it.pos}"
               style="left: ${l.left}%; top: ${l.top}%; width: ${l.width}%; height: ${l.height}%;"
               tabindex="0"
               role="button"
               aria-label="${this._escapeHtml(it.fullName)}">
            <div class="zip-board-item-inner">
              <img class="zip-board-img" src="${it.img}" alt="${this._escapeHtml(it.name)}" loading="lazy" />
              <span class="zip-board-tag" title="Поз. ${it.pos}">${it.pos}</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  /** Отрисовка каталога карточек */
  _renderCardsHtml() {
    const q = this.searchQuery.trim().toLowerCase();
    const filtered = this.items.filter((it) => {
      if (this.activeCategory !== "all" && it.category !== this.activeCategory) {
        return false;
      }
      if (q) {
        const matchName = it.name.toLowerCase().includes(q);
        const matchFullName = it.fullName.toLowerCase().includes(q);
        const matchDesc = it.desc.toLowerCase().includes(q);
        const matchPos = String(it.pos) === q || `№${it.pos}`.includes(q);
        return matchName || matchFullName || matchDesc || matchPos;
      }
      return true;
    });

    if (filtered.length === 0) {
      return `<div class="zip-empty-msg">Предметы не найдены по запросу «${this._escapeHtml(q)}»</div>`;
    }

    return filtered
      .map((it) => {
        const isTaken = this._isItemTaken(it);
        const isActionable = Boolean(it.isActionable);
        const isSelected = this.selectedItem && this.selectedItem.pos === it.pos;

        let actionBadgeHtml = "";
        if (isActionable) {
          if (isTaken) {
            actionBadgeHtml = `<span class="zip-card-badge taken">✔ В снаряжении</span>`;
          } else {
            actionBadgeHtml = `<span class="zip-card-badge take">Взять</span>`;
          }
        }

        return `
          <div class="zip-card ${isSelected ? "selected" : ""} ${isActionable ? "actionable" : ""} ${isTaken ? "is-taken" : ""}" 
               data-pos="${it.pos}" 
               tabindex="0"
               role="button"
               aria-label="${this._escapeHtml(it.fullName)}">
            <div class="zip-card-top-row">
              <span class="zip-pos-badge">№${it.pos}</span>
              <span class="zip-qty-badge">${it.quantity}</span>
            </div>
            <div class="zip-card-img-wrap">
              <img class="zip-card-img" src="${it.img}" alt="${this._escapeHtml(it.name)}" loading="lazy" />
            </div>
            <div class="zip-card-name">${this._escapeHtml(it.name)}</div>
            ${actionBadgeHtml}
          </div>
        `;
      })
      .join("");
  }

  _renderFooterHtml() {
    const it = this.selectedItem;
    if (!it) {
      return `<div class="zip-footer-empty">Наведите курсор на инструмент для подробной информации</div>`;
    }

    const isTaken = this._isItemTaken(it);
    const isActionable = Boolean(it.isActionable);

    let actionBtnHtml = "";
    if (isActionable) {
      if (isTaken) {
        actionBtnHtml = `<span class="zip-footer-status-tag taken">✔ В снаряжении игрока</span>`;
      } else {
        actionBtnHtml = `
          <button class="zip-footer-action-btn" data-action="take-item" data-pos="${it.pos}" type="button">
            Взять в снаряжение
          </button>
        `;
      }
    }

    return `
      <div class="zip-footer-preview">
        <div class="zip-footer-thumb">
          <img src="${it.img}" alt="${this._escapeHtml(it.name)}" />
          <span class="zip-footer-pos">№${it.pos}</span>
        </div>
        <div class="zip-footer-info">
          <div class="zip-footer-heading-row">
            <h3 class="zip-footer-title">Поз. ${it.pos}. ${this._escapeHtml(it.name)}</h3>
            <span class="zip-footer-category">${it.categoryLabel}</span>
            <span class="zip-footer-qty">${it.quantity}</span>
          </div>
          <div class="zip-footer-fullname">${this._escapeHtml(it.fullName)}</div>
          <p class="zip-footer-desc">${this._escapeHtml(it.desc)}</p>
          <div class="zip-footer-meta">
            <span>📍 ${it.location}</span>
          </div>
        </div>
        <div class="zip-footer-action-wrap">
          ${actionBtnHtml}
        </div>
      </div>
    `;
  }

  _isItemTaken(item) {
    if (!this.state) return false;
    if (item.pos === 20) return Boolean(this.state.hasZipKey);
    if (item.pos === 13) return Boolean(this.state.hasExhaustCap);
    return false;
  }

  _bindEvents() {
    // Переключение режимов отображения (Раскладка / Сетка)
    this.rootEl.addEventListener("click", (e) => {
      const viewBtn = e.target.closest("[data-view]");
      if (viewBtn) {
        this._setViewMode(viewBtn.dataset.view);
        return;
      }

      // Закрытие
      const closeBtn = e.target.closest('[data-action="close"]');
      if (closeBtn) {
        this.hide();
        return;
      }

      // Кнопка "Взять" в футере
      const takeBtn = e.target.closest('[data-action="take-item"]');
      if (takeBtn) {
        const pos = Number(takeBtn.dataset.pos);
        this._takeItemByPos(pos);
        return;
      }

      // Клик по инструменту на доске или карточке в сетке
      const itemEl = e.target.closest(".zip-board-item, .zip-card");
      if (itemEl) {
        const pos = Number(itemEl.dataset.pos);
        const item = this.items.find((it) => it.pos === pos);
        if (item) {
          this.selectedItem = item;
          if (item.isActionable && !this._isItemTaken(item)) {
            this._takeItemByPos(pos);
          } else {
            this._refreshDOM();
          }
        }
      }
    });

    // Наведение (hover) на инструмент
    this.rootEl.addEventListener("mouseover", (e) => {
      const itemEl = e.target.closest(".zip-board-item, .zip-card");
      if (itemEl) {
        const pos = Number(itemEl.dataset.pos);
        const item = this.items.find((it) => it.pos === pos);
        if (item) {
          this.selectedItem = item;
          this._updateFooter();
          this._showTooltip(item);
        }
      }
    });

    this.rootEl.addEventListener("mousemove", (e) => {
      const itemEl = e.target.closest(".zip-board-item, .zip-card");
      if (itemEl) {
        this.tooltip.moveTo(e.clientX, e.clientY);
      }
    });

    this.rootEl.addEventListener("mouseleave", () => {
      this.tooltip.hide();
    });

    this.rootEl.addEventListener("mouseout", (e) => {
      const itemEl = e.target.closest(".zip-board-item, .zip-card");
      if (itemEl && !e.relatedTarget?.closest(".zip-board-item, .zip-card")) {
        this.tooltip.hide();
      }
    });

    // Фильтр категорий (в режиме сетки)
    this.tabsContainerEl?.addEventListener("click", (e) => {
      const btn = e.target.closest(".zip-tab-btn");
      if (!btn) return;
      this.activeCategory = btn.dataset.category;
      this.tabsContainerEl.querySelectorAll(".zip-tab-btn").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });
      this._refreshCards();
    });

    // Поиск (в режиме сетки)
    this.searchInputEl?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this._refreshCards();
    });

    // Клавиша Escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.rootEl.classList.contains("hidden")) {
        this.hide();
      }
    });
  }

  _setViewMode(mode) {
    this.viewMode = mode;
    this.rootEl.querySelectorAll(".zip-view-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === mode);
    });

    if (mode === "collage") {
      this.boardContainerEl.classList.remove("hidden");
      this.gridContainerEl.classList.add("hidden");
      this.gridControlsEl.classList.add("hidden");
    } else {
      this.boardContainerEl.classList.add("hidden");
      this.gridContainerEl.classList.remove("hidden");
      this.gridControlsEl.classList.remove("hidden");
    }

    this._refreshDOM();
  }

  _showTooltip(item) {
    const isTaken = this._isItemTaken(item);
    let actionHintHtml = "";
    if (item.isActionable) {
      if (isTaken) {
        actionHintHtml = `<div class="zip-tooltip-action taken">✔ Предмет уже взят в снаряжение</div>`;
      } else {
        actionHintHtml = `<div class="zip-tooltip-action take">💡 Нажмите, чтобы взять в снаряжение</div>`;
      }
    }

    const html = `
      <div class="zip-tooltip-header">
        <span class="zip-tooltip-pos">Поз. ${item.pos}</span>
        <strong class="zip-tooltip-name">${this._escapeHtml(item.name)}</strong>
      </div>
      <div class="zip-tooltip-fullname">${this._escapeHtml(item.fullName)}</div>
      <div class="zip-tooltip-desc"><strong>Назначение:</strong> ${this._escapeHtml(item.desc)}</div>
      <div class="zip-tooltip-footer">
        <span class="zip-tooltip-loc">📍 ${item.location}</span>
        <span class="zip-tooltip-qty">📦 ${item.quantity}</span>
      </div>
      ${actionHintHtml}
    `;

    this.tooltip.setHtml(html);
    this.tooltip.show();
  }

  _takeItemByPos(pos) {
    if (!this.state) return;
    if (pos === 20) {
      if (!this.state.hasZipKey) {
        this.state.takeZipKey();
        this._onItemTaken(pos, "Ключ S=27 взят в снаряжение");
      }
    } else if (pos === 13) {
      if (!this.state.hasExhaustCap) {
        this.state.takeExhaustCap();
        this._onItemTaken(pos, "Козырёк выхлопа взят в снаряжение");
      }
    }
  }

  _onItemTaken(pos, message) {
    this._refreshDOM();
    if (typeof this.onInventoryChange === "function") {
      this.onInventoryChange(this.state.getSnapshot());
    }

    const item = this.items.find((it) => it.pos === pos);
    if (item) {
      this._showTooltip(item);
    }
  }

  _refreshBoard() {
    this.boardEl.innerHTML = this._renderCollageHtml();
  }

  _refreshCards() {
    this.gridEl.innerHTML = this._renderCardsHtml();
  }

  _updateFooter() {
    this.footerEl.innerHTML = this._renderFooterHtml();
  }

  _refreshDOM() {
    this._refreshBoard();
    this._refreshCards();
    this._updateFooter();
  }

  _escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  show() {
    this._refreshDOM();
    this.rootEl.classList.remove("hidden");
    if (this.searchInputEl) {
      this.searchInputEl.value = "";
      this.searchQuery = "";
    }
  }

  hide() {
    this.rootEl.classList.add("hidden");
    this.tooltip?.hide();
  }

  toggle() {
    if (this.rootEl.classList.contains("hidden")) {
      this.show();
    } else {
      this.hide();
    }
  }
}
