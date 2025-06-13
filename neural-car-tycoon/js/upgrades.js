// Sistema de upgrades para Neural Car Tycoon
class UpgradeSystem {
    constructor(economy) {
        this.economy = economy;
        this.upgrades = this.initializeUpgrades();
        this.purchasedUpgrades = this.loadPurchasedUpgrades();
    }
    
    initializeUpgrades() {
        return {
            // Upgrades de Red Neuronal
            moreNeurons: {
                id: 'moreNeurons',
                name: '🧠 Más Neuronas',
                description: 'Añade 3 neuronas a la capa oculta',
                baseCost: 50,
                costMultiplier: 1.5,
                level: 0,
                maxLevel: 20,
                category: 'neural',
                effect: (car, level) => {
                    // Se aplica cuando se compra
                }
            },
            
            betterSensors: {
                id: 'betterSensors',
                name: '👁️ Sensores Mejorados',
                description: 'Aumenta el rango de los sensores',
                baseCost: 100,
                costMultiplier: 1.8,
                level: 0,
                maxLevel: 10,
                category: 'hardware',
                effect: (car, level) => {
                    car.sensorLength = 100 + (level * 20);
                }
            },
            
            fasterProcessing: {
                id: 'fasterProcessing',
                name: '⚡ Procesamiento Rápido',
                description: 'Reduce la tasa de mutación para mejor estabilidad',
                baseCost: 200,
                costMultiplier: 2.0,
                level: 0,
                maxLevel: 5,
                category: 'neural',
                effect: (car, level) => {
                    // Mejora la estabilidad del entrenamiento
                }
            },
            
            speedBoost: {
                id: 'speedBoost',
                name: '🚀 Velocidad Máxima',
                description: 'Aumenta la velocidad máxima del auto',
                baseCost: 150,
                costMultiplier: 1.6,
                level: 0,
                maxLevel: 15,
                category: 'hardware',
                effect: (car, level) => {
                    car.maxSpeed = 3 + (level * 0.3);
                }
            },
            
            incomeMultiplier: {
                id: 'incomeMultiplier',
                name: '💰 Multiplicador de Ingresos',
                description: 'Aumenta los ingresos por distancia',
                baseCost: 300,
                costMultiplier: 2.5,
                level: 0,
                maxLevel: 10,
                category: 'business',
                effect: (car, level) => {
                    // Se aplica en el cálculo de ingresos
                }
            },
            
            betterLearning: {
                id: 'betterLearning',
                name: '📚 Aprendizaje Adaptativo',
                description: 'La IA aprende más rápido de los errores',
                baseCost: 500,
                costMultiplier: 3.0,
                level: 0,
                maxLevel: 8,
                category: 'neural',
                effect: (car, level) => {
                    // Mejora la velocidad de aprendizaje
                }
            }
        };
    }
    
    getCurrentCost(upgradeId) {
        const upgrade = this.upgrades[upgradeId];
        if (!upgrade) return 0;
        
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
    }
    
    canPurchase(upgradeId) {
        const upgrade = this.upgrades[upgradeId];
        if (!upgrade) return false;
        
        if (upgrade.level >= upgrade.maxLevel) return false;
        
        const cost = this.getCurrentCost(upgradeId);
        return this.economy.canAfford(cost);
    }
    
    getUpgrade(upgradeId) {
        const upgrade = this.upgrades[upgradeId];
        if (!upgrade) return null;
        
        return {
            ...upgrade,
            id: upgradeId,
            currentCost: this.getCurrentCost(upgradeId),
            canAfford: this.canPurchase(upgradeId),
            isMaxLevel: upgrade.level >= upgrade.maxLevel
        };
    }
    
    purchaseUpgrade(upgradeId, car) {
        if (!this.canPurchase(upgradeId)) return false;
        
        const upgrade = this.upgrades[upgradeId];
        const cost = this.getCurrentCost(upgradeId);
        
        if (this.economy.spendMoney(cost)) {
            upgrade.level++;
            
            // Aplicar el efecto del upgrade
            this.applyUpgrade(upgradeId, car);
            
            // Guardar progreso
            this.savePurchasedUpgrades();
            
            return true;
        }
        
        return false;
    }
    
