"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const nanoid_1 = require("nanoid");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const port = process.env.PORT;
app.get('/', (req, res) => {
    res.send('Express + TypeScript Server');
});
server.listen(port, () => {
    console.log(`[server]: Server is running at https://localhost:${port}`);
});
// Websocket Server
const io = new socket_io_1.Server(server, { cors: { origin: "*" } });
// Lobby management
const lobbies = {};
io.on('connection', (socket) => {
    console.log('a user connected', socket.id);
    // Allow a user to create a new game lobby
    socket.on("create-lobby", (armyList, callback) => {
        // TODO: Generate short random ID
        const lobbyId = (0, nanoid_1.nanoid)(6); // socket.id;
        // Create a new game lobby
        lobbies[lobbyId] = {
            id: lobbyId,
            users: [{ id: socket.id, list: armyList }]
        };
        // Join this user to a new room
        socket.join(lobbyId);
        // Let the user know which room/lobby they have joined
        callback({
            lobbyId
        });
    });
    socket.on("join-lobby", (lobbyId, armyList, callback) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) {
            callback(false);
            return;
        }
        const user = { id: socket.id, list: armyList };
        // Broadcast to other users in the lobby that someone joined
        io.to(lobbyId).emit("user-joined", user);
        // Add this user to the lobby
        socket.join(lobbyId);
        lobby.users.push();
        // Let the user know they joined successfully
        callback(lobby);
    });
    socket.on("modify-unit", (action) => {
        const room = Array.from(socket.rooms)[1];
        io.to(room).emit("modify-unit", action);
    });
});
