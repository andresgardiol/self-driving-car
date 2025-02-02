const carCanvas = document.getElementById("carCanvas");
carCanvas.width = 200;
const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width = 300;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

const LANE_COUNT = 4;
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, LANE_COUNT);

const CAR_COUNT = 150;
const MUTATION_RATE = 0.4;
const CAR_MAX_SPEED = 6;
const cars = generateCars(CAR_COUNT);
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

if (localStorage.getItem("counter")) {
    document.getElementById("counter").innerText = localStorage.getItem("counter") || 0;
}

const traffic = generateTraffic(70);

animate();

function save() {
    let savedBrain = localStorage.getItem("bestBrain");
    if (savedBrain) {
        if (savedBrain === JSON.stringify(bestCar.brain)) {
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
    localStorage.setItem("bestBrain",
        JSON.stringify(bestCar.brain));
}

function discard() {
    // Update counter
    let counter = 0;
    localStorage.setItem("counter", counter.toString());
    localStorage.removeItem("bestBrain");
}

function generateCars(N) {
    const cars = [];
    for (let i = 1; i <= N; i++) {
        cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "AI", CAR_MAX_SPEED));
    }
    return cars;
}

function animate(time) {
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

    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;

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

    networkCtx.lineDashOffset = -time / 50;
    //Visualizer.drawNetwork(networkCtx, bestCar.brain);
    requestAnimationFrame(animate);
}

function generateTraffic(N) {
    const traffic = [];
    let distanceBetweenEeach = -100;
    let carsQty = 0;
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < LANE_COUNT; j++) {
            let spawnCar = !!getRandomBetween(0, 1);
            console.log(spawnCar);
            if (spawnCar && carsQty < LANE_COUNT - 2) {
                traffic.push(new Car(road.getLaneCenter(j), distanceBetweenEeach, 30, 50, "DUMMY", 2, "red"));
                carsQty++;
            }
        }
        distanceBetweenEeach -= 200
        carsQty = 0;
    }
    console.log(traffic);
    return traffic;
}

function getRandomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
