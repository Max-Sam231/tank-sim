/**
 * Мок читалки электронного пособия: оглавление + переключение глав.
 * Контент укорочен из методички; часть глав — заглушки.
 */

const CHAPTERS = [
  {
    id: "ko1",
    title: "Контрольный осмотр (карта № 1)",
    body: `
      <p>Полный цикл подготовки танка Т-72 к пуску двигателя начинается с контрольного осмотра перед пуском.</p>
      <ol>
        <li><strong>Установка машины:</strong> установите танк горизонтально.</li>
        <li><strong>Осмотр люков:</strong> откройте крышки люков механика-водителя и командира; убедитесь, что они открываются усилием одного человека и надёжно застопорены.</li>
        <li><strong>Охлаждающая жидкость:</strong> снимите крышку лючка горловины расширительного бачка, проверьте уровень и состояние прокладок пробок.</li>
        <li><strong>Система смазки:</strong> проверьте уровень масла в пополнительном баке щупом; при необходимости дозаправьте.</li>
        <li><strong>Топливо и внешний осмотр:</strong> проверьте заправку баков и крепление пробок на днище и корпусе.</li>
      </ol>
    `,
  },
  {
    id: "prep",
    title: "Подготовка к пуску (карта № 2)",
    body: `
      <p>После контрольного осмотра выполняется подготовка двигателя к пуску.</p>
      <ol>
        <li>Откройте люк механика-водителя и застопорите его.</li>
        <li>Рычаг избирателя передач — в нейтрали; педаль остановочного тормоза — на защёлке.</li>
        <li>Зимой закройте выходные жалюзи (рычаг кулисы в сторону кормы).</li>
        <li>Рукоятка ручной подачи топлива — в положении нулевой подачи.</li>
        <li>Откройте вентили воздушных баллонов (120–160 кгс/см², не ниже 75).</li>
        <li>АЗР — «ВКЛ.», кроме «АЗР ТДА» и «ВОДОПОМПА».</li>
        <li>Включите АБ до щелчка; напряжение бортовой сети 22–26 В.</li>
        <li>Топливораспределительный кран — «БАКИ ВКЛЮЧЕНЫ»; выпустите воздух из топливной системы (БЦН-1 или РНМ-1, 5–10 с).</li>
        <li>При +5 °C и ниже (или на бензине) — разогрев подогревателем.</li>
        <li>Перед пуском — предупредительный звуковой сигнал.</li>
      </ol>
    `,
  },
  {
    id: "air",
    title: "Пуск сжатым воздухом (карта № 3)",
    body: `
      <p>Пуск сжатым воздухом выполняется после подготовки по карте № 2.</p>
      <ol>
        <li>Переключатель «КОМБИНИРОВАННЫЙ» — «ОТКЛ.».</li>
        <li>Звуковой сигнал.</li>
        <li>Удерживайте МЗН-2 до давления масла не ниже <strong>2 кгс/см²</strong>.</li>
        <li>Не отпуская МЗН-2, нажмите ЭПК-48 (прокрутка без топлива, не более 5 с).</li>
        <li>Не отпуская ЭПК-48, выжмите педаль подачи топлива примерно на 1/3 хода.</li>
        <li>После пуска отпустите ЭПК-48 и МЗН-2; холостой ход 800–900 об/мин.</li>
      </ol>
      <p><strong>Ограничение:</strong> МЗН-2 запрещается держать включённым более 1 минуты.</p>
    `,
  },
  {
    id: "starter",
    title: "Пуск стартером (карта № 6)",
    body: `
      <div class="manual-placeholder">
        Макет главы. Полный текст операционной карты № 6 будет здесь:
        подготовка, МЗН-2 до 2 кгс/см², пуск кнопкой «СТАРТЕР» не более 8 с,
        пауза между попытками не менее 15 с, не более трёх попыток подряд.
      </div>
    `,
  },
  {
    id: "combined",
    title: "Комбинированный пуск (карта № 7)",
    body: `
      <div class="manual-placeholder">
        Макет главы. Карта № 7 — одновременный пуск воздухом и стартером-генератором
        (ниже –20 °C, работа на бензине, либо после неудачи раздельных способов).
      </div>
    `,
  },
  {
    id: "heater",
    title: "Подогреватель (карта № 10)",
    body: `
      <div class="manual-placeholder">
        Макет главы. Карта № 10: лючок выхлопа, козырёк из ЗИП, кран подогревателя,
        «СВЕЧА — МОТОР» и «ПУСК МОТОРА», продувка котла 15–30 с после закрытия крана.
        Не путать с тумблером «ОБОГРЕВ БО».
      </div>
    `,
  },
];

function renderChapter(chapter) {
  const reader = document.getElementById("manualReader");
  if (!reader || !chapter) return;

  reader.innerHTML = `
    <div class="manual-chapter-meta">
      <span class="manual-badge">Макет</span>
    </div>
    <h2 class="manual-chapter-title">${chapter.title}</h2>
    <div class="manual-body">${chapter.body}</div>
    <div class="manual-footer-cta">
      <p>Закрепите алгоритм в кабине симулятора.</p>
      <a class="btn btn-primary" href="/sim.html">Перейти к симулятору</a>
    </div>
  `;
}

function setCurrent(id) {
  const chapter = CHAPTERS.find((item) => item.id === id) || CHAPTERS[0];
  document.querySelectorAll(".manual-toc-btn").forEach((btn) => {
    btn.setAttribute("aria-current", btn.dataset.chapter === chapter.id ? "true" : "false");
  });
  renderChapter(chapter);
  history.replaceState(null, "", `#${chapter.id}`);
}

function buildToc() {
  const list = document.getElementById("manualToc");
  if (!list) return;

  list.innerHTML = CHAPTERS.map(
    (chapter) => `
      <li>
        <button type="button" class="manual-toc-btn" data-chapter="${chapter.id}">
          ${chapter.title}
        </button>
      </li>
    `,
  ).join("");

  list.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-chapter]");
    if (!btn) return;
    setCurrent(btn.dataset.chapter);
  });
}

function boot() {
  buildToc();
  const fromHash = location.hash.replace(/^#/, "");
  const initial = CHAPTERS.some((c) => c.id === fromHash) ? fromHash : CHAPTERS[0].id;
  setCurrent(initial);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
