export class SceneManager {
  constructor() {
    this.currentScene = null;
  }

  change(scene) {
    if (this.currentScene?.dispose) {
      this.currentScene.dispose();
    }

    this.currentScene = scene;

    if (this.currentScene.init) {
      this.currentScene.init();
    }
  }

  update(dt) {
    this.currentScene?.update?.(dt);
  }
}