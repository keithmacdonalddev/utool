const axios = require('axios');
const errorResponse = require('../utils/errorResponse');

// Get real-time stock quote from Alpha Vantage
exports.getStockQuote = async (req, res, next) => {
    try {
        const { symbol } = req.params;
        const response = await axios.get(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=KQ7XNXVXZCNJBP9X`
        );
        
        if (!response.data['Global Quote']) {
            return next(new errorResponse('Stock data not available', 404));
        }

        const quote = response.data['Global Quote'];
        res.status(200).json({
            success: true,
            data: {
                symbol: symbol,
                price: parseFloat(quote['05. price']),
                change: parseFloat(quote['09. change']),
                changePercent: quote['10. change percent']
            }
        });
    } catch (err) {
        next(err);
    }
};
