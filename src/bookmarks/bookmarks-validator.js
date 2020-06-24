const { isURL } = require('validator');
const logger = require('../logger');

const validateBookmark = ({ url, rating }) => { 

    if (url && !isURL(url)) {
        logger.error(`Invalid url supplied: ${url}`);
        return {
            error: { message: `Invalid url supplied` },
        };
    }

    if ((rating || rating === 0) && (parseInt(rating) < 1 || parseInt(rating) > 5 || isNaN(parseInt(rating)))) {
        logger.error(`Invalid rating supplied: ${rating}`);
        return {
            error: { message: `Invalid rating supplied. Rating must be an integer between 1 and 5` },
        };
    }

    return null;
}

module.exports = {
    validateBookmark,
};