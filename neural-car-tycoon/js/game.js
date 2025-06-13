// Clase principal del juego Neural Car Tycoon
class Game {
    constructor() {
        console.log('🎮 Inicializando Game...');
        
        // Canvas y contexto
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.canvas || !this.ctx) {
            console.error('❌ Error: No se pudo obtener el canvas o contexto');
            return;
        }
        
        console.log('✅ Canvas obtenido:', this.canvas.width, 'x', this.canvas.height);
        
        // Canvas para red neuronal
        this.networkCanvas = document.getElementById('networkCanvas');
        this.networkCtx = this.networkCanvas.getContext('2d');
        
        if (!this.networkCanvas || !this.networkCtx) {
            console.error('❌ Error: No se pudo obtener el canvas de red neuronal');
            return;
        }
        
        console.log('✅ Network canvas obtenido:', this.networkCanvas.width, 'x', this.networkCanvas.height);
        
        // Sistemas del juego
        this.road = new Road(this.canvas.width / 2, this.canvas.width * 0.9, 3);
        console.log('✅ Road creado');
        
        this.car = new Car(this.road.getLaneCenter(1), 100);
        console.log('✅ Car creado en posición:', this.car.x, this.car.y);
        
        this.economy = new Economy();
        console.log('✅ Economy creado');
        
        this.upgradeSystem = new UpgradeSystem(this.economy);
        console.log('✅ UpgradeSystem creado');
        
        // Estado del juego
        this.isPaused = false;
        this.gameSpeed = 1;
        this.showSensors = false;
        this.purchaseInProgress = false; // Prevenir compras múltiples
        
        // Cámara
        this.camera = { x: 0, y: 0 };
        
        // Sistema de aprendizaje mejorado
        this.lastTrainingTime = 0;
        this.trainingInterval = 1000; // Entrenar cada segundo (más frecuente)
        this.bestFitness = 0;
        this.bestBrain = null;
        this.generationCount = 0;
        this.stagnationCounter = 0;
        this.maxStagnation = 5; // Máximo 5 generaciones sin mejora
        
        // Notificaciones de dinero
        this.moneyNotifications = new MoneyNotification();
        console.log('✅ MoneyNotification creado');
        
        // Estadísticas
        this.stats = {
            sessionTime: 0,
            totalEarnings: 0,
            totalDistance: 0
        };
        
        // Timing
        this.lastTime = 0;
        this.accumulatedTime = 0;
        
        console.log('🔧 Inicializando UI...');
        this.initializeUI();
        
        console.log('💰 Verificando idle income...');
        this.checkIdleIncome();
        
        // Aplicar upgrades guardados al auto
        console.log('⚡ Aplicando upgrades...');
        this.upgradeSystem.applyAllUpgrades(this.car);
        
