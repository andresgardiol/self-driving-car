// Auto con IA para Neural Car Tycoon
class Car {
    constructor(x, y, width = 30, height = 60) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        // Propiedades físicas
        this.speed = 0.5; // Dar una velocidad inicial pequeña
        this.maxSpeed = 3;
        this.acceleration = 0.1;
        this.friction = 0.05;
        this.angle = 0;
        this.turnSpeed = 0.03;
        
        // Estado del auto
        this.damaged = false;
        this.distanceTraveled = 0;
        this.totalDistance = 0;
        
        // Sensores simples (rayos hacia adelante)
        this.sensorCount = 5;
        this.sensorLength = 100;
        this.sensorAngleSpread = Math.PI / 2; // 90 grados
        this.sensors = [];
        this.sensorReadings = [];
        
        // Red neuronal (5 sensores -> 6 neuronas ocultas -> 4 outputs)
        this.brain = new NeuralNetwork(this.sensorCount, 6, 4);
        
        // Estadísticas para el juego
        this.stats = {
            timeAlive: 0,
            collisions: 0,
            efficiency: 1.0
        };
        
        this.initializeSensors();
    }
    
    initializeSensors() {
        this.sensors = [];
        for (let i = 0; i < this.sensorCount; i++) {
            const angle = this.sensorAngleSpread * (i / (this.sensorCount - 1) - 0.5);
            this.sensors.push({
                angle: angle,
                length: this.sensorLength
            });
        }
    }
    
    update(roadBorders, traffic, deltaTime) {
        if (!this.damaged) {
            this.updateSensors(roadBorders, traffic);
            this.updateMovement(deltaTime);
            this.updateStats(deltaTime);
            this.checkCollisions(roadBorders, traffic);
        }
    }
    
    updateSensors(roadBorders, traffic) {
        this.sensorReadings = [];
        
        for (let i = 0; i < this.sensors.length; i++) {
            const sensor = this.sensors[i];
            const sensorAngle = this.angle + sensor.angle;
            
            // Punto de inicio del sensor (centro del auto)
            const startX = this.x;
            const startY = this.y;
            
            // Punto final del sensor
            const endX = startX + Math.sin(sensorAngle) * sensor.length;
            const endY = startY - Math.cos(sensorAngle) * sensor.length;
            
            // Buscar intersecciones
            let minDistance = sensor.length;
            
            // Verificar colisiones con bordes de la carretera
            for (const border of roadBorders) {
                const intersection = this.getIntersection(
                    startX, startY, endX, endY,
                    border.x1, border.y1, border.x2, border.y2
                );
                
                if (intersection) {
                    const distance = Math.hypot(
                        intersection.x - startX,
                        intersection.y - startY
                    );
                    minDistance = Math.min(minDistance, distance);
                }
            }
            
            // Verificar colisiones con tráfico
            for (const car of traffic) {
                if (car !== this) {
                    const corners = this.getCarCorners(car);
                    for (let j = 0; j < corners.length; j++) {
                        const nextJ = (j + 1) % corners.length;
                        const intersection = this.getIntersection(
                            startX, startY, endX, endY,
                            corners[j].x, corners[j].y,
                            corners[nextJ].x, corners[nextJ].y
                        );
                        
                        if (intersection) {
                            const distance = Math.hypot(
                                intersection.x - startX,
                                intersection.y - startY
                            );
                            minDistance = Math.min(minDistance, distance);
                        }
                    }
                }
            }
            
            // Normalizar la lectura del sensor (0 = obstáculo cerca, 1 = libre)
            this.sensorReadings.push(minDistance / sensor.length);
        }
    }
    
    updateMovement(deltaTime) {
        // Usar la red neuronal para decidir acciones
        const outputs = this.brain.predict(this.sensorReadings);
        
        // Interpretar outputs de la red neuronal con teoría de juegos
        // Aplicar estrategia mixta para evitar equilibrios subóptimos
        const forward = outputs[0] > 0.2; // Más agresivo para avanzar
        const left = outputs[1] > 0.6;
        const right = outputs[2] > 0.6;
        const brake = outputs[3] > 0.8; // Más conservador para frenar
        
        // Incentivo para avanzar (evitar círculos viciosos)
        const forwardIncentive = 0.02; // Pequeño impulso constante hacia adelante
        const explorationBonus = Math.random() < 0.05 ? 0.01 : 0; // 5% exploración aleatoria
        
        // Aplicar acciones con incentivos de teoría de juegos
        if (forward && !brake) {
            this.speed += this.acceleration + forwardIncentive + explorationBonus;
        } else if (!brake) {
            // Incluso sin forward, mantener momentum mínimo
            this.speed += forwardIncentive * 0.5;
        }
        
        if (brake && this.speed > 0.1) { // Solo frenar si hay velocidad significativa
            this.speed -= this.acceleration * 2;
        }
        
        // Aplicar fricción
        this.speed *= (1 - this.friction);
        
        // Limitar velocidad con mínimo para evitar paradas
        this.speed = Math.max(0.1, Math.min(this.maxSpeed, this.speed)); // Velocidad mínima 0.1
        
        // Girar con penalización por giros excesivos
        const turnPenalty = Math.abs(this.speed) < 0.5 ? 0.5 : 1; // Penalizar giros lentos
        
        if (this.speed !== 0) {
            if (left && !right) {
                this.angle += this.turnSpeed * turnPenalty * (this.speed > 0 ? 1 : -1);
            }
            if (right && !left) {
                this.angle -= this.turnSpeed * turnPenalty * (this.speed > 0 ? 1 : -1);
            }
        }
        
        // Mover el auto
        this.x += Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
        
        // Actualizar distancia recorrida con bonus por velocidad constante
        if (this.speed > 0.2) { // Solo contar si se mueve significativamente
            const distanceGain = this.speed;
            this.distanceTraveled += distanceGain;
            this.totalDistance += distanceGain;
            
            // Bonus por mantener velocidad alta
            if (this.speed > this.maxSpeed * 0.7) {
                this.totalDistance += distanceGain * 0.2; // 20% bonus
            }
        }
    }
    
    updateStats(deltaTime) {
        this.stats.timeAlive += deltaTime;
        
        // Calcular eficiencia basada en velocidad y colisiones
        const speedEfficiency = this.speed / this.maxSpeed;
        const collisionPenalty = this.stats.collisions * 0.1;
        this.stats.efficiency = Math.max(0, speedEfficiency - collisionPenalty);
    }
    
    checkCollisions(roadBorders, traffic) {
        const corners = this.getCarCorners(this);
        
        // Verificar colisión con bordes
        for (const border of roadBorders) {
            for (const corner of corners) {
                if (this.pointInLine(corner, border, 5)) {
                    this.damaged = true;
                    this.stats.collisions++;
                    return;
                }
            }
        }
        
        // Verificar colisión con tráfico
        for (const car of traffic) {
            if (car !== this && this.carsIntersect(this, car)) {
                this.damaged = true;
                this.stats.collisions++;
                return;
            }
        }
    }
    
    // Utilidades geométricas
    getCarCorners(car) {
        const corners = [];
        const rad = Math.hypot(car.width, car.height) / 2;
        const alpha = Math.atan2(car.width, car.height);
        
        corners.push({
            x: car.x - Math.sin(car.angle - alpha) * rad,
            y: car.y - Math.cos(car.angle - alpha) * rad
        });
        corners.push({
            x: car.x - Math.sin(car.angle + alpha) * rad,
            y: car.y - Math.cos(car.angle + alpha) * rad
        });
        corners.push({
            x: car.x - Math.sin(Math.PI + car.angle - alpha) * rad,
            y: car.y - Math.cos(Math.PI + car.angle - alpha) * rad
        });
        corners.push({
            x: car.x - Math.sin(Math.PI + car.angle + alpha) * rad,
            y: car.y - Math.cos(Math.PI + car.angle + alpha) * rad
        });
        
        return corners;
    }
    
    getIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom === 0) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }
        
        return null;
    }
    
    pointInLine(point, line, tolerance = 2) {
        const dist = Math.abs(
            (line.y2 - line.y1) * point.x - 
            (line.x2 - line.x1) * point.y + 
            line.x2 * line.y1 - line.y2 * line.x1
        ) / Math.hypot(line.y2 - line.y1, line.x2 - line.x1);
        
        return dist < tolerance;
    }
    
    carsIntersect(car1, car2) {
        const corners1 = this.getCarCorners(car1);
        const corners2 = this.getCarCorners(car2);
        
        for (let i = 0; i < corners1.length; i++) {
            for (let j = 0; j < corners2.length; j++) {
                const nextI = (i + 1) % corners1.length;
                const nextJ = (j + 1) % corners2.length;
                
                if (this.getIntersection(
                    corners1[i].x, corners1[i].y,
                    corners1[nextI].x, corners1[nextI].y,
                    corners2[j].x, corners2[j].y,
                    corners2[nextJ].x, corners2[nextJ].y
                )) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Métodos para el juego
    calculateIncome() {
        if (this.damaged) return 0;
        
        // Sistema de ingresos basado en teoría de juegos
        // Recompensar comportamiento óptimo (avanzar rápido y eficiente)
        
        const baseIncome = Math.max(0, this.speed * 0.2); // Más ingresos por velocidad
        const efficiencyBonus = this.stats.efficiency;
        const progressBonus = this.speed > 1.0 ? 1.5 : 1.0; // Bonus por velocidad alta
        
        // Bonus por movimiento consistente hacia adelante
        const forwardMovementBonus = this.speed > 0.5 ? 1.3 : 1.0;
        
        // Penalización por giros excesivos (anti-círculos)
        const turnPenalty = Math.abs(this.speed) < 0.3 ? 0.5 : 1.0;
        
        const totalIncome = baseIncome * efficiencyBonus * progressBonus * forwardMovementBonus * turnPenalty;
        
        return Math.max(0, totalIncome);
    }
    
    getFitness() {
        // Función de fitness basada en teoría de juegos
        // Equilibrio Nash óptimo: maximizar progreso minimizando riesgos
        
        let fitness = 0;
        
        // Recompensa principal: distancia recorrida
        fitness += this.totalDistance * 2;
        
        // Recompensa por tiempo de supervivencia
        fitness += this.stats.timeAlive * 5;
        
        // Bonus por eficiencia (velocidad promedio)
        const avgSpeed = this.totalDistance / Math.max(1, this.stats.timeAlive);
        fitness += avgSpeed * 50;
        
        // Penalización severa por colisiones (estrategia de aversión al riesgo)
        fitness -= this.stats.collisions * 200;
        
        // Bonus por mantener velocidad alta consistentemente
        if (this.stats.efficiency > 0.7) {
            fitness += this.totalDistance * 0.5; // 50% bonus adicional
        }
        
        // Penalización por comportamiento circular (anti-Nash subóptimo)
        if (avgSpeed < 0.3 && this.stats.timeAlive > 100) {
            fitness *= 0.3; // Penalización severa por quedarse quieto
        }
        
        return Math.max(0, fitness);
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 0;
        this.angle = 0;
        this.damaged = false;
        this.distanceTraveled = 0;
        this.stats = {
            timeAlive: 0,
            collisions: 0,
            efficiency: 1.0
        };
    }
    
    // Dibujar el auto
    draw(ctx, drawSensors = false) {
        // Dibujar sensores si está habilitado
        if (drawSensors && !this.damaged) {
            this.drawSensors(ctx);
        }
        
        // Dibujar el auto
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Color basado en estado
        if (this.damaged) {
            ctx.fillStyle = '#ff4444';
        } else {
            ctx.fillStyle = '#4444ff';
        }
        
        // Cuerpo del auto
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Dirección (pequeño rectángulo al frente)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.width / 4, -this.height / 2, this.width / 2, this.height / 4);
        
        ctx.restore();
    }
    
    drawSensors(ctx) {
        for (let i = 0; i < this.sensors.length; i++) {
            const sensor = this.sensors[i];
            const sensorAngle = this.angle + sensor.angle;
            const reading = this.sensorReadings[i];
            
            const endX = this.x + Math.sin(sensorAngle) * sensor.length * reading;
            const endY = this.y - Math.cos(sensorAngle) * sensor.length * reading;
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = reading < 0.5 ? '#ff0000' : '#00ff00';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
} 