const carCanvas = document.getElementById("carCanvas");
const networkCanvas = document.getElementById("networkCanvas");

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

// Configuración por defecto
const DEFAULT_CONFIG = {
    LANE_COUNT: 3,
    CAR_COUNT: 150,
    TRAFFIC_DENSITY: 0.4,
    ROAD_WIDTH_FACTOR: 0.7,
    SIMULATION_SPEED: 1
};

// Variables de configuración (se cargarán desde localStorage o usarán valores por defecto)
let LANE_COUNT = DEFAULT_CONFIG.LANE_COUNT;
let CAR_COUNT = DEFAULT_CONFIG.CAR_COUNT;
let TRAFFIC_DENSITY = DEFAULT_CONFIG.TRAFFIC_DENSITY;
let ROAD_WIDTH_FACTOR = DEFAULT_CONFIG.ROAD_WIDTH_FACTOR;

const MUTATION_RATE = 0.4;
const CAR_MAX_SPEED = 6;

// Variables para la nueva UI
let isPaused = false;
let simulationSpeed = DEFAULT_CONFIG.SIMULATION_SPEED;
let showNetwork = false;
let frameCount = 0;
let startTime = Date.now();

let road;
let cars;
let bestCar;
let traffic;

// Funciones para manejar configuración
function saveSimulationConfig() {
    const config = {
        LANE_COUNT,
        CAR_COUNT,
        TRAFFIC_DENSITY,
        ROAD_WIDTH_FACTOR,
        SIMULATION_SPEED: simulationSpeed
    };
    localStorage.setItem("simulationConfig", JSON.stringify(config));
}

function loadSimulationConfig() {
    const savedConfig = localStorage.getItem("simulationConfig");
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        LANE_COUNT = config.LANE_COUNT || DEFAULT_CONFIG.LANE_COUNT;
        CAR_COUNT = config.CAR_COUNT || DEFAULT_CONFIG.CAR_COUNT;
        TRAFFIC_DENSITY = config.TRAFFIC_DENSITY || DEFAULT_CONFIG.TRAFFIC_DENSITY;
        ROAD_WIDTH_FACTOR = config.ROAD_WIDTH_FACTOR || DEFAULT_CONFIG.ROAD_WIDTH_FACTOR;
        simulationSpeed = config.SIMULATION_SPEED || DEFAULT_CONFIG.SIMULATION_SPEED;
    }
}

function resetToDefaultConfig() {
    LANE_COUNT = DEFAULT_CONFIG.LANE_COUNT;
    CAR_COUNT = DEFAULT_CONFIG.CAR_COUNT;
    TRAFFIC_DENSITY = DEFAULT_CONFIG.TRAFFIC_DENSITY;
    ROAD_WIDTH_FACTOR = DEFAULT_CONFIG.ROAD_WIDTH_FACTOR;
    simulationSpeed = DEFAULT_CONFIG.SIMULATION_SPEED;
    
    // Actualizar los controles de la UI
    updateConfigurationControls();
    
    // Guardar la configuración por defecto
    saveSimulationConfig();
    
    // Aplicar los cambios
    applyRoadSettings();
    
    showNotification("Configuración restaurada a valores por defecto", "info");
}

function updateConfigurationControls() {
    document.getElementById("speedSlider").value = simulationSpeed;
    document.getElementById("speedValue").textContent = simulationSpeed + "x";
    
    document.getElementById("carCountSlider").value = CAR_COUNT;
    document.getElementById("carCountValue").textContent = CAR_COUNT;
    
    document.getElementById("laneCountSlider").value = LANE_COUNT;
    document.getElementById("laneCountValue").textContent = LANE_COUNT;
    
    document.getElementById("trafficDensitySlider").value = TRAFFIC_DENSITY;
    document.getElementById("trafficDensityValue").textContent = Math.round(TRAFFIC_DENSITY * 100) + "%";
    
    document.getElementById("roadWidthSlider").value = ROAD_WIDTH_FACTOR;
    document.getElementById("roadWidthValue").textContent = Math.round(ROAD_WIDTH_FACTOR * 100) + "%";
}

