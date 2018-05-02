# gekkoNeataptic
LSTM neuralnet based on neataptic for predicting high and low prices.

This indicator predicts the highest and lowest future value during the lookAhead period.

lookAheadCandles = 5 will predict the highest and lowest value during the next 5 candles.

maxPossiblePrice is important to set manually since gekko will not have access to all the historical data
and the future price can exceed past prices. This is used to normalize the prices to values between 0 and 1.

You must create a folder called NEAT_NNs inside your indicators folder for the neural nets to be saved.

TO TRAIN: Backtest with a huge history size.

ONCE TRAINED: Backtest with history size = 1. 

NOTE: predictions are not reliable, do not use for trading!
