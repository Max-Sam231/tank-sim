// HangarScene.js

export class HangarScene {
  constructor(app) {
    this.app = app;
    this.tank = null;

    this.onHatchClick = this.onHatchClick.bind(this);
  }

  init() {
    this.createEnvironment();
    this.createTank();
    this.enableInteractions();
  }

  createEnvironment() {
    // фон ангара, свет и т.п.
    this.app.scene.background = 0x222222;
  }

  createTank() {
    // допустим у тебя уже есть модель
    this.tank = this.app.assets.get("t72b"); // или gltf loader

    this.tank.position.set(0, 0, 0);
    this.app.scene.add(this.tank);

    // ищем люки
    this.driverHatch = this.tank.getObjectByName("driver_hatch");

    if (this.driverHatch) {
      this.driverHatch.userData.clickable = true;
    }
  }

  enableInteractions() {
    window.addEventListener("click", this.onHatchClick);
  }

  onHatchClick(event) {
    const hit = this.app.raycastFromMouse(event);

    if (!hit) return;

    if (hit.object.userData.clickable) {
      if (hit.object.name === "driver_hatch") {
        this.enterDriverCabin();
      }
    }
  }

  enterDriverCabin() {
    this.app.changeScene("DriverScene");
  }

  update(dt) {
    // анимации, вращение камеры и т.д.
  }

  dispose() {
    window.removeEventListener("click", this.onHatchClick);
  }
}