const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require("socket.io");
require('dotenv').config();


const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const dataRoutes = require('./routes/dataRoutes');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/data', dataRoutes);

let onlineUsers = {};

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Usuário conectado: ${socket.id}`);
  

  socket.on('user_online', (userData) => {
      console.log(`[Socket.IO] ${userData.name} (ID: ${userData.id}) está online.`);
      onlineUsers[socket.id] = { id: userData.id, name: userData.name };

      io.emit('update_online_users', Object.values(onlineUsers));
  });

  socket.on('disconnect', () => {
    const disconnectedUser = onlineUsers[socket.id];
    if (disconnectedUser) {
        console.log(`[Socket.IO] ${disconnectedUser.name} desconectou.`);
    }
    delete onlineUsers[socket.id];

    io.emit('update_online_users', Object.values(onlineUsers));
  });
});

httpServer.listen(port, () => {
  console.log(`Servidor rodando na porta ${port} com Socket.IO integrado.`);
});