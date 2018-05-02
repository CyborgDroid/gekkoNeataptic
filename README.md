# gekkoNeataptic
LSTM neuralnet based on neataptic for predicting high and low prices.

This indicator predicts the highest and lowest future value during the lookAhead period.
lookAheadCandles = 5 will predict the highest and lowest value during the next 5 candles.
maxPossiblePrice is important to set manually since gekko will not have access to all the historical data
and the future price can exceed past prices. This is used to normalize the prices to values between 0 and 1.

NOTE: predictions are very innaccurate, do not use for trading!
