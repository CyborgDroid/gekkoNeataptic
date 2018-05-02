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
      nn_log: this.settings.log,
      skip_training: this.settings.skip_training,
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
      const short = candle.close*(1 - this.settings.short_at_percent) > this.indicators.neat.prediction[0].toFixed(8) ? true : false,
            long = candle.close*(1 + this.settings.long_at_percent) < this.indicators.neat.prediction[1].toFixed(8) ? true : false;

      if (short && this.last_action !== 'sell') {
        this.advice('short');
        this.print_to_console(candle, 'short');
      } else 
      if (long && this.last_action !== 'buy') {
        this.advice('long');
        this.print_to_console(candle, 'long');
      }
    }

  },
  print_to_console(candle, advice) {
    console.log(candle.start.format(), 
    " Predicted \t LOW: ", this.indicators.neat.prediction[0].toFixed(8),
    " | HIGH: ", this.indicators.neat.prediction[1].toFixed(8),
    " | Current Price \t LOW: ", candle.low,
    " | HIGH: ", candle.high, 
    " | ADVICE: ", advice);
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
    log.debug(event.date.format(), event.action + ' at: ', event.price.toFixed(8));
    this.last_action = event.action;
    this.action_price = event.price;
}
}

module.exports = strat;
