const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
