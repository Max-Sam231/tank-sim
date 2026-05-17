export class CommanderScene {
    constructor(app) {
        this.app = app;
        this.el = document.getElementById("scene-commander");
        this.handleAction = this.handleAction.bind(this);
    }

    init() {
        console.log("CommanderScene init");
        
        // Показываем кнопку "Закончить", так как мы в симуляции
        const finishBtn = document.getElementById("simFinishButton");
        if (finishBtn) finishBtn.classList.remove("hidden");

        if (this.el) {
            this.el.addEventListener("click", this.handleAction);
        }
        
        // Сбрасываем вид в прямое положение при входе (опционально)
        // this.app.state.commanderView = 'straight';
        // this.app.ui.renderScene(this.app.state.getSnapshot());
    }

    handleAction(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;

        switch (action) {
            case 'exit_to_hangar':
                this.app.changeScene("hangar", "scene-hangar");
                break;
                
            case 'toggle_commander_view':
                // Вызываем метод состояния для переключения картинки
                this.app.state.toggleCommanderView();
                break;
                
            case 'enter_driver_seat':
                // Переход к водителю прямо из башни командира
                this.app.changeScene("driver", "scene-driver");
                break;
        }
    }

    update(dt) {
        // Здесь можно добавить логику обновления UI, если нужно
    }

    dispose() {
        console.log("CommanderScene dispose");
        
        const finishBtn = document.getElementById("simFinishButton");
        if (finishBtn) finishBtn.classList.add("hidden");

        if (this.el) {
            this.el.removeEventListener("click", this.handleAction);
        }
    }
}