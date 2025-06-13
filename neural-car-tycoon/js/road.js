// Carretera simple para Neural Car Tycoon
class Road {
    constructor(x, width, laneCount = 3) {
        this.x = x;
        this.width = width;
        this.laneCount = laneCount;
        this.laneWidth = width / laneCount;
        
        this.left = x - width / 2;
        this.right = x + width / 2;
        
        // Bordes de la carretera
        this.borders = [
            { x1: this.left, y1: -1000000, x2: this.left, y2: 1000000 },
            { x1: this.right, y1: -1000000, x2: this.right, y2: 1000000 }
        ];
        
        // Obstáculos/tráfico
        this.traffic = [];
        this.trafficSpacing = 200;
        this.lastTrafficY = 0;
    }
    
    getLaneCenter(laneIndex) {
        const laneWidth = this.width / this.laneCount;
        return this.left + laneWidth / 2 + laneIndex * laneWidth;
    }
    
    generateTraffic(playerY) {
        // Generar tráfico por delante del jugador
        const generateAhead = 1000; // Distancia hacia adelante para generar tráfico
        const targetY = playerY - generateAhead;
        
        while (this.lastTrafficY > targetY) {
            this.lastTrafficY -= this.trafficSpacing + Math.random() * 100;
            
            // Decidir si generar tráfico en esta posición
            if (Math.random() < 0.7) { // 70% de probabilidad
                const lane = Math.floor(Math.random() * this.laneCount);
                const x = this.getLaneCenter(lane);
                
                // Crear auto de tráfico
                const trafficCar = new TrafficCar(x, this.lastTrafficY);
                this.traffic.push(trafficCar);
            }
        }
        
        // Limpiar tráfico que quedó muy atrás
        this.traffic = this.traffic.filter(car => car.y < playerY + 500);
    }
    
    update(playerY, deltaTime) {
        this.generateTraffic(playerY);
        
        // Actualizar tráfico
        for (const car of this.traffic) {
            car.update(deltaTime);
        }
    }
    
    draw(ctx, viewportY) {
        const roadTop = viewportY - 300;
        const roadBottom = viewportY + 900;
        
        // Dibujar asfalto
        ctx.fillStyle = '#333333';
        ctx.fillRect(this.left, roadTop, this.width, roadBottom - roadTop);
        
        // Dibujar líneas de carril
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 20]);
        
        for (let i = 1; i < this.laneCount; i++) {
            const x = this.left + i * this.laneWidth;
            ctx.beginPath();
            ctx.moveTo(x, roadTop);
            ctx.lineTo(x, roadBottom);
            ctx.stroke();
        }
        
        // Dibujar bordes de la carretera
        ctx.setLineDash([]);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 5;
        
        // Borde izquierdo
        ctx.beginPath();
        ctx.moveTo(this.left, roadTop);
        ctx.lineTo(this.left, roadBottom);
        ctx.stroke();
        
        // Borde derecho
        ctx.beginPath();
        ctx.moveTo(this.right, roadTop);
        ctx.lineTo(this.right, roadBottom);
        ctx.stroke();
        
        // Dibujar tráfico
        for (const car of this.traffic) {
            if (car.y > roadTop - 50 && car.y < roadBottom + 50) {
                car.draw(ctx);
            }
        }
    }
}

// Auto de tráfico (más simple que el auto del jugador)
class TrafficCar {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 60;
        this.speed = 1 + Math.random() * 2; // Velocidad aleatoria
        this.angle = 0;
        
        // Color aleatorio
        const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    
    update(deltaTime) {
        this.y += this.speed;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Cuerpo del auto
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Ventanas
        ctx.fillStyle = '#222222';
        ctx.fillRect(-this.width / 3, -this.height / 3, this.width * 2/3, this.height / 4);
        ctx.fillRect(-this.width / 3, this.height / 6, this.width * 2/3, this.height / 4);
        
        ctx.restore();
    }
    
    // Obtener esquinas para detección de colisiones
    getCorners() {
        const corners = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);
        
        corners.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y - Math.cos(this.angle - alpha) * rad
        });
        corners.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y - Math.cos(this.angle + alpha) * rad
        });
        corners.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad
        });
        corners.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad
        });
        
        return corners;
    }
} 