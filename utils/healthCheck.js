const axios = require('axios');
const dotenv = require("dotenv");
dotenv.config();

const healthCheck = async () => {
    try {
        await axios.get(`${process.env.ORIGIN_URL}/health-check`);
    } catch (error) {
        console.error('Health check failed:', error.message);
    }
};

healthCheck();

setInterval(healthCheck, process.env.INTERVAL);

