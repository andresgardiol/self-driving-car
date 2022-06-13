const carCanvas = document.getElementById("carCanvas");
carCanvas.width = 250;

const networkCanvas = document.getElementById("networkCanvas");
networkCanvas.width = 300;

const carCtx = carCanvas.getContext("2d");
const networkCtx = networkCanvas.getContext("2d");

const LANE_COUNT = 1;
const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, LANE_COUNT);

const N = 500;
const MUTATION_RATE = 0.3;
const CAR_MAX_SPEED = 2;

const leftWeight = 1;
const centerWeight = 1;
const angleWeight = 1;

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
function generateCars(N) {
    const cars = [];
    for (let i = 1; i <= N; i++) {
        cars.push(new Car(road.getLaneCenter(1), 700, 40, 60, "AI", CAR_MAX_SPEED));
    }
    return cars;
}

const traffic = generateTraffic(3);

function generateTraffic(N) {
    const traffic = [];
    traffic.push(new Car(70, 290, 40, 60, "DUMMY", 2, "red"));
    traffic.push(new Car(70, 500, 40, 60, "DUMMY", 2, "red"));
    traffic.push(new Car(70, 600, 40, 60, "DUMMY", 2, "red"));
    traffic.push(new Car(70, 700, 40, 60, "DUMMY", 2, "red"));
    return traffic;
}
animate();

function fitnessFunction(cars, leftWeight, centerWeight, angleWeight) {

    const spotClosness = cars.map(car => {
        const leftClossness = Math.abs(car.x - (road.left + 75));
        const centerClossness = Math.abs(car.y - road.center);
        const angleClossness = Math.abs(car.angle);
        return (leftClossness * leftWeight) + (centerClossness * centerWeight) + (angleClossness * angleWeight);
    });

    const min = Math.min(...spotClosness);
    const bestCar = cars.find(car => {
        const leftClossness = Math.abs(car.x - (road.left + 75));
        const centerClossness = Math.abs(car.y - road.center);
        const angleClossness = Math.abs(car.angle);
        return (leftClossness * leftWeight) + (centerClossness * centerWeight) + (angleClossness * angleWeight) == min;
    })
    return bestCar;
}

function animate(time) {
    for (let i = 0; i < traffic.length; i++) {
        traffic[i].update(road.borders, []);
    }
    for (let i = 0; i < cars.length; i++) {
        cars[i].update(road.borders, traffic);
    }
    bestCar = fitnessFunction(cars, leftWeight, centerWeight, angleWeight);

    console.table({x: bestCar.x, y: bestCar.y, angle: bestCar.angle});

    carCanvas.height = 800;
    networkCanvas.height = window.innerHeight;

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

    networkCtx.lineDashOffset = -time / 50;
    Visualizer.drawNetwork(networkCtx, bestCar.brain);
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
