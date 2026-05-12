export class SceneManager {
    constructor() {
        this.currentScene = null;
    }

    /**
     * @param {Object} newScene - Экземпляр сцены (HangarScene или DriverScene)
     * @param {string} sceneId - ID HTML элемента сцены ('scene-hangar' или 'scene-driver')
     */
    change(newScene, sceneId) {
        if (this.currentScene) {
            this.currentScene.dispose();
        }

        document.querySelectorAll('.game-scene').forEach(el => {
            el.classList.add('is-hidden');
            el.classList.add('hidden'); // На всякий случай, если в CSS есть оба класса
        });

        if (sceneId) {
            const el = document.getElementById(sceneId);
            if (el) {
                el.classList.remove('is-hidden');
                el.classList.remove('hidden');
            } else {
                console.warn(`Scene element with id "${sceneId}" not found.`);
            }
        }

        // 4. Инициализируем логику новой сцены
        this.currentScene = newScene;
        if (this.currentScene.init) {
            this.currentScene.init();
        }
    }

    update(dt) {
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(dt);
        }
    }
}