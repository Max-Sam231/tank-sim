/**
 * 2D вид слева. Люки не кликаются.
 * Зона подогревателя обрабатывается HangarScene (сценарии разогрева).
 */
export class TankSideView {
  constructor(app, hangarScene) {
    this.app = app;
    this.hangarScene = hangarScene;
    this.el = document.getElementById("tank-side-view");
  }

  init() {}

  dispose() {}
}
