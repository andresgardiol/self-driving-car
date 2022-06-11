const carCanvas = document.getElementById("carCanvas");
carCanvas.width = 250;

// const networkCanvas = document.getElementById("networkCanvas");
// networkCanvas.width = 300;

const carCtx = carCanvas.getContext("2d");
// const networkCtx = networkCanvas.getContext("2d");

const LANE_COUNT = 1;
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, LANE_COUNT);

const N = 1;
const MUTATION_RATE = 0.07;
const CAR_MAX_SPEED = 2;
const cars = generateCars(N);
let bestCar = cars[0];
if (localStorage.getItem("bestBrain")) {
    for (let i = 0; i < cars.length; i++) {
        cars[i].brain = JSON.parse(
            localStorage.getItem("bestBrain"));
        if (i != 0) {
            NeuralNetwork.mutate(cars[i].brain, MUTATION_RATE);
        }
    }
}

const traffic = generateTraffic(3);

function generateTraffic(N) {
    const traffic = [];
    traffic.push(new Car(40, 250, 40, 60, "DUMMY", 2));
    traffic.push(new Car(40, 450, 40, 60, "DUMMY", 2));
    return traffic;
}
animate();

function generateCars(N) {
    const cars = [];
    for (let i = 1; i <= N; i++) {
        cars.push(new Car(road.getLaneCenter(1), 650, 40, 60, "KEYS", CAR_MAX_SPEED));
    }
    return cars;
}

function animate() {
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].update(road.borders, []);
    }
    for (let i = 0; i < cars.length; i++) {
        cars[i].update(road.borders, traffic);
    }
    bestCar = cars.find(
        c => c.y == Math.min(
            ...cars.map(c => c.y)
        ));

    carCanvas.height = 800;
    // networkCanvas.height = window.innerHeight;

    carCtx.save();

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

    // networkCtx.lineDashOffset = -time / 50;
    // Visualizer.drawNetwork(networkCtx, bestCar.brain);
    requestAnimationFrame(animate);
}


function getRandomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function save() {
    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain));
}

function discard() {
    localStorage.removeItem("bestBrain");
}
