// Red Neuronal Simple para Neural Car Tycoon
class NeuralNetwork {
    constructor(inputCount, hiddenCount, outputCount) {
        this.inputCount = inputCount;
        this.hiddenCount = hiddenCount;
        this.outputCount = outputCount;
        
        // Crear las capas
        this.inputLayer = new Array(inputCount);
        this.hiddenLayer = new Array(hiddenCount);
        this.outputLayer = new Array(outputCount);
        
        // Pesos entre capas
        this.weightsInputHidden = this.createMatrix(inputCount, hiddenCount);
        this.weightsHiddenOutput = this.createMatrix(hiddenCount, outputCount);
        
        // Bias para cada neurona
        this.hiddenBias = new Array(hiddenCount).fill(0).map(() => Math.random() * 2 - 1);
        this.outputBias = new Array(outputCount).fill(0).map(() => Math.random() * 2 - 1);
        
        // Inicializar pesos aleatoriamente
        this.randomizeWeights();
    }
    
    createMatrix(rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = new Array(cols);
            for (let j = 0; j < cols; j++) {
                matrix[i][j] = Math.random() * 2 - 1; // Valores entre -1 y 1
            }
        }
        return matrix;
    }
    
    randomizeWeights() {
        // Randomizar pesos input -> hidden
        for (let i = 0; i < this.inputCount; i++) {
            for (let j = 0; j < this.hiddenCount; j++) {
                this.weightsInputHidden[i][j] = Math.random() * 2 - 1;
            }
        }
        
        // Randomizar pesos hidden -> output
        for (let i = 0; i < this.hiddenCount; i++) {
            for (let j = 0; j < this.outputCount; j++) {
                this.weightsHiddenOutput[i][j] = Math.random() * 2 - 1;
            }
        }
    }
    
    // Función de activación (sigmoid)
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    
    // Función de activación (tanh) - mejor para este caso
    tanh(x) {
        return Math.tanh(x);
    }
    
    // Forward pass - procesar inputs y generar outputs
    predict(inputs) {
        // Asegurar que tenemos el número correcto de inputs
        if (inputs.length !== this.inputCount) {
            throw new Error(`Expected ${this.inputCount} inputs, got ${inputs.length}`);
        }
        
        // Copiar inputs a la capa de entrada
        for (let i = 0; i < this.inputCount; i++) {
            this.inputLayer[i] = inputs[i];
        }
        
        // Calcular capa oculta
        for (let j = 0; j < this.hiddenCount; j++) {
            let sum = 0;
            for (let i = 0; i < this.inputCount; i++) {
                sum += this.inputLayer[i] * this.weightsInputHidden[i][j];
            }
            sum += this.hiddenBias[j];
            this.hiddenLayer[j] = this.tanh(sum);
        }
        
        // Calcular capa de salida
        for (let k = 0; k < this.outputCount; k++) {
            let sum = 0;
            for (let j = 0; j < this.hiddenCount; j++) {
                sum += this.hiddenLayer[j] * this.weightsHiddenOutput[j][k];
            }
            sum += this.outputBias[k];
            this.outputLayer[k] = this.tanh(sum);
        }
        
        return [...this.outputLayer];
    }
    
    // Mutar la red neuronal (para algoritmos genéticos)
    mutate(mutationRate = 0.1, mutationStrength = 0.5) {
        // Mutar pesos input -> hidden
        for (let i = 0; i < this.inputCount; i++) {
            for (let j = 0; j < this.hiddenCount; j++) {
                if (Math.random() < mutationRate) {
                    this.weightsInputHidden[i][j] += (Math.random() * 2 - 1) * mutationStrength;
                    // Mantener pesos en rango razonable
                    this.weightsInputHidden[i][j] = Math.max(-2, Math.min(2, this.weightsInputHidden[i][j]));
                }
            }
        }
        
        // Mutar pesos hidden -> output
        for (let i = 0; i < this.hiddenCount; i++) {
            for (let j = 0; j < this.outputCount; j++) {
                if (Math.random() < mutationRate) {
                    this.weightsHiddenOutput[i][j] += (Math.random() * 2 - 1) * mutationStrength;
                    this.weightsHiddenOutput[i][j] = Math.max(-2, Math.min(2, this.weightsHiddenOutput[i][j]));
                }
            }
        }
        
        // Mutar bias
        for (let i = 0; i < this.hiddenCount; i++) {
            if (Math.random() < mutationRate) {
                this.hiddenBias[i] += (Math.random() * 2 - 1) * mutationStrength;
                this.hiddenBias[i] = Math.max(-2, Math.min(2, this.hiddenBias[i]));
            }
        }
        
        for (let i = 0; i < this.outputCount; i++) {
            if (Math.random() < mutationRate) {
                this.outputBias[i] += (Math.random() * 2 - 1) * mutationStrength;
                this.outputBias[i] = Math.max(-2, Math.min(2, this.outputBias[i]));
            }
        }
    }
    
    // Copiar red neuronal
    copy() {
        const copy = new NeuralNetwork(this.inputCount, this.hiddenCount, this.outputCount);
        
        // Copiar pesos
        for (let i = 0; i < this.inputCount; i++) {
            for (let j = 0; j < this.hiddenCount; j++) {
                copy.weightsInputHidden[i][j] = this.weightsInputHidden[i][j];
            }
        }
        
        for (let i = 0; i < this.hiddenCount; i++) {
            for (let j = 0; j < this.outputCount; j++) {
                copy.weightsHiddenOutput[i][j] = this.weightsHiddenOutput[i][j];
            }
        }
        
        // Copiar bias
        for (let i = 0; i < this.hiddenCount; i++) {
            copy.hiddenBias[i] = this.hiddenBias[i];
        }
        
        for (let i = 0; i < this.outputCount; i++) {
            copy.outputBias[i] = this.outputBias[i];
        }
        
        return copy;
    }
    
    // Serializar para guardar
    serialize() {
        return {
            inputCount: this.inputCount,
            hiddenCount: this.hiddenCount,
            outputCount: this.outputCount,
            weightsInputHidden: this.weightsInputHidden,
            weightsHiddenOutput: this.weightsHiddenOutput,
            hiddenBias: this.hiddenBias,
            outputBias: this.outputBias
        };
    }
    
    // Deserializar para cargar
    static deserialize(data) {
        const network = new NeuralNetwork(data.inputCount, data.hiddenCount, data.outputCount);
        network.weightsInputHidden = data.weightsInputHidden;
        network.weightsHiddenOutput = data.weightsHiddenOutput;
        network.hiddenBias = data.hiddenBias;
        network.outputBias = data.outputBias;
        return network;
    }
    
    // Añadir neuronas a la capa oculta (upgrade del juego)
    addHiddenNeurons(count) {
        const oldHiddenCount = this.hiddenCount;
        this.hiddenCount += count;
        
        // Expandir capa oculta
        const newHiddenLayer = new Array(this.hiddenCount);
        for (let i = 0; i < oldHiddenCount; i++) {
            newHiddenLayer[i] = this.hiddenLayer[i];
        }
        for (let i = oldHiddenCount; i < this.hiddenCount; i++) {
            newHiddenLayer[i] = 0;
        }
        this.hiddenLayer = newHiddenLayer;
        
        // Expandir pesos input -> hidden
        for (let i = 0; i < this.inputCount; i++) {
            for (let j = oldHiddenCount; j < this.hiddenCount; j++) {
                this.weightsInputHidden[i][j] = Math.random() * 2 - 1;
            }
        }
        
        // Expandir pesos hidden -> output
        const newWeightsHiddenOutput = this.createMatrix(this.hiddenCount, this.outputCount);
        for (let i = 0; i < oldHiddenCount; i++) {
            for (let j = 0; j < this.outputCount; j++) {
                newWeightsHiddenOutput[i][j] = this.weightsHiddenOutput[i][j];
            }
        }
        for (let i = oldHiddenCount; i < this.hiddenCount; i++) {
            for (let j = 0; j < this.outputCount; j++) {
                newWeightsHiddenOutput[i][j] = Math.random() * 2 - 1;
            }
        }
        this.weightsHiddenOutput = newWeightsHiddenOutput;
        
        // Expandir bias
        for (let i = oldHiddenCount; i < this.hiddenCount; i++) {
            this.hiddenBias[i] = Math.random() * 2 - 1;
        }
    }
    
    // Obtener información de la red para mostrar en UI
    getNetworkInfo() {
        return {
            inputCount: this.inputCount,
            hiddenCount: this.hiddenCount,
            outputCount: this.outputCount,
            totalNeurons: this.inputCount + this.hiddenCount + this.outputCount,
            totalConnections: (this.inputCount * this.hiddenCount) + (this.hiddenCount * this.outputCount)
        };
    }
} 