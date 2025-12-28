const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // IMPORTANT: Restrict this in production
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);

        // Join a specific restaurant room
        socket.on('joinRestaurant', (restaurantId) => {
            if (restaurantId) {
                socket.join(restaurantId);
                console.log(`Socket ${socket.id} joined room: ${restaurantId}`);
            }
        });

        // Join a specific table room (optional, for specific table updates)
        socket.on('joinTable', (tableId) => {
            if (tableId) {
                socket.join(tableId);
            }
        });

        socket.on('disconnect', () => {
            //   console.log('Client disconnected');
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initSocket, getIo };
