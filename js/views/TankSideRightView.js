export class TankSideRightView {
    constructor(app, scene) {
        this.app = app;
        this.scene = scene;
    }

    init() {
        console.log("TankSideRightView init");
        this._setupXrayToggle();
    }

    _setupXrayToggle() {
        const xrayBtn = document.getElementById("xrayBtnRight");
        // Используем querySelector вместо getElementById
        const tankImg = document.querySelector("#tank-side-right-view .tank-layer-side-right");
        
        console.log("🔍 xrayBtn:", xrayBtn);
        console.log("🔍 tankImg:", tankImg);
        
        if (!xrayBtn) {
            console.error("❌ Кнопка #xrayBtnRight не найдена");
            return;
        }
        
        if (!tankImg) {
            console.error("❌ Картинка танка не найдена");
            return;
        }

        xrayBtn.classList.remove("hidden");
        console.log("✅ Кнопка рентгена активирована");
        
        xrayBtn.onclick = () => {
            console.log("🔘 Клик по кнопке Рентген");
            const isXray = tankImg.classList.contains("xray-active");
            console.log("📊 Текущее состояние isXray:", isXray);
            
            if (tankImg.dataset.transitioning === "1") {
                console.log("⏳ Анимация уже идёт, пропускаем клик");
                return;
            }
            
            tankImg.dataset.transitioning = "1";
            
            // Перезапуск анимации
            tankImg.classList.remove("xray-transition", "normal-transition");
            void tankImg.offsetWidth; // Триггер рефлоу
            tankImg.classList.add(isXray ? "normal-transition" : "xray-transition");
            
            // Смена изображения
            const newSrc = isXray 
                ? "./img/hangar/tank_side_right.png" 
                : "./img/hangar/tank_side_right_xray.png";
            
            console.log("🔄 Меняем src на:", newSrc);
            
            const preload = new Image();
            preload.onload = () => {
                console.log("✅ Картинка загружена");
                tankImg.src = newSrc;
                tankImg.classList.toggle("xray-active", !isXray);
                xrayBtn.classList.toggle("is-active", !isXray);
                xrayBtn.textContent = isXray ? "Рентген" : "Обычный вид";
                
                setTimeout(() => {
                    tankImg.dataset.transitioning = "0";
                }, 400);
            };
            
            preload.onerror = () => {
                console.error("❌ Не удалось загрузить:", newSrc);
                tankImg.dataset.transitioning = "0";
            };
            
            preload.src = newSrc;
        };
    }

    resetXrayState() {
        const xrayBtn = document.getElementById("xrayBtnRight");
        const tankImg = document.querySelector("#tank-side-right-view .tank-layer-side-right");
        
        if (xrayBtn) {
            xrayBtn.classList.add("hidden");
            xrayBtn.textContent = "Рентген";
            xrayBtn.classList.remove("is-active");
        }
        if (tankImg) {
            tankImg.classList.remove("xray-active", "xray-transition", "normal-transition");
            tankImg.src = "./img/hangar/tank_side_right.png";
            tankImg.dataset.transitioning = "0";
        }
    }

    dispose() {
        this.resetXrayState();
        console.log("TankSideRightView dispose");
    }
}