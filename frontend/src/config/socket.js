import { io } from 'socket.io-client';

export const socket = io('http://localhost:5000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => {
  console.log('✓ Connected to server');
});

socket.on('disconnect', () => {
  console.log('✗ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('✗ Connection error:', error);
});
