const http = require('http');
const { Server } = require('socket.io');

const setupSocket = (app) => {
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
          /^capacitor:\/\/localhost$/.test(origin) ||
          /^ionic:\/\/localhost$/.test(origin)
        ) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`✓ User connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`✗ User disconnected: ${socket.id}`);
    });
  });

  return { server, io };
};

module.exports = setupSocket;
