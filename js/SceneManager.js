export class SceneManager {
    constructor() {
        this.currentScene = null;
    }

    /**
     * @param {Object} newScene - экземпляр сцены
     * @param {string} sceneId - id DOM элемента сцены
     */
    change(newScene, sceneId) {
        // 1. корректно уничтожаем старую сцену
        if (this.currentScene?.dispose) {
            this.currentScene.dispose();
        }

        // 2. прячем ВСЕ сцены (оставляем только hidden — is-hidden убираем)
        document.querySelectorAll('.game-scene').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('is-hidden');
        });

        // 3. показываем нужную сцену
        if (sceneId) {
            const el = document.getElementById(sceneId);

            if (!el) {
                console.warn(`Scene element with id "${sceneId}" not found.`);
                return;
            }

            el.classList.remove('hidden');
            el.classList.remove('is-hidden');
        }

        // 4. переключаем сцену в памяти
        this.currentScene = newScene;

        // 5. инициализация новой сцены
        this.currentScene?.init?.();

        console.log(`Scene switched to: ${sceneId}`);
    console.trace("SCENE CHANGE CALLED");
    }

    update(dt) {
        this.currentScene?.update?.(dt);
    }
}