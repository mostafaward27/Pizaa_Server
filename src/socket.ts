import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export function initSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Join tracking room by order tracking token
    socket.on('join:order', (trackingToken: string) => {
      if (trackingToken) {
        socket.join(`order:${trackingToken}`);
        console.log(`Socket ${socket.id} joined room order:${trackingToken}`);
      }
    });

    // Join branch operational room
    socket.on('join:branch', (branchId: string) => {
      if (branchId) {
        socket.join(`branch:${branchId}`);
        console.log(`Socket ${socket.id} joined room branch:${branchId}`);
      }
    });

    // Join kitchen room
    socket.on('join:kitchen', (branchId: string) => {
      if (branchId) {
        socket.join(`kitchen:${branchId}`);
        console.log(`Socket ${socket.id} joined room kitchen:${branchId}`);
      }
    });

    // Join admin room
    socket.on('join:admin', () => {
      socket.join('admin');
      console.log(`Socket ${socket.id} joined room admin`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io is not initialized');
  }
  return io;
}

export function notifyOrderCreated(order: any) {
  if (!io) return;
  // Notify branch staff and admin
  io.to(`branch:${order.branchId}`).emit('order:created', order);
  io.to('admin').emit('order:created', order);
}

export function notifyOrderStatusUpdated(order: any) {
  if (!io) return;
  // Notify customer tracking room
  io.to(`order:${order.trackingToken}`).emit('order:status_updated', order);

  // Notify kitchen room if confirmed/preparing/ready
  io.to(`kitchen:${order.branchId}`).emit('order:status_updated', order);

  // Notify branch operational dashboard
  io.to(`branch:${order.branchId}`).emit('order:status_updated', order);

  // Notify admin
  io.to('admin').emit('order:status_updated', order);
}