    applyUpgrade(upgradeId, car) {
        const upgrade = this.upgrades[upgradeId];
        if (!upgrade) return;
        
        switch (upgradeId) {
            case 'moreNeurons':
                car.brain.addHiddenNeurons(3);
                break;
                
            case 'betterSensors':
                upgrade.effect(car, upgrade.level);
                car.initializeSensors(); // Reinicializar sensores
                break;
                
            case 'speedBoost':
                upgrade.effect(car, upgrade.level);
                break;
                
            case 'fasterProcessing':
                // Este se aplica durante la mutación
                break;
                
            case 'incomeMultiplier':
                // Este se aplica en el cálculo de ingresos
                break;
                
            case 'betterLearning':
                // Este se aplica durante el entrenamiento
                break;
        }
    }
    
    applyAllUpgrades(car) {
        // Aplicar todos los upgrades comprados al auto
        for (const upgradeId in this.upgrades) {
            const upgrade = this.upgrades[upgradeId];
            if (upgrade.level > 0) {
                this.applyUpgrade(upgradeId, car);
            }
        }
    }
    
    getIncomeMultiplier() {
        const incomeUpgrade = this.upgrades.incomeMultiplier;
        return 1 + (incomeUpgrade.level * 0.2); // +20% por nivel
    }
    
    getMutationRate() {
        const processingUpgrade = this.upgrades.fasterProcessing;
        const baseRate = 0.1;
        const reduction = processingUpgrade.level * 0.01; // -1% por nivel
        return Math.max(0.02, baseRate - reduction);
    }
    
    getLearningRate() {
        const learningUpgrade = this.upgrades.betterLearning;
        return 1 + (learningUpgrade.level * 0.15); // +15% por nivel
    }
    
    getUpgradesByCategory(category) {
        const result = [];
        for (const upgradeId in this.upgrades) {
            const upgrade = this.upgrades[upgradeId];
            if (upgrade.category === category) {
                result.push({
                    ...upgrade,
                    currentCost: this.getCurrentCost(upgradeId),
                    canAfford: this.canPurchase(upgradeId),
                    isMaxLevel: upgrade.level >= upgrade.maxLevel
                });
            }
        }
        return result;
    }
    
    getAllUpgrades() {
        const result = [];
        for (const upgradeId in this.upgrades) {
            const upgrade = this.upgrades[upgradeId];
            result.push({
                ...upgrade,
                id: upgradeId,
                currentCost: this.getCurrentCost(upgradeId),
                canAfford: this.canPurchase(upgradeId),
                isMaxLevel: upgrade.level >= upgrade.maxLevel
            });
        }
        return result.sort((a, b) => a.currentCost - b.currentCost);
    }
    
    savePurchasedUpgrades() {
        const saveData = {};
        for (const upgradeId in this.upgrades) {
            saveData[upgradeId] = this.upgrades[upgradeId].level;
        }
        localStorage.setItem('neuralCarTycoon_upgrades', JSON.stringify(saveData));
    }
    
    loadPurchasedUpgrades() {
        const saveData = localStorage.getItem('neuralCarTycoon_upgrades');
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                for (const upgradeId in data) {
                    if (this.upgrades[upgradeId]) {
                        this.upgrades[upgradeId].level = data[upgradeId] || 0;
                    }
                }
            } catch (e) {
                console.warn('Error loading upgrade data:', e);
            }
        }
    }
    
    resetUpgrades() {
        for (const upgradeId in this.upgrades) {
            this.upgrades[upgradeId].level = 0;
        }
        localStorage.removeItem('neuralCarTycoon_upgrades');
    }
    
    getTotalUpgradeValue() {
        let total = 0;
        for (const upgradeId in this.upgrades) {
            const upgrade = this.upgrades[upgradeId];
            for (let i = 0; i < upgrade.level; i++) {
                total += Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, i));
            }
        }
        return total;
    }
    
    getUpgradeStats() {
        const stats = {
            totalUpgrades: 0,
            totalSpent: this.getTotalUpgradeValue(),
            neuralUpgrades: 0,
            hardwareUpgrades: 0,
            businessUpgrades: 0
        };
        
        for (const upgradeId in this.upgrades) {
            const upgrade = this.upgrades[upgradeId];
            stats.totalUpgrades += upgrade.level;
            
            switch (upgrade.category) {
                case 'neural':
                    stats.neuralUpgrades += upgrade.level;
                    break;
                case 'hardware':
                    stats.hardwareUpgrades += upgrade.level;
                    break;
                case 'business':
                    stats.businessUpgrades += upgrade.level;
                    break;
            }
        }
        
        return stats;
    }
} 