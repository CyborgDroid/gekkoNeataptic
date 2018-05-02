const config = require('../core/util.js').getConfig();
const log = require('../core/log.js');
const _ = require('lodash');
const Math = require('mathjs');
const strat = {
  init() {
    this.name = 'Neataptic_LSTM';
    this.requiredHistory = config.tradingAdvisor.historySize;
    config.silent = true;
    config.debug = false;
    this.addIndicator('neat', 'NEAT_LSTM', {
      batchSize: this.settings.batchSize,
      hiddenLayers: this.settings.hiddenLayers,
      lookAhead: this.settings.lookAheadCandles,
      iterations: this.settings.iterations,
      error: this.settings.error,
      rate: this.settings.learnRate,
      momentum: this.settings.momentum,
      history: config.tradingAdvisor.historySize,
      dropout: this.settings.dropout,
      max_possible_price: this.settings.max_possible_price,
      asset: config.watch.asset,
      currency: config.watch.currency
    });
    this.last_action = 'none';
    this.action_price = false;

    this.startTime = new Date();
  },

  check(candle) {
    if (this.candle.close.length < this.requiredHistory) {
      return;
    }
    if (!this.indicators.neat.prediction){
      console.log("NO PREDICTION");
    } else {
      const low_prediction =  this.indicators.neat.prediction[0].toFixed(8),
            high_prediction = this.indicators.neat.prediction[1].toFixed(8);
      console.log(candle.start.format(), 
      " Predicted \t LOW: ", low_prediction,
      " | HIGH: ", high_prediction,
      " | Current Price \t LOW: ", candle.low,
      " | HIGH: ", candle.high);
      const short = candle.close*(1 - this.settings.short_at_percent) > low_prediction ? true : false,
            long = candle.close*(1 + this.settings.long_at_percent) < high_prediction ? true : false;

      if (short && this.last_action !== 'sell') {
        this.advice('short');
      } else 
      if (long && this.last_action !== 'buy') {
        this.advice('long');
      }
    }

  },

  convertToPercent(numerator, denominator) {
    return (1 - (numerator / denominator)) * 100;
  },

  end() {
    let seconds = ((new Date() - this.startTime) / 1000),
      minutes = seconds / 60,
      str;

    minutes < 1 ? str = seconds.toFixed(2) + ' seconds' : str = minutes.toFixed(2) + ' minutes';

    log.info('=======================');
    log.info('Finished in ' + str );
    log.info('=======================');
  },
  onTrade (event){
    log.debug(event.date.format(), event + ' at: ', event.price.toFixed(8));
    this.trend.last_action = event.action;
    this.trend.action_price = event.price;
}
}

module.exports = strat;
