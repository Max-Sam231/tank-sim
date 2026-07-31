// js/audio/AudioManager.js
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.isInitialized = false;

        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("Web Audio API не поддерживается", e);
        }

        this.prevState = {
            horn: false,
            commanderView: 'straight',
            instrumentPanel: false,
            isBatteryOn: false,
            starter: 0,
            bcn: 'off',
            engine_rpm: 0,
            engineRunning: false,
            leftTank: false,
            rightTank: false,
            airBleedValve: false,
            air_start_pressure: 0,
            ammeterButton: false,
            commanderCall: false,
            airIntake: false,
            emergencyHatchRotation: false,
            oilPumpGearbox: false,
            azr: 0,
            bcaTca: false,
            gpk: false,
            lightsAll: false,
            gabrateLights: false,
            leftLights: false,
            rightLights: false,
            sparkPlug: 1,
            engineStart: 1,
            combined: false,
            heating: false,
            waterAntifreeze: false
        };

        // Инициализация аудиообъектов
        this.sounds.horn = new Audio('/sounds/horn.mp3');
        this.sounds.hatch = new Audio('/sounds/hatch_move.mp3');
        this.sounds.panel = new Audio('/sounds/panel_open.mp3');
        this.sounds.click = new Audio('/sounds/click.mp3');
        this.sounds.switch = new Audio('/sounds/switch.mp3');
        this.sounds.starter = new Audio('/sounds/starter_crank.mp3');
        this.sounds.engine = new Audio('/sounds/engine_idle.mp3');
        this.sounds.engineLoad = new Audio('/sounds/engine_load.mp3');
        this.sounds.engineLoad.loop = true;
        this.sounds.engineLoad.volume = 0.0;
        this.sounds.fuel_pump = new Audio('/sounds/fuel_pump.mp3');

        this.sounds.valveOpen = new Audio('/sounds/valve_open.mp3');
        this.sounds.valveClose = new Audio('/sounds/valve_close.mp3');
        this.sounds.airHiss = new Audio('/sounds/air_hiss.mp3');

        // Настройка зацикленных звуков
        this.sounds.starter.loop = true;
        this.sounds.engine.loop = true;
        this.sounds.fuel_pump.loop = true;

        // Базовая громкость
        this.sounds.engine.volume = 0.4;
        this.sounds.starter.volume = 0.8; // Стартер должен быть слышен хорошо
        this.sounds.fuel_pump.volume = 0.6;
        this.sounds.airHiss.volume = 0.5;
        this.sounds.switch.volume = 0.7;
    }

    init() {
        if (this.isInitialized) return;

        console.log("🔊 AudioManager: попытка разблокировки...");

        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("✅ AudioContext разблокирован");
                this._finalizeInit();
            }).catch(err => {
                console.warn("⚠️ Не удалось разблокировать AudioContext:", err);
                this._finalizeInit();
            });
        } else {
            this._finalizeInit();
        }
    }

    _finalizeInit() {
        const dummy = this.sounds.click;
        if (dummy) {
            dummy.volume = 0.01;
            dummy.play().then(() => {
                dummy.pause();
                dummy.currentTime = 0;
                dummy.volume = 1.0;
                this.isInitialized = true;
                console.log("✅ AudioManager: Звук РАЗБЛОКИРОВАН и готов к работе");
            }).catch(err => {
                console.warn("⚠️ HTML Audio не разблокирован:", err.message);
                this.isInitialized = true;
            });
        } else {
            this.isInitialized = true;
        }
    }

    play(name) {
        if (!this.isInitialized) {
            console.log("🔁 AudioManager: авто-разблокировка при попытке воспроизвести [" + name + "]");
            this.init();
            setTimeout(() => this.play(name), 100);
            return;
        }

        const sound = this.sounds[name];
        if (sound) {
            console.log(`🔊 Воспроизведение: ${name}`);
            sound.currentTime = 0;
            sound.play().catch(e => console.error(`❌ Ошибка воспроизведения [${name}]:`, e));
        } else {
            console.warn(`⚠️ AudioManager: Звук [${name}] не найден`);
        }
    }

    stop(name) {
        const sound = this.sounds[name];
        if (sound && !sound.paused) {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    stopAll() {
        for (const name in this.sounds) {
            const sound = this.sounds[name];
            if (sound && typeof sound.pause === 'function') {
                sound.pause();
                sound.currentTime = 0;
            }
        }
        this.prevState = {
            horn: false,
            commanderView: 'straight',
            instrumentPanel: false,
            isBatteryOn: false,
            starter: 0,
            bcn: 'off',
            engine_rpm: 0,
            engineRunning: false,
            leftTank: false,
            rightTank: false,
            airBleedValve: false,
            air_start_pressure: 0,
            ammeterButton: false,
            commanderCall: false,
            airIntake: false,
            emergencyHatchRotation: false,
            oilPumpGearbox: false,
            azr: 0,
            bcaTca: false,
            gpk: false,
            lightsAll: false,
            gabrateLights: false,
            leftLights: false,
            rightLights: false,
            sparkPlug: 1,
            engineStart: 1,
            combined: false,
            heating: false,
            waterAntifreeze: false
        };
    }

    // НОВЫЙ МЕТОД: Управляет звуком прокрутки стартера на основе РЕАЛЬНЫХ оборотов
    updateStarterSound(rpm, isRunning) {
        if (!this.isInitialized) return;
        const starterSound = this.sounds.starter;

        // Стартер звучит ТОЛЬКО если есть обороты, но двигатель еще НЕ запустился
        const isCranking = rpm > 0 && !isRunning;

        if (isCranking) {
            if (starterSound.paused) {
                starterSound.play().catch(e => console.error('Ошибка звука стартера:', e));
            }
            // Можно слегка менять тональность от оборотов, как у двигателя
            const rate = 1.0 + ((rpm - 100) / 200) * 0.3;
            starterSound.playbackRate = Math.max(0.8, Math.min(1.5, rate));
        } else {
            if (!starterSound.paused) {
                starterSound.pause();
                starterSound.currentTime = 0;
            }
        }
    }
    _getThrottleValue(state) {
        if (!state.engineRunning) return 0;

        // Педаль газа дает базовую тягу ~70%
        const gasPull = state.gasPedal ? 0.7 : 0.0;
        // Ручная подача дает дополнительные 0-50%
        const manualPull = (state.fuelManualFeed / 100) * 0.5;

        // Суммарная тяга ограничена 1.0 (100%)
        return Math.min(1.0, gasPull + manualPull);
    }

    // ЗАМЕНИТЕ СТАРЫЙ updateEngineSound НА ЭТОТ
    updateEngineSound(rpm, isRunning, state) {
        if (!this.isInitialized || !isRunning) {
            this.sounds.engine.pause();
            if (this.sounds.engineLoad) this.sounds.engineLoad.pause();
            return;
        }

        const throttle = this._getThrottleValue(state);
        const idle = this.sounds.engine;
        const load = this.sounds.engineLoad;

        //  ВОТ ТЕ САМЫЕ СТРОКИ, КОТОРЫЕ ВЫ ИСКАЛИ 
        // Холостой ход затихает при нажатии газа (от 0.4 до 0.08)
        idle.volume = 0.2 * (1.0 - throttle * 0.8);

        // Нагрузка нарастает при нажатии газа (от 0.0 до 0.6)
        if (load) load.volume = 0.9 * throttle;

        // Управляем воспроизведением, чтобы не грузить процессор тишиной
        if (idle.paused && idle.volume > 0.01) idle.play().catch(() => { });
        else if (!idle.paused && idle.volume <= 0.01) { idle.pause(); idle.currentTime = 0; }

        if (load && load.paused && load.volume > 0.01) load.play().catch(() => { });
        else if (load && !load.paused && load.volume <= 0.01) { load.pause(); load.currentTime = 0; }

        // Тональность зависит ТОЛЬКО от RPM (одинаково для обоих треков)
        const rate = 1.0 + ((rpm - 900) / 1600) * 0.6;
        const finalRate = Math.max(0.8, Math.min(1.8, rate));

        idle.playbackRate = finalRate;
        if (load) load.playbackRate = finalRate;
    }
    onStateChange(state) {
        // 1. Сигнал танка
        if (state.horn && !this.prevState.horn) {
            console.log("📢 Сигнал танка");
            this.play('horn');
        } else if (!state.horn && this.prevState.horn) {
            this.stop('horn');
        }

        // 2. Переход между люками
        if (state.commanderView !== this.prevState.commanderView) {
            console.log(" Переход между люками");
            this.play('hatch');
        }

        // 3. Открытие приборной панели
        if (state.instrumentPanel !== this.prevState.instrumentPanel) {
            this.play('panel');
        }

        // 4. Щелчки тумблеров (масса)
        if (state.isBatteryOn !== this.prevState.isBatteryOn) {
            console.log(" Включение/выключение массы");
            this.play('click');
        }

        // 5. Стартер (звук щелчка кнопки оставляем для обратной связи интерфейса)
        if (state.starter === 2 && this.prevState.starter !== 2) {
            // Этот клик можно убрать, если хотите только механический звук прокрутки
            // this.play('click'); 
        } else if (state.starter !== 2 && this.prevState.starter === 2) {
            // this.stop('click');
        }

        // 6. БЦН (подкачка топлива)
        if (state.bcn === 'pump' && this.prevState.bcn !== 'pump') {
            this.play('fuel_pump');
        } else if (state.bcn !== 'pump' && this.prevState.bcn === 'pump') {
            this.stop('fuel_pump');
        }

        // 7. Открытие/закрытие левого баллона
        if (state.leftTank && !this.prevState.leftTank) {
            console.log("🔵 Открыт левый баллон");
            this.play('valveOpen');
        } else if (!state.leftTank && this.prevState.leftTank) {
            console.log("🔴 Закрыт левый баллон");
            this.play('valveClose');
        }

        // 8. Открытие/закрытие правого баллона
        if (state.rightTank && !this.prevState.rightTank) {
            console.log("🔵 Открыт правый баллон");
            this.play('valveOpen');
        } else if (!state.rightTank && this.prevState.rightTank) {
            console.log("🔴 Закрыт правый баллон");
            this.play('valveClose');
        }

        // 9. Открытие/закрытие воздушного крана (ЕДИНОРАЗОВЫЙ ЗВУК)
        if (state.airBleedValve && !this.prevState.airBleedValve) {
            console.log("💨 Открыт воздушный кран");
            this.play('valveOpen');

            const hasPressure = state.air_start_pressure > 5.0;
            const isTankOpen = state.leftTank || state.rightTank;

            if (hasPressure && isTankOpen) {
                console.log("💨 ПШШШ! Стравливание воздуха (единоразово)");
                this.play('airHiss');
            } else {
                console.warn("⚠️ Кран открыт, но нет давления или баллоны закрыты.");
            }
        } else if (!state.airBleedValve && this.prevState.airBleedValve) {
            console.log("🔴 Закрыт воздушный кран");
            this.play('valveClose');
            this.stop('airHiss');
        }

        // ==========================================
        // КНОПКИ НА ПРИБОРНОЙ ПАНЕЛИ (звук click)
        // ==========================================

        if (state.azr !== this.prevState.azr) {
            console.log("🔘 АЗР переключен");
            this.play('click');
        }

        if (state.ammeterButton !== this.prevState.ammeterButton) {
            console.log("🔘 Нажата кнопка вольтметра");
            this.play('click');
        }

        if (state.commanderCall !== this.prevState.commanderCall) {
            console.log("🔔 Вызов командира");
            this.play('click');
        }

        if (state.airIntake !== this.prevState.airIntake) {
            console.log("💨 Воздухоприток");
            this.play('click');
        }

        if (state.emergencyHatchRotation !== this.prevState.emergencyHatchRotation) {
            console.log("⚠️ Аварийный поворот люка");
            this.play('click');
        }

        if (state.oilPumpGearbox !== this.prevState.oilPumpGearbox) {
            console.log("⚙️ Маслонасос КПП");
            this.play('click');
        }

        // ==========================================
        // ТУМБЛЕРЫ И РЫЧАЖКИ (звук switch)
        // ==========================================

        if (state.bcaTca !== this.prevState.bcaTca) {
            console.log("🔀 БЦА/ТЦА: " + (state.bcaTca ? "ВКЛ" : "ВЫКЛ"));
            this.play('switch');
        }

        if (state.gpk !== this.prevState.gpk) {
            console.log("🔀 ГПК: " + (state.gpk ? "ВКЛ" : "ВЫКЛ"));
            this.play('switch');
        }

        if (state.lightsAll !== this.prevState.lightsAll) {
            console.log("💡 Все огни: " + (state.lightsAll ? "ВКЛ" : "ВЫКЛ"));
            this.play('switch');
        }

        if (state.gabrateLights !== this.prevState.gabrateLights) {
            console.log("💡 Габаритные огни: " + (state.gabrateLights ? "ВКЛ" : "ВЫКЛ"));
            this.play('switch');
        }

        if (state.leftLights !== this.prevState.leftLights) {
            console.log("💡 Левые фары: " + (state.leftLights ? "ВКЛ" : "ВЫКЛ"));
            this.play('switch');
        }

        if (state.rightLights !== this.prevState.rightLights) {
            console.log("💡 Правые фары: " + (state.rightLights ? "ВКЛ" : "ВЫКЛ"));
            this.play('switch');
        }

        if (state.sparkPlug !== this.prevState.sparkPlug) {
            console.log("🔥 Свеча накаливания: положение " + state.sparkPlug);
            this.play('switch');
        }

        if (state.engineStart !== this.prevState.engineStart) {
            console.log("🔧 Запуск двигателя: положение " + state.engineStart);
            this.play('switch');
        }

        if (state.combined !== this.prevState.combined) {
            console.log("🔀 Комбинированный режим: " + (state.combined ? "ВКЛ" : "ВЫКЛ"));
            this.play('switch');
        }

        if (state.heating !== this.prevState.heating) {
            console.log("🌡️ Обогрев: " + (state.heating ? "ВКЛ" : "ВЫКЛ"));
            this.play('switch');
        }

        if (state.waterAntifreeze !== this.prevState.waterAntifreeze) {
            console.log("💧 Вода/Антифриз: " + (state.waterAntifreeze ? "ВКЛ" : "ВЫКЛ"));
            this.play('switch');
        }

        // ==========================================
        // НЕПРЕРЫВНЫЕ ЗВУКИ (двигатель и стартер)
        // ==========================================

        // Сначала обновляем стартер (он приоритетнее, пока мотор не завелся)
        this.updateStarterSound(state.engine_rpm, state.engineRunning);

        // Затем двигатель
        this.updateEngineSound(state.engine_rpm, state.engineRunning, state);

        // ОБНОВЛЕНИЕ prevState (СТРОГО В КОНЦЕ)
        this.prevState = {
            horn: state.horn,
            commanderView: state.commanderView,
            instrumentPanel: state.instrumentPanel,
            isBatteryOn: state.isBatteryOn,
            starter: state.starter,
            bcn: state.bcn,
            engine_rpm: state.engine_rpm,
            engineRunning: state.engineRunning,
            leftTank: state.leftTank,
            rightTank: state.rightTank,
            airBleedValve: state.airBleedValve,
            air_start_pressure: state.air_start_pressure,
            ammeterButton: state.ammeterButton,
            commanderCall: state.commanderCall,
            airIntake: state.airIntake,
            emergencyHatchRotation: state.emergencyHatchRotation,
            oilPumpGearbox: state.oilPumpGearbox,
            azr: state.azr,
            bcaTca: state.bcaTca,
            gpk: state.gpk,
            lightsAll: state.lightsAll,
            gabrateLights: state.gabrateLights,
            leftLights: state.leftLights,
            rightLights: state.rightLights,
            sparkPlug: state.sparkPlug,
            engineStart: state.engineStart,
            combined: state.combined,
            heating: state.heating,
            waterAntifreeze: state.waterAntifreeze
        };
    }
}