// Configurar tamaños de canvas
function resizeCanvases() {
    const rect = carCanvas.getBoundingClientRect();
    carCanvas.width = rect.width;
    carCanvas.height = window.innerHeight - 80; // Ajustar por el header
    networkCanvas.width = 300;
    networkCanvas.height = 200;
    
    // Recrear la carretera si ya existe
    if (road) {
        road = new Road(carCanvas.width / 2, carCanvas.width * ROAD_WIDTH_FACTOR, LANE_COUNT);
    }
}

// Inicializar todo
function initialize() {
    // Cargar configuración guardada
    loadSimulationConfig();
    
    // Configurar canvas
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
    
    // Crear carretera
    road = new Road(carCanvas.width / 2, carCanvas.width * ROAD_WIDTH_FACTOR, LANE_COUNT);
    
    // Generar autos
    cars = generateCars(CAR_COUNT);
    bestCar = cars[0];
    
    // Cargar cerebro guardado si existe
    if (localStorage.getItem("bestBrain")) {
        for (let i = 0; i < cars.length; i++) {
            cars[i].brain = JSON.parse(
                localStorage.getItem("bestBrain"));
            if (i != 0) {
                NeuralNetwork.mutate(cars[i].brain, MUTATION_RATE);
            }
        }
    }
    
    // Generar tráfico
    traffic = generateTraffic(60);
    
    // Actualizar contador de generaciones
    updateGenerationCounter();
    
    // Inicializar controles de la UI
    initializeUIControls();
    
    // Actualizar controles con configuración cargada
    updateConfigurationControls();
    
    // Comenzar animación
    animate();
}

// Llamar a la inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

function save() {
    let savedBrain = localStorage.getItem("bestBrain");
    if (savedBrain) {
        if (savedBrain === JSON.stringify(bestCar.brain)) {
            showNotification("El cerebro actual ya está guardado", "info");
            return;
        }
        // set a counter for the number of times the best brain has been saved
        let counter = 1;
        // check if the counter exists in the local storage
        if (localStorage.getItem("counter")) {
            // if it exists, get the value and increment it
            counter = parseInt(localStorage.getItem("counter")) + 1;
        }
        // save the new counter value
        localStorage.setItem("counter", counter.toString());
    } else {
        let counter = 1;
        localStorage.setItem("counter", counter.toString());
    }
    localStorage.setItem("bestBrain", JSON.stringify(bestCar.brain));
    updateGenerationCounter();
    showNotification("¡Cerebro guardado exitosamente!", "success");
}

function discard() {
    // Solo eliminar el progreso del entrenamiento, NO la configuración
    let counter = 0;
    localStorage.setItem("counter", counter.toString());
    localStorage.removeItem("bestBrain");
    updateGenerationCounter();
    showNotification("Progreso de entrenamiento reiniciado (configuración preservada)", "warning");
    
    // Reiniciar simulación manteniendo la configuración actual
    reinitializeSimulation();
}

function reinitializeSimulation() {
    // Recrear la carretera con configuración actual
    road = new Road(carCanvas.width / 2, carCanvas.width * ROAD_WIDTH_FACTOR, LANE_COUNT);
    
    // Regenerar autos con configuración actual
    cars = generateCars(CAR_COUNT);
    bestCar = cars[0];
    
    // NO cargar cerebro guardado ya que estamos reiniciando
    
    // Regenerar tráfico con configuración actual
    traffic = generateTraffic(60);
}

function pauseSimulation() {
    isPaused = !isPaused;
    const pauseBtn = document.getElementById("pauseBtn");
    const icon = pauseBtn.querySelector("i");
    const text = pauseBtn.querySelector("span");
    
    if (isPaused) {
        icon.className = "fas fa-play";
        text.textContent = "Reanudar";
        pauseBtn.classList.remove("btn-warning");
        pauseBtn.classList.add("btn-success");
    } else {
        icon.className = "fas fa-pause";
        text.textContent = "Pausar";
        pauseBtn.classList.remove("btn-success");
        pauseBtn.classList.add("btn-warning");
    }
}

function exportData() {
    const data = {
        bestBrain: bestCar.brain,
        generation: localStorage.getItem("counter") || 0,
        timestamp: new Date().toISOString(),
        carCount: CAR_COUNT,
        mutationRate: MUTATION_RATE,
        maxSpeed: CAR_MAX_SPEED
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auto-conducido-gen-${data.generation}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification("Datos exportados exitosamente", "success");
}

function initializeUIControls() {
    // Control de velocidad de simulación
    const speedSlider = document.getElementById("speedSlider");
    const speedValue = document.getElementById("speedValue");
    
    speedSlider.addEventListener("input", (e) => {
        simulationSpeed = parseFloat(e.target.value);
        speedValue.textContent = simulationSpeed + "x";
        saveSimulationConfig(); // Guardar configuración automáticamente
    });
    
    // Control de número de autos
    const carCountSlider = document.getElementById("carCountSlider");
    const carCountValue = document.getElementById("carCountValue");
    
    carCountSlider.addEventListener("input", (e) => {
        CAR_COUNT = parseInt(e.target.value);
        carCountValue.textContent = e.target.value;
        saveSimulationConfig(); // Guardar configuración automáticamente
    });
    
    // Control de número de carriles
    const laneCountSlider = document.getElementById("laneCountSlider");
    const laneCountValue = document.getElementById("laneCountValue");
    
    laneCountSlider.addEventListener("input", (e) => {
        LANE_COUNT = parseInt(e.target.value);
        laneCountValue.textContent = e.target.value;
        saveSimulationConfig(); // Guardar configuración automáticamente
    });
    
    // Control de densidad de tráfico
    const trafficDensitySlider = document.getElementById("trafficDensitySlider");
    const trafficDensityValue = document.getElementById("trafficDensityValue");
    
    trafficDensitySlider.addEventListener("input", (e) => {
        TRAFFIC_DENSITY = parseFloat(e.target.value);
        trafficDensityValue.textContent = Math.round(TRAFFIC_DENSITY * 100) + "%";
        saveSimulationConfig(); // Guardar configuración automáticamente
    });
    
    // Control de ancho de carretera
    const roadWidthSlider = document.getElementById("roadWidthSlider");
    const roadWidthValue = document.getElementById("roadWidthValue");
    
    roadWidthSlider.addEventListener("input", (e) => {
        ROAD_WIDTH_FACTOR = parseFloat(e.target.value);
        roadWidthValue.textContent = Math.round(ROAD_WIDTH_FACTOR * 100) + "%";
        saveSimulationConfig(); // Guardar configuración automáticamente
    });
    
    // Toggle de red neuronal
    const toggleNetworkBtn = document.getElementById("toggleNetwork");
    toggleNetworkBtn.addEventListener("click", () => {
        showNetwork = !showNetwork;
        const icon = toggleNetworkBtn.querySelector("i");
        const text = toggleNetworkBtn.querySelector("span");
        
        if (showNetwork) {
            icon.className = "fas fa-eye-slash";
            text.textContent = "Ocultar Red";
        } else {
            icon.className = "fas fa-eye";
            text.textContent = "Mostrar Red";
        }
    });
}

function updateGenerationCounter() {
    const counter = localStorage.getItem("counter") || 0;
    document.getElementById("generationCount").textContent = counter;
}

function updateStatistics() {
    // Actualizar estadísticas en tiempo real
    const aliveCars = cars.filter(car => !car.damaged).length;
    document.getElementById("carCount").textContent = aliveCars;
    
    // Calcular mejor puntuación (distancia recorrida)
    const bestDistance = Math.abs(Math.min(...cars.map(c => c.y)));
    document.getElementById("bestScore").textContent = Math.floor(bestDistance);
    
    // Actualizar velocidad del mejor auto
    const speed = Math.abs(bestCar.speed * 10); // Convertir a km/h aproximado
    document.getElementById("speed").textContent = Math.floor(speed);
    
    // Actualizar distancia
    document.getElementById("distance").textContent = Math.floor(bestDistance);
}

function showNotification(message, type = "info") {
    // Crear notificación temporal
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Estilos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--${type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'error' ? 'danger' : 'info'}-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideInDown 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = "slideOutUp 0.3s ease-out";
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'warning': return 'exclamation-triangle';
        case 'error': return 'times-circle';
        default: return 'info-circle';
    }
}

function generateCars(N) {
    const cars = [];
    for (let i = 1; i <= N; i++) {
        cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "AI", CAR_MAX_SPEED));
    }
    return cars;
}

function animate(time) {
    // Verificar que todo esté inicializado
    if (!cars || !traffic || !road || !bestCar) {
        requestAnimationFrame(animate);
        return;
    }
    
    if (!isPaused) {
        // Aplicar velocidad de simulación
        for (let step = 0; step < simulationSpeed; step++) {
            for (let i = 0; i < traffic.length; i++) {
                traffic[i].update(road.borders, []);
            }
            for (let i = 0; i < cars.length; i++) {
                cars[i].update(road.borders, traffic);
            }
        }
        
        bestCar = cars.find(
            c => c.y == Math.min(
                ...cars.map(c => c.y)
            ));
        
        // Verificar que bestCar existe
        if (!bestCar) {
            bestCar = cars[0];
        }
        
        // Actualizar estadísticas cada 30 frames
        if (frameCount % 30 === 0) {
            updateStatistics();
        }
        frameCount++;
    }

    // Limpiar el canvas
    carCtx.clearRect(0, 0, carCanvas.width, carCanvas.height);

    carCtx.save();
    carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);

    road.draw(carCtx);
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].draw(carCtx, "red");
    }
    carCtx.globalAlpha = 0.1;
    for (let i = 0; i < cars.length; i++) {
        cars[i].draw(carCtx, "blue");
    }
    carCtx.globalAlpha = 1;
    bestCar.draw(carCtx, "blue", true);

    carCtx.restore();

    // Mostrar red neuronal si está habilitado
    if (showNetwork && bestCar.brain) {
        networkCtx.lineDashOffset = -time / 50;
        Visualizer.drawNetwork(networkCtx, bestCar.brain);
    } else {
        networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
    }

    requestAnimationFrame(animate);
}

function generateTraffic(segments = 50) {
    const traffic = [];
    let distanceBetweenSegments = -150;
    
    for (let i = 0; i < segments; i++) {
        // Determinar cuántos autos spawnar en este segmento
        const maxCarsInSegment = Math.max(1, LANE_COUNT - 1);
        const carsToSpawn = Math.floor(Math.random() * maxCarsInSegment * TRAFFIC_DENSITY);
        
        // Crear array de carriles disponibles
        const availableLanes = Array.from({length: LANE_COUNT}, (_, i) => i);
        
        // Spawnar autos aleatoriamente en carriles disponibles
        for (let carIndex = 0; carIndex < carsToSpawn; carIndex++) {
            if (availableLanes.length === 0) break;
            
            // Seleccionar carril aleatorio
            const laneIndex = Math.floor(Math.random() * availableLanes.length);
            const selectedLane = availableLanes.splice(laneIndex, 1)[0];
            
            // Crear auto en el carril seleccionado
            const carY = distanceBetweenSegments + (Math.random() - 0.5) * 100; // Variación en Y
            const carSpeed = 1 + Math.random() * 2; // Velocidad variable entre 1 y 3
            
            traffic.push(new Car(
                road.getLaneCenter(selectedLane), 
                carY, 
                30, 
                50, 
                "DUMMY", 
                carSpeed, 
                "red"
            ));
        }
        
        distanceBetweenSegments -= 200 + Math.random() * 100; // Distancia variable entre segmentos
    }
    
    return traffic;
}

function getRandomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function applyRoadSettings() {
    // Guardar configuración antes de aplicar
    saveSimulationConfig();
    
    // Recrear la carretera con nuevas configuraciones
    road = new Road(carCanvas.width / 2, carCanvas.width * ROAD_WIDTH_FACTOR, LANE_COUNT);
    
    // Regenerar autos con nueva cantidad
    cars = generateCars(CAR_COUNT);
    bestCar = cars[0];
    
    // Cargar cerebro guardado si existe
    if (localStorage.getItem("bestBrain")) {
        for (let i = 0; i < cars.length; i++) {
            cars[i].brain = JSON.parse(localStorage.getItem("bestBrain"));
            if (i != 0) {
                NeuralNetwork.mutate(cars[i].brain, MUTATION_RATE);
            }
        }
    }
    
    // Regenerar tráfico con nueva densidad
    traffic = generateTraffic(60);
    
    // Mostrar notificación
    showNotification("Configuración aplicada y guardada correctamente", "success");
}

// Agregar estilos para las notificaciones
const notificationStyles = document.createElement("style");
notificationStyles.textContent = `
    @keyframes slideInDown {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutUp {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyles);
