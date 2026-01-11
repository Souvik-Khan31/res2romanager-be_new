const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');
const connectDB = require('./config/db');

// Connect to Database and start server
const startServer = async () => {
    try {
        await connectDB();

        const PORT = process.env.PORT || 5000;
        const HOST = process.env.HOST || '0.0.0.0';
        const server = http.createServer(app);

        // Initialize Socket.io
        const io = initSocket(server);

        server.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);
        });

        // Handle client error
        server.on('clientError', (err, socket) => {
            if (err.code === 'ECONNRESET' || !socket.writable) {
                return;
            }
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
