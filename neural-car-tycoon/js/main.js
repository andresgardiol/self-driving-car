// Neural Car Tycoon - Archivo principal
let game;

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('Iniciando Neural Car Tycoon...');
    
    // Crear instancia del juego
    game = new Game();
    
    // Iniciar el juego
    game.start();
    
    // Configurar controles adicionales
    setupControls();
    
    console.log('Neural Car Tycoon iniciado correctamente');
});

function setupCanvas() {
    const gameCanvas = document.getElementById('gameCanvas');
    const networkCanvas = document.getElementById('networkCanvas');
    
    // Los canvas ya tienen tamaño definido en HTML
    // Solo hacer responsivos si es necesario
    gameCanvas.style.maxWidth = '100%';
    gameCanvas.style.height = 'auto';
    networkCanvas.style.maxWidth = '100%';
    networkCanvas.style.height = 'auto';
}

function setupControls() {
    // Controles de teclado
    document.addEventListener('keydown', function(event) {
        if (!game) return;
        
        switch(event.key) {
            case ' ':
                event.preventDefault();
                game.togglePause();
                break;
            case 'r':
            case 'R':
                game.resetCar();
                break;
            case 's':
            case 'S':
                game.saveGame();
                break;
            case 'v':
            case 'V':
                game.showSensors = !game.showSensors;
                break;
            case 'n':
            case 'N':
                game.nextGeneration();
                break;
            case 'g':
            case 'G':
                game.nextGeneration();
                break;
        }
    });
    
    // Configurar sliders de velocidad del juego
    const speedSlider = document.getElementById('speed-slider');
    if (speedSlider) {
        speedSlider.addEventListener('input', function() {
            if (game) {
                game.gameSpeed = parseFloat(this.value);
                document.getElementById('speed-value').textContent = `${this.value}x`;
            }
        });
    }
    
    // Botón de toggle para sensores
    const sensorsBtn = document.getElementById('sensors-btn');
    if (sensorsBtn) {
        sensorsBtn.addEventListener('click', function() {
            if (game) {
                game.showSensors = !game.showSensors;
                this.textContent = game.showSensors ? '👁️ Ocultar Sensores' : '👁️ Mostrar Sensores';
            }
        });
    }
    
    // Configurar tabs de upgrades
    setupUpgradeTabs();
}

function setupUpgradeTabs() {
    const tabs = document.querySelectorAll('.upgrade-tab');
    const contents = document.querySelectorAll('.upgrade-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Remover clase activa de todos los tabs
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Activar tab seleccionado
            this.classList.add('active');
            document.getElementById(`${category}-upgrades`).classList.add('active');
            
            // Actualizar lista de upgrades para la categoría
            if (game) {
                updateUpgradesByCategory(category);
            }
        });
    });
}

function updateUpgradesByCategory(category) {
    const container = document.getElementById(`${category}-upgrades`);
    if (!container || !game) return;
    
    const upgrades = game.upgradeSystem.getUpgradesByCategory(category);
    
    container.innerHTML = '';
    
    upgrades.forEach(upgrade => {
        const upgradeElement = createUpgradeElement(upgrade);
        container.appendChild(upgradeElement);
    });
}

function createUpgradeElement(upgrade) {
    const element = document.createElement('div');
    element.className = 'upgrade-item';
    
    const canAfford = upgrade.canAfford ? '' : 'disabled';
    const maxLevel = upgrade.isMaxLevel ? ' (MAX)' : '';
    
    element.innerHTML = `
        <div class="upgrade-header">
            <div class="upgrade-name">${upgrade.name}</div>
            <div class="upgrade-level">${upgrade.level}/${upgrade.maxLevel}${maxLevel}</div>
        </div>
        <div class="upgrade-description">${upgrade.description}</div>
        <div class="upgrade-footer">
            <div class="upgrade-cost">$${game.economy.formatMoney(upgrade.currentCost)}</div>
            <button class="upgrade-btn ${canAfford}" ${upgrade.isMaxLevel ? 'disabled' : ''} 
                    onclick="purchaseUpgrade('${upgrade.id}')">
                ${upgrade.isMaxLevel ? 'MAX' : 'Comprar'}
            </button>
        </div>
    `;
    
    return element;
}

// Funciones globales para ser llamadas desde HTML
function purchaseUpgrade(upgradeId) {
    if (game) {
        game.purchaseUpgrade(upgradeId);
    }
}

function togglePause() {
    if (game) {
        game.togglePause();
    }
}

function resetCar() {
    if (game) {
        game.resetCar();
    }
}

function saveGame() {
    if (game) {
        game.saveGame();
        showNotification('Juego guardado correctamente', 'success');
    }
}

function nextGeneration() {
    if (game) {
        game.nextGeneration();
        showNotification('Nueva generación iniciada', 'success');
    }
}

function resetGame() {
    if (confirm('¿Estás seguro de que quieres reiniciar todo el progreso?')) {
        localStorage.clear();
        location.reload();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#10b981';
            break;
        case 'error':
            notification.style.backgroundColor = '#ef4444';
            break;
        case 'warning':
            notification.style.backgroundColor = '#f59e0b';
            break;
        default:
            notification.style.backgroundColor = '#3b82f6';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Añadir estilos de animación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .upgrade-purchased {
        animation: purchaseFlash 0.5s ease-out;
    }
    
    @keyframes purchaseFlash {
        0% { background-color: #10b981; }
        100% { background-color: transparent; }
    }
`;
document.head.appendChild(style);

// Manejo de errores globales
window.addEventListener('error', function(event) {
    console.error('Error en Neural Car Tycoon:', event.error);
    showNotification('Ha ocurrido un error. Revisa la consola para más detalles.', 'error');
});

// Guardar automáticamente cada 30 segundos
setInterval(() => {
    if (game && !game.isPaused) {
        game.saveGame();
    }
}, 30000);

// Prevenir que se cierre la página sin guardar
window.addEventListener('beforeunload', function(event) {
    if (game) {
        game.saveGame();
    }
}); 