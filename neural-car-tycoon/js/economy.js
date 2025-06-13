// Sistema de economía para Neural Car Tycoon
class Economy {
    constructor() {
        this.money = 0;
        this.totalEarned = 0;
        this.incomeRate = 0;
        this.multiplier = 1;
        
        // Para idle income
        this.lastSaveTime = Date.now();
        this.maxIdleHours = 24; // Máximo 24 horas de idle income
        
        this.loadProgress();
    }
    
    // Calcular ingresos basados en performance del auto
    calculateIncome(car) {
        if (car.damaged) return 0;
        
        // Ingresos base por velocidad
        let income = car.speed * 0.05;
        
        // Bonus por eficiencia
        income *= car.stats.efficiency;
        
        // Bonus por distancia (más lejos = más dinero)
        const distanceBonus = Math.min(2, 1 + (car.totalDistance / 10000));
        income *= distanceBonus;
        
        // Aplicar multiplicador global
        income *= this.multiplier;
        
        return income;
    }
    
    // Añadir dinero
    addMoney(amount) {
        this.money += amount;
        this.totalEarned += amount;
        this.updateIncomeRate(amount);
    }
    
    // Gastar dinero
    spendMoney(amount) {
        if (this.money >= amount) {
            this.money -= amount;
            return true;
        }
        return false;
    }
    
    // Actualizar tasa de ingresos (promedio móvil)
    updateIncomeRate(newIncome) {
        // Promedio móvil simple para suavizar la tasa
        this.incomeRate = this.incomeRate * 0.9 + newIncome * 0.1;
    }
    
    // Calcular idle income cuando el jugador regresa
    calculateIdleIncome() {
        const now = Date.now();
        const timeDiff = now - this.lastSaveTime;
        const hoursAway = timeDiff / (1000 * 60 * 60);
        
        if (hoursAway > 0.1) { // Solo si estuvo ausente más de 6 minutos
            const effectiveHours = Math.min(hoursAway, this.maxIdleHours);
            const idleIncome = this.incomeRate * effectiveHours * 3600; // 3600 segundos por hora
            
            if (idleIncome > 0) {
                return {
                    amount: idleIncome,
                    hours: effectiveHours
                };
            }
        }
        
        return null;
    }
    
    // Aplicar idle income
    applyIdleIncome(idleData) {
        if (idleData) {
            this.addMoney(idleData.amount);
            return true;
        }
        return false;
    }
    
    // Formatear dinero para mostrar
    formatMoney(amount = this.money) {
        if (amount >= 1000000000) {
            return (amount / 1000000000).toFixed(2) + 'B';
        } else if (amount >= 1000000) {
            return (amount / 1000000).toFixed(2) + 'M';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(2) + 'K';
        } else {
            return amount.toFixed(2);
        }
    }
    
    // Formatear tiempo
    formatTime(hours) {
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = Math.floor(hours % 24);
            return `${days}d ${remainingHours}h`;
        } else if (hours >= 1) {
            const wholeHours = Math.floor(hours);
            const minutes = Math.floor((hours % 1) * 60);
            return `${wholeHours}h ${minutes}m`;
        } else {
            const minutes = Math.floor(hours * 60);
            return `${minutes}m`;
        }
    }
    
    // Guardar progreso
    saveProgress() {
        const saveData = {
            money: this.money,
            totalEarned: this.totalEarned,
            incomeRate: this.incomeRate,
            multiplier: this.multiplier,
            lastSaveTime: Date.now()
        };
        
        localStorage.setItem('neuralCarTycoon_economy', JSON.stringify(saveData));
        this.lastSaveTime = Date.now();
    }
    
    // Cargar progreso
    loadProgress() {
        const saveData = localStorage.getItem('neuralCarTycoon_economy');
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                this.money = data.money || 0;
                this.totalEarned = data.totalEarned || 0;
                this.incomeRate = data.incomeRate || 0;
                this.multiplier = data.multiplier || 1;
                this.lastSaveTime = data.lastSaveTime || Date.now();
            } catch (e) {
                console.warn('Error loading economy data:', e);
                this.resetProgress();
            }
        }
    }
    
    // Resetear progreso
    resetProgress() {
        this.money = 0;
        this.totalEarned = 0;
        this.incomeRate = 0;
        this.multiplier = 1;
        this.lastSaveTime = Date.now();
        localStorage.removeItem('neuralCarTycoon_economy');
    }
    
    // Obtener estadísticas para mostrar
    getStats() {
        return {
            money: this.money,
            totalEarned: this.totalEarned,
            incomeRate: this.incomeRate,
            multiplier: this.multiplier,
            formattedMoney: this.formatMoney(),
            formattedIncomeRate: this.formatMoney(this.incomeRate * 60) + '/min'
        };
    }
    
    // Aplicar multiplicador temporal (para power-ups)
    applyMultiplier(multiplier, duration) {
        const oldMultiplier = this.multiplier;
        this.multiplier *= multiplier;
        
        setTimeout(() => {
            this.multiplier = oldMultiplier;
        }, duration);
    }
    
    // Verificar si puede permitirse algo
    canAfford(cost) {
        return this.money >= cost;
    }
    
    // Obtener porcentaje de progreso hacia un objetivo
    getProgressTowards(cost) {
        return Math.min(1, this.money / cost);
    }
}

// Clase para manejar notificaciones de dinero
class MoneyNotification {
    constructor() {
        this.notifications = [];
    }
    
    addNotification(amount, x, y) {
        this.notifications.push({
            amount: amount,
            x: x,
            y: y,
            startY: y,
            opacity: 1,
            life: 0,
            maxLife: 2000 // 2 segundos
        });
    }
    
    update(deltaTime) {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            notification.life += deltaTime;
            
            // Mover hacia arriba
            notification.y = notification.startY - (notification.life / notification.maxLife) * 50;
            
            // Fade out
            notification.opacity = 1 - (notification.life / notification.maxLife);
            
            // Remover si expiró
            if (notification.life >= notification.maxLife) {
                this.notifications.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        for (const notification of this.notifications) {
            ctx.save();
            ctx.globalAlpha = notification.opacity;
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            
            const text = '+$' + notification.amount.toFixed(2);
            ctx.fillText(text, notification.x, notification.y);
            
            ctx.restore();
        }
    }
} 