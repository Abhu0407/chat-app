import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import { connectDB } from './lib/db.js';

dotenv.config();
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

const PORT = process.env.PORT;

// Store online users: userId -> socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    
    if (userId) {
        // Store userId as string for consistent lookup
        onlineUsers.set(userId.toString(), socket.id);
        io.emit('getOnlineUsers', Array.from(onlineUsers.keys()));
        console.log(`User ${userId} connected. Socket ID: ${socket.id}`);
    }

    socket.on('disconnect', () => {
        if (userId) {
            onlineUsers.delete(userId.toString());
            io.emit('getOnlineUsers', Array.from(onlineUsers.keys()));
            console.log(`User ${userId} disconnected`);
        }
    });
});

// Make io and onlineUsers accessible to controllers
app.set('io', io);
app.set('onlineUsers', onlineUsers);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

httpServer.listen(PORT, () => {
    console.log("Server started at http://localHost:" + PORT);
    connectDB();
});