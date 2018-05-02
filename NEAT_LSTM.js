/*

This indicator predicts the highest and lowest future value during the lookAhead period.
lookAheadCandles = 5 will predict the highest and lowest value during the next 5 candles.
maxPossiblePrice is important to set manually since gekko will not have access to all the historical data
and the future price can exceed past prices.

*/

const neataptic = require('neataptic');
const Math = require('mathjs');
const moment = require('moment');
const fs = require('fs');

class Indicator {
  constructor(config) {
    this.input = 'candle';
    this.config = config;
    this.prediction = 0;
    this.trainingData = [];
    this.nn_trained = false;
    this.raw_count = 0;
    this.trainingDataCount = 0;
    this.dividers = {
      price: config.max_possible_price,
      volume: Number.NEGATIVE_INFINITY,
      trades: Number.NEGATIVE_INFINITY
    };
    this.trainConfig = {
      log: 10,
      batchSize: this.config.batchSize,
      iterations: this.config.iterations,
      error: this.config.error,
      rate: this.config.rate,
      clear: true,
      //shuffle: true,
      momentum: this.config.momentum,
      //ratePolicy: neataptic.methods.rate.FIXED, // default: FIXED
      cost: neataptic.methods.cost.MAPE, // default: MSE
      dropout: this.config.dropout,
      // crossValidate: {
      //   testSize: 0.2,
      //   testError: 0.0001
      // }
    };

    //To use this architecture you have to set at least one input node, 
    //one memory block assembly (consisting of four nodes: input gate, memory cell, forget gate and output gate), 
    //and an output node.
    //EXAMPLE: var myLSTM = new architect.LSTM(2,6,1);
    
    //inputs:
    const layers = [5];
    //hidden layers:
    for (let i = 0; i < config.hiddenLayers; i++) {
      layers.push(4);
    }
    // prediction low & high value
    layers.push(2); 

    // file name for saved network
    let file_desc = 'bs' + this.trainConfig.batchSize + '_hl' + this.config.hiddenLayers;
    file_desc = file_desc.replace(/\./g, "");
    this.file_name = __dirname + '/NEAT_NNs/LSTM_' + this.config.asset + '_' + this.config.currency + '_' +
    file_desc + '.txt' 

    if (fs.existsSync(this.file_name)) {
      console.log('file exists: ', this.file_name);
      this.network = this.openSavedNetwork();
    } else {
      console.log('!!! NEW NN', this.file_name);
      this.network = new neataptic.architect.LSTM(...layers);
    }
  }

  saveNetwork(){
    var json_network = this.network.toJSON();
    fs.writeFile(this.file_name, JSON.stringify(json_network), (err) => {
      if (err) throw err;
      console.log('NN has been saved to ', this.file_name);
    });
  }

  openSavedNetwork(){
    let savedNetwork = neataptic.Network.fromJSON(JSON.parse(fs.readFileSync(this.file_name, 'utf8')));
    console.log('Opened Network: ', this.file_name);
    return savedNetwork;
  }

  predict(candle) {
    let ret = this.network.activate(this.normalizeCandle(candle));
    ret = ret.map(item => {
      return item * this.dividers.price;
    });
    this.prediction = ret;
  }

  /**
   * Feed data into the neural network and train
   */
  learn(normalizedData) {
    //Make sure we have enough data to make a prediction and check it for learning
    if (parseInt(this.config.lookAhead) && normalizedData.length > this.config.lookAhead) {
      const trainingData = [];
      for (let i = 0, iLen = normalizedData.length - this.config.lookAhead; i < iLen; i++) {
        const input = normalizedData[i];
        const output = [];
        var o_high = 0;
        var o_low = 1;
        for (let j = 1; j <= this.config.lookAhead; j++) {
          o_low = o_low > normalizedData[i+j][1] ? normalizedData[i+j][1] : o_low;
          o_high = o_high < normalizedData[i+j][2] ? normalizedData[i+j][2] : o_high;
        }
        output.push(o_low);
        output.push(o_high);
        trainingData.push({
          input,
          output
        });
      }
      console.log('**********************************************************************');
      console.log('NORMALIZED TRAINING_IO DATA: ', trainingData.length, ' First data point: \n');
      for (let i=0; i<1; i++){
        console.log(i, ': ', trainingData[i])
      }
      console.log('L_RATE: ', this.config.rate,
      ' | MOMENTUM: ', this.config.momentum, 
      ' | DROPOUT: ', this.trainConfig.dropout,
      ' | LAYERS: ', this.config.hiddenLayers);
      this.network.train(trainingData, this.trainConfig);
      
      this.saveNetwork()
      //reassign the leftover data so it is used for backtesting or predicting
      const leftoverData = normalizedData.slice(Math.max(normalizedData.length - this.config.lookAhead, 1));
      console.log('leftover data:' , leftoverData.length);
      leftoverData.forEach(normalizedCandle => {
        this.network.activate(normalizedCandle);
      });
    }
  }
  /** 
   * Recalculates values for all candles normalized for the neural network
   */
  calcNormalizedTrainingData(data) {
    const normalizedCandles = data.map((candle) => {
      return this.normalizeCandle(candle);
    });
    return normalizedCandles;

  }

  /**
   * Calculates normalized inputs for a single candle
   * 
   * @param {object} candle - Candle data. Must have {high, low, close, open, volume, trades}
   * @param {object} dividers - Dividers used for normalizing. Must have {high, low, close, open, volume, trades}
   * @returns {object}
   */
  normalizeCandle(candle) {
    let ret = [];
    //**** ALL PRICE METIRCS:
    ret.push(Math.round(candle.open / this.dividers.price, 4));
    ret.push(Math.round(candle.low / this.dividers.price, 4));
    ret.push(Math.round(candle.high / this.dividers.price, 4));
    ret.push(Math.round(candle.close / this.dividers.price, 4));
    ret.push(Math.round(candle.vwp / this.dividers.price, 4));
    return ret;
  }

  /**
   * Update function run on every new candle
   * 
   * @param {object} candle - Candle data. Must have {high, low, close, open, volume, trades}
   */
  update(candle) {
      this.raw_count++;
      const newCandle = Object.assign({}, candle);
      delete newCandle.volume;
      delete newCandle.trades;
      this.trainingData.push(newCandle);
      this.trainingDataCount++;
      // if NN is trained, predict the next price
      if (this.nn_trained) this.predict(newCandle); 
      // otherwise if all history has been processed, train the NN
      else if (this.raw_count+1 === this.config.history) {
        const normalizedTrainingData = this.calcNormalizedTrainingData(this.trainingData);
        this.learn(normalizedTrainingData);
        this.nn_trained = true;
    } 
  }
}

module.exports = Indicator;
