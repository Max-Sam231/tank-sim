/**
 * 2D вид сверху. Вход в люки отключён — только осмотр / рентген-слой.
 * Переходы в кабины — через 3D-маркеры.
 */
export class TankTopView {
  constructor(app, hangarScene) {
    this.app = app;
    this.hangarScene = hangarScene;
    this.el = document.getElementById("tank-top-view");
  }

  init() {}

  dispose() {}
}