        console.log('🎮 Game inicializado correctamente');
    }
    
    initializeUI() {
        // Generar UI de upgrades
        this.updateUpgradesUI();
        
        // Actualizar UI inicial
        this.updateUI();
    }
    
    checkIdleIncome() {
        const idleData = this.economy.calculateIdleIncome();
        if (idleData) {
            this.showIdleIncomeModal(idleData);
        }
    }
    
    showIdleIncomeModal(idleData) {
        const modal = document.createElement('div');
        modal.className = 'idle-income-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>¡Bienvenido de vuelta!</h2>
                <p>Tu auto estuvo trabajando mientras no estabas</p>
                <div class="idle-stats">
                    <div>Tiempo ausente: ${this.economy.formatTime(idleData.hours)}</div>
                    <div>Ingresos generados: $${this.economy.formatMoney(idleData.amount)}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove(); game.economy.applyIdleIncome(${JSON.stringify(idleData)}); game.updateUI();">
                    ¡Recoger Dinero!
                </button>
            </div>
        `;
        
        // Añadir estilos del modal
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 1000;
        `;
        
        modal.querySelector('.modal-content').style.cssText = `
            background: white; padding: 30px; border-radius: 15px;
            text-align: center; max-width: 400px;
        `;
        
        document.body.appendChild(modal);
    }
    
    update(deltaTime) {
        if (this.isPaused) return;
        
        const scaledDeltaTime = deltaTime * this.gameSpeed;
        this.stats.sessionTime += scaledDeltaTime;
        
        // Actualizar auto
        this.car.update(this.road.borders, this.road.traffic, scaledDeltaTime);
        
        // Debug temporal
        if (Math.random() < 0.01) { // 1% de probabilidad por frame
            console.log('Auto speed:', this.car.speed.toFixed(2), 'Position:', this.car.x.toFixed(1), this.car.y.toFixed(1));
        }
        
        // Actualizar carretera
        this.road.update(this.car.y, scaledDeltaTime);
        
        // Generar ingresos
        if (!this.car.damaged) {
            const baseIncome = this.economy.calculateIncome(this.car);
            const upgradeMultiplier = this.upgradeSystem.getIncomeMultiplier();
            const totalIncome = baseIncome * upgradeMultiplier * scaledDeltaTime;
            
            if (totalIncome > 0) {
                this.economy.addMoney(totalIncome);
                this.stats.totalEarnings += totalIncome;
                
                // Mostrar notificación de dinero ocasionalmente
                if (Math.random() < 0.02) { // 2% de probabilidad por frame
                    this.moneyNotifications.addNotification(
                        totalIncome * 50, // Mostrar ingresos de ~1 segundo
                        this.car.x,
                        this.car.y - 30
                    );
                }
            }
        }
        
        // Actualizar notificaciones de dinero
        this.moneyNotifications.update(scaledDeltaTime);
        
        // Entrenar IA periódicamente
        this.updateAITraining(scaledDeltaTime);
        
        // Actualizar cámara
        this.updateCamera();
        
        // Resetear auto si está dañado por mucho tiempo
        if (this.car.damaged && this.car.stats.timeAlive > 3000) {
            this.resetCar();
        }
        
        // Actualizar estadísticas
        this.stats.totalDistance = this.car.totalDistance;
    }
    
    updateAITraining(deltaTime) {
        this.lastTrainingTime += deltaTime;
        
        // Entrenamiento adaptativo - más frecuente si está progresando bien
        const avgSpeed = this.car.totalDistance / Math.max(1, this.car.stats.timeAlive);
        const isProgressing = avgSpeed > 0.5 && !this.car.damaged;
        
        // Intervalo dinámico: más rápido si progresa, más lento si está atrapado
        const dynamicInterval = isProgressing ? 
            this.trainingInterval * 0.5 : // 500ms si progresa bien
            this.trainingInterval * 1.5;   // 1500ms si está atrapado
        
        if (this.lastTrainingTime >= dynamicInterval) {
            this.trainAI();
            this.lastTrainingTime = 0;
            
            // Auto-generación si el auto está funcionando muy bien
            if (avgSpeed > 1.0 && this.car.stats.timeAlive > 200 && this.car.totalDistance > 500) {
                console.log('🚀 Auto funcionando excelente - generando nueva generación automáticamente');
                this.nextGeneration();
            }
        }
        
        // Reseteo automático si está dañado por mucho tiempo
        if (this.car.damaged && this.car.stats.timeAlive > 150) {
            console.log('🔄 Auto dañado por mucho tiempo - reseteando');
            this.resetCar();
        }
    }
    
    trainAI() {
        // Sistema de aprendizaje avanzado basado en algoritmos genéticos
        const currentFitness = this.car.getFitness();
        const avgSpeed = this.car.totalDistance / Math.max(1, this.car.stats.timeAlive);
        
        console.log(`🧠 Evaluando IA - Fitness: ${currentFitness.toFixed(2)}, Velocidad: ${avgSpeed.toFixed(2)}`);
        
        // Verificar si es el mejor cerebro hasta ahora
        if (currentFitness > this.bestFitness) {
            this.bestFitness = currentFitness;
            this.bestBrain = this.car.brain.copy();
            this.stagnationCounter = 0;
            console.log(`🏆 ¡Nuevo récord! Fitness: ${this.bestFitness.toFixed(2)}`);
        } else {
            this.stagnationCounter++;
        }
        
        // Estrategias de aprendizaje adaptativo
        if (this.stagnationCounter >= this.maxStagnation) {
            // Estancamiento detectado - aplicar evolución agresiva
            this.evolveAggressively();
        } else if (avgSpeed < 0.3 && this.car.stats.timeAlive > 100) {
            // Auto atrapado - aplicar shock de exploración
            this.applyExplorationShock();
        } else if (currentFitness > 0) {
            // Evolución normal
            this.evolveNormally();
        } else {
            // Fitness muy bajo - reiniciar con mejores genes
            this.resetWithBestGenes();
        }
    }
    
    evolveAggressively() {
        console.log('🔥 Evolución agresiva - rompiendo estancamiento');
        
        if (this.bestBrain) {
            // Usar el mejor cerebro como base
            this.car.brain = this.bestBrain.copy();
            
            // Aplicar mutación agresiva
            this.car.brain.mutate(0.6, 0.4); // 60% probabilidad, 40% fuerza
            
            // Añadir diversidad genética
            this.addGeneticDiversity();
        } else {
            // No hay mejor cerebro, crear uno nuevo
            this.car.brain = new NeuralNetwork(this.car.sensorCount, 8, 4); // Más neuronas
        }
        
        this.stagnationCounter = 0;
        this.generationCount++;
        this.resetCar();
    }
    
    applyExplorationShock() {
        console.log('⚡ Shock de exploración - escapando de trampa local');
        
        const mutationRate = this.upgradeSystem.getMutationRate();
        const learningRate = this.upgradeSystem.getLearningRate();
        
        // Mutación dirigida para escapar de comportamientos circulares
        this.car.brain.mutate(mutationRate * 4, 0.3);
        
        // Bias hacia movimiento hacia adelante
        this.biasForwardMovement();
        
        // Resetear posición
        this.resetCar();
    }
    
    evolveNormally() {
        const mutationRate = this.upgradeSystem.getMutationRate();
        const learningRate = this.upgradeSystem.getLearningRate();
        
        // Mutación adaptativa basada en performance
        const performanceRatio = this.bestFitness > 0 ? this.car.getFitness() / this.bestFitness : 0.5;
        const adaptiveMutationRate = mutationRate * (2 - performanceRatio); // Más mutación si performance es baja
        
        this.car.brain.mutate(adaptiveMutationRate * learningRate, 0.15);
        
        console.log(`🧬 Evolución normal - Mutación: ${(adaptiveMutationRate * 100).toFixed(1)}%`);
    }
    
    resetWithBestGenes() {
        console.log('🔄 Reiniciando con mejores genes');
        
        if (this.bestBrain) {
            this.car.brain = this.bestBrain.copy();
            // Pequeña mutación para explorar variaciones
            this.car.brain.mutate(0.2, 0.1);
        } else {
            // Crear cerebro optimizado para conducir
            this.car.brain = this.createOptimizedBrain();
        }
        
        this.resetCar();
    }
    
    createOptimizedBrain() {
        // Crear una red neuronal con bias hacia conducción eficiente
        const brain = new NeuralNetwork(this.car.sensorCount, 8, 4);
        
        // Bias los pesos para favorecer movimiento hacia adelante
        for (let i = 0; i < brain.hiddenCount; i++) {
            for (let j = 0; j < brain.outputCount; j++) {
                if (j === 0) { // Output de "forward"
                    brain.weightsHiddenOutput[i][j] = Math.abs(brain.weightsHiddenOutput[i][j]);
                } else if (j === 3) { // Output de "brake"
                    brain.weightsHiddenOutput[i][j] = -Math.abs(brain.weightsHiddenOutput[i][j]);
                }
            }
        }
        
        return brain;
    }
    
    biasForwardMovement() {
        // Ajustar pesos para favorecer movimiento hacia adelante
        const brain = this.car.brain;
        
        for (let i = 0; i < brain.hiddenCount; i++) {
            // Aumentar bias hacia forward (output 0)
            brain.weightsHiddenOutput[i][0] += 0.2;
            // Reducir bias hacia brake (output 3)
            brain.weightsHiddenOutput[i][3] -= 0.2;
        }
        
        // Ajustar bias de output
        brain.outputBias[0] += 0.1; // Forward
        brain.outputBias[3] -= 0.1; // Brake
    }
    
    addGeneticDiversity() {
        // Añadir diversidad genética para evitar convergencia prematura
        const brain = this.car.brain;
        
        // Mutación aleatoria en 20% de las conexiones
        for (let i = 0; i < brain.inputCount; i++) {
            for (let j = 0; j < brain.hiddenCount; j++) {
                if (Math.random() < 0.2) {
                    brain.weightsInputHidden[i][j] += (Math.random() - 0.5) * 0.5;
                }
            }
        }
        
        for (let i = 0; i < brain.hiddenCount; i++) {
            for (let j = 0; j < brain.outputCount; j++) {
                if (Math.random() < 0.2) {
                    brain.weightsHiddenOutput[i][j] += (Math.random() - 0.5) * 0.5;
                }
            }
        }
    }
    
    updateCamera() {
        // Seguir al auto con la cámara (más suave)
        this.camera.x = this.car.x - this.canvas.width / 2;
        this.camera.y = this.car.y - this.canvas.height * 0.8;
    }
    
    draw() {
        // Log ocasional para debug
        if (Math.random() < 0.01) { // 1% de probabilidad por frame
            console.log('🎨 Dibujando frame - Auto en:', this.car.x.toFixed(1), this.car.y.toFixed(1));
        }
        
        // Limpiar canvas
        this.ctx.fillStyle = '#87CEEB'; // Color cielo
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Aplicar transformación de cámara
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Dibujar carretera
        this.road.draw(this.ctx, this.car.y);
        
        // Dibujar auto
        this.car.draw(this.ctx, this.showSensors);
        
        // Dibujar notificaciones de dinero
        this.moneyNotifications.draw(this.ctx);
        
        this.ctx.restore();
        
        // Dibujar UI superpuesta
        this.drawOverlayUI();
        
        // Dibujar red neuronal
        this.drawNeuralNetwork();
    }
    
    drawOverlayUI() {
        // Información de debug en la esquina
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 100);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Velocidad: ${this.car.speed.toFixed(1)}`, 20, 30);
        this.ctx.fillText(`Distancia: ${(this.car.totalDistance / 100).toFixed(1)}m`, 20, 50);
        this.ctx.fillText(`Eficiencia: ${(this.car.stats.efficiency * 100).toFixed(1)}%`, 20, 70);
        this.ctx.fillText(`Estado: ${this.car.damaged ? 'Dañado' : 'Activo'}`, 20, 90);
    }
    
    drawNeuralNetwork() {
        if (!this.car.brain) return;
        
        const ctx = this.networkCtx;
        const width = this.networkCanvas.width;
        const height = this.networkCanvas.height;
        
        // Limpiar
        ctx.fillStyle = '#f7fafc';
        ctx.fillRect(0, 0, width, height);
        
        const network = this.car.brain;
        const margin = 20;
        const layerWidth = (width - margin * 2) / 3;
        
        // Posiciones de las capas
        const layers = [
            { neurons: network.inputCount, x: margin, values: network.inputLayer },
            { neurons: network.hiddenCount, x: margin + layerWidth, values: network.hiddenLayer },
            { neurons: network.outputCount, x: margin + layerWidth * 2, values: network.outputLayer }
        ];
        
        // Dibujar conexiones
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < layers.length - 1; i++) {
            const currentLayer = layers[i];
            const nextLayer = layers[i + 1];
            
            for (let j = 0; j < currentLayer.neurons; j++) {
                for (let k = 0; k < nextLayer.neurons; k++) {
                    const y1 = (height / (currentLayer.neurons + 1)) * (j + 1);
                    const y2 = (height / (nextLayer.neurons + 1)) * (k + 1);
                    
                    ctx.beginPath();
                    ctx.moveTo(currentLayer.x, y1);
                    ctx.lineTo(nextLayer.x, y2);
                    ctx.stroke();
                }
            }
        }
        
        // Dibujar neuronas
        layers.forEach((layer, layerIndex) => {
            for (let i = 0; i < layer.neurons; i++) {
                const y = (height / (layer.neurons + 1)) * (i + 1);
                const value = layer.values && layer.values[i] ? layer.values[i] : 0;
                
                // Color basado en activación
                const intensity = Math.abs(value);
                const color = value > 0 ? 
                    `rgba(34, 197, 94, ${intensity})` : 
                    `rgba(239, 68, 68, ${intensity})`;
                
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(layer.x, y, 8, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.strokeStyle = '#374151';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
        
        // Labels
        ctx.fillStyle = '#374151';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sensores', layers[0].x, height - 5);
        ctx.fillText('Oculta', layers[1].x, height - 5);
        ctx.fillText('Acciones', layers[2].x, height - 5);
    }
    
    updateUI() {
        // Actualizar display de dinero
        const moneyElement = document.getElementById('money');
        if (moneyElement) {
            moneyElement.textContent = this.economy.formatMoney();
        }
        
        // Actualizar estadísticas
        const distanceElement = document.getElementById('distance');
        if (distanceElement) {
            distanceElement.textContent = Math.floor(this.car.totalDistance / 100);
        }
        
        const speedElement = document.getElementById('speed');
        if (speedElement) {
            speedElement.textContent = Math.floor(this.car.speed * 10);
        }
        
        const incomeElement = document.getElementById('income-rate');
        if (incomeElement) {
            const rate = this.economy.incomeRate * 60; // Por minuto
            incomeElement.textContent = this.economy.formatMoney(rate);
        }
        
        // Actualizar info de red neuronal
        const neuronCountElement = document.getElementById('neuron-count');
        if (neuronCountElement) {
            const info = this.car.brain.getNetworkInfo();
            neuronCountElement.textContent = info.totalNeurons;
        }
        
        const layerCountElement = document.getElementById('layer-count');
        if (layerCountElement) {
            layerCountElement.textContent = '3'; // Input, Hidden, Output
        }
        
        // Actualizar upgrades
        this.updateUpgradesUI();
    }
    
    updateUpgradesUI() {
        const upgradesContainer = document.getElementById('upgrades-list');
        if (!upgradesContainer) return;

        const upgrades = this.upgradeSystem.getAllUpgrades();
        
        // Solo recrear si el número de upgrades cambió
        const currentUpgradeCount = upgradesContainer.children.length;
        if (currentUpgradeCount !== upgrades.length) {
            upgradesContainer.innerHTML = '';
            this.createUpgradeElements(upgradesContainer, upgrades);
        } else {
            // Solo actualizar el contenido existente
            this.updateExistingUpgradeElements(upgradesContainer, upgrades);
        }
    }
    
    createUpgradeElements(container, upgrades) {
        upgrades.forEach(upgrade => {
            const upgradeElement = document.createElement('div');
            upgradeElement.className = 'upgrade-item';
            upgradeElement.setAttribute('data-upgrade-id', upgrade.id);
            
            upgradeElement.innerHTML = `
                <div class="upgrade-info">
                    <div class="upgrade-name"></div>
                    <div class="upgrade-description">${upgrade.description}</div>
                </div>
                <div class="upgrade-cost"></div>
                <button class="upgrade-btn" data-upgrade-id="${upgrade.id}">
                    Comprar
                </button>
            `;
            
            // Añadir event listener UNA SOLA VEZ
            const button = upgradeElement.querySelector('.upgrade-btn');
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // Prevenir múltiples clicks
                if (button.disabled) return;
                
                const upgradeId = button.getAttribute('data-upgrade-id');
                this.purchaseUpgrade(upgradeId);
            }, { once: false, passive: false });
            
            upgradeElement.style.cssText = `
                display: flex; align-items: center; gap: 10px; padding: 10px;
                border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px;
                background: #ffffff; transition: all 0.2s ease;
            `;
            
            container.appendChild(upgradeElement);
        });
        
        // Actualizar contenido después de crear
        this.updateExistingUpgradeElements(container, upgrades);
    }
    
    updateExistingUpgradeElements(container, upgrades) {
        upgrades.forEach((upgrade, index) => {
            const upgradeElement = container.children[index];
            if (!upgradeElement) return;
            
            const nameElement = upgradeElement.querySelector('.upgrade-name');
            const costElement = upgradeElement.querySelector('.upgrade-cost');
            const button = upgradeElement.querySelector('.upgrade-btn');
            
            try {
                if (nameElement) {
                    const maxLevel = upgrade.isMaxLevel ? ' (MAX)' : '';
                    nameElement.textContent = `${upgrade.name} (${upgrade.level}/${upgrade.maxLevel})${maxLevel}`;
                }
                
                if (costElement) {
                    const formattedCost = this.economy.formatMoney(upgrade.currentCost);
                    costElement.textContent = `$${formattedCost}`;
                }
                
                if (button) {
                    button.disabled = !upgrade.canAfford || upgrade.isMaxLevel;
                    button.textContent = upgrade.isMaxLevel ? 'MAX' : 'Comprar';
                    
                    // Actualizar estilos del botón
                    if (button.disabled) {
                        button.style.background = '#cbd5e0';
                        button.style.cursor = 'not-allowed';
                        button.style.transform = 'none';
                    } else {
                        button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                        button.style.cursor = 'pointer';
                    }
                }
                
                // Actualizar estilo del contenedor
                upgradeElement.style.background = upgrade.canAfford ? '#ffffff' : '#f8f9fa';
                
            } catch (error) {
                console.error('Error updating upgrade element:', error, upgrade);
            }
        });
    }
    
    purchaseUpgrade(upgradeId) {
        // Prevenir compras múltiples rápidas
        if (this.purchaseInProgress) {
            console.log('Compra ya en progreso, ignorando...');
            return;
        }
        
        this.purchaseInProgress = true;
        
        try {
            // Validar que tenemos los sistemas necesarios
            if (!this.upgradeSystem) {
                console.error('Sistema de upgrades no inicializado');
                return;
            }
            
            if (!this.economy) {
                console.error('Sistema económico no inicializado');
                return;
            }
            
            if (!this.car) {
                console.error('Auto no inicializado');
                return;
            }
            
            const upgrade = this.upgradeSystem.getUpgrade(upgradeId);
            if (!upgrade) {
                console.error('Upgrade no encontrado:', upgradeId);
                return;
            }
            
            console.log('Intentando comprar upgrade:', upgrade.name, 'Costo:', upgrade.currentCost, 'Dinero disponible:', this.economy.money);
            
            if (!upgrade.canAfford) {
                console.log('No tienes suficiente dinero para:', upgrade.name, 'Necesitas:', upgrade.currentCost, 'Tienes:', this.economy.money);
                return;
            }
            
            if (upgrade.isMaxLevel) {
                console.log('Upgrade ya está al máximo nivel:', upgrade.name);
                return;
            }
            
            // Intentar comprar
            const purchaseResult = this.upgradeSystem.purchaseUpgrade(upgradeId, this.car);
            console.log('Resultado de compra:', purchaseResult);
            
            if (purchaseResult) {
                // Feedback visual
                const button = document.querySelector(`[data-upgrade-id="${upgradeId}"]`);
                if (button) {
                    button.style.transform = 'scale(0.95)';
                    button.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
                    
                    setTimeout(() => {
                        button.style.transform = '';
                        button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    }, 200);
                }
                
                console.log(`✅ Upgrade comprado: ${upgrade.name} (Nivel ${upgrade.level + 1})`);
                
                // Actualizar UI inmediatamente
                this.updateUI();
            } else {
                console.log('❌ No se pudo comprar el upgrade - fallo en purchaseUpgrade');
            }
        } catch (error) {
            console.error('Error en purchaseUpgrade:', error);
        } finally {
            // Liberar el lock después de un pequeño delay
            setTimeout(() => {
                this.purchaseInProgress = false;
            }, 300);
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.textContent = this.isPaused ? '▶️ Reanudar' : '⏸️ Pausar';
        }
    }
    
    resetCar() {
        // Resetear auto manteniendo el cerebro entrenado
        const savedBrain = this.car.brain.copy();
        
        const startLane = Math.floor(Math.random() * this.road.laneCount);
        this.car.reset(this.road.getLaneCenter(startLane), 100);
        
        // Restaurar el cerebro entrenado
        this.car.brain = savedBrain;
        
        // Aplicar todos los upgrades comprados
        this.upgradeSystem.applyAllUpgrades(this.car);
        
        console.log(`🔄 Auto reseteado en carril ${startLane} con cerebro entrenado preservado`);
    }
    
    nextGeneration() {
        // Sistema de generaciones mejorado
        const currentFitness = this.car.getFitness();
        
        console.log(`🧬 Iniciando nueva generación #${this.generationCount + 1}`);
        console.log(`📊 Fitness actual: ${currentFitness.toFixed(2)}, Mejor fitness: ${this.bestFitness.toFixed(2)}`);
        
        // Guardar el mejor cerebro si es necesario
        if (currentFitness > this.bestFitness) {
            this.bestFitness = currentFitness;
            this.bestBrain = this.car.brain.copy();
            console.log(`🏆 ¡Nuevo récord guardado! Fitness: ${this.bestFitness.toFixed(2)}`);
        }
        
        // Crear nueva generación basada en el mejor cerebro
        if (this.bestBrain) {
            this.car.brain = this.bestBrain.copy();
            
            // Aplicar mutación evolutiva
            const mutationStrength = Math.max(0.1, 0.5 - (this.generationCount * 0.02)); // Reducir mutación con el tiempo
            this.car.brain.mutate(0.4, mutationStrength);
            
            console.log(`🔬 Aplicando mutación evolutiva - Fuerza: ${(mutationStrength * 100).toFixed(1)}%`);
        } else {
            // No hay mejor cerebro, crear uno optimizado
            this.car.brain = this.createOptimizedBrain();
            console.log('🧠 Creando cerebro optimizado inicial');
        }
        
        // Incrementar contador de generaciones
        this.generationCount++;
        
        // Resetear el auto en una nueva posición
        this.resetCar();
        
        // Actualizar UI si existe el elemento
        const generationElement = document.getElementById('generation-count');
        if (generationElement) {
            generationElement.textContent = this.generationCount;
        }
        
        // Aplicar upgrades al auto reseteado
        this.upgradeSystem.applyAllUpgrades(this.car);
        
        console.log(`✨ Generación #${this.generationCount} iniciada con éxito`);
    }
    
    saveGame() {
        this.economy.saveProgress();
        this.upgradeSystem.savePurchasedUpgrades();
        
        // Guardar cerebro del auto
        const brainData = this.car.brain.serialize();
        localStorage.setItem('neuralCarTycoon_brain', JSON.stringify(brainData));
        
        console.log('Juego guardado');
    }
    
    loadGame() {
        // El economy y upgrades ya se cargan automáticamente
        
        // Cargar cerebro del auto
        const brainData = localStorage.getItem('neuralCarTycoon_brain');
        if (brainData) {
            try {
                const data = JSON.parse(brainData);
                this.car.brain = NeuralNetwork.deserialize(data);
                console.log('Cerebro cargado');
            } catch (e) {
                console.warn('Error loading brain data:', e);
            }
        }
    }
    
    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Limitar delta time para evitar saltos grandes
        const clampedDeltaTime = Math.min(Math.max(deltaTime, 16), 50); // Mínimo 16ms, máximo 50ms
        
        this.update(clampedDeltaTime);
        this.draw();
        
        // Actualizar UI cada cierto tiempo
        this.accumulatedTime += clampedDeltaTime;
        if (this.accumulatedTime >= 100) { // Cada 100ms
            this.updateUI();
            this.accumulatedTime = 0;
        }
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    start() {
        console.log('🚀 Iniciando Neural Car Tycoon...');
        console.log('📊 Canvas size:', this.canvas.width, 'x', this.canvas.height);
        console.log('🚗 Auto position:', this.car.x, this.car.y);
        console.log('🛣️ Road center:', this.road.getLaneCenter(1));
        
        this.loadGame();
        console.log('💾 Juego cargado');
        
        console.log('🔄 Iniciando game loop...');
        this.gameLoop(0);
        
        console.log('✅ Neural Car Tycoon iniciado correctamente');
    }
} 