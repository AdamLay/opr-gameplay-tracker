import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { ILobby } from './types';
import { Server as IoServer } from "socket.io";
import http from "http";
import { nanoid } from 'nanoid';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT;

app.get('/', (req, res) => {
  res.send('Express + TypeScript Server');
});

app.get('/lobbies', (req, res) => {
  res.send(lobbies);
});

server.listen(port, () => {
  console.log(`[server]: Server is running at https://localhost:${port}`);
});

// Websocket Server
const io = new IoServer(server, { cors: { origin: "*" } });

// Lobby management
const lobbies: { [key: string]: ILobby } = {};

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on("disconnecting", reason => {
    const lobbyId = Array.from(socket.rooms)[1];
    // user might not have joined a lobby yet...
    if (!lobbyId)
      return;
    console.log(`User ${socket.id} disconnected from ${lobbyId}`);
    const lobby = lobbies[lobbyId];
    lobby.users = lobby.users.filter(x => x.id !== socket.id);
    // Clean up lobby once the last user has left
    if (lobby.users.length === 0) {
      delete lobbies[lobbyId];
    }

    // Let other users know about the disconnect
    io.to(lobbyId).emit("user-disconnect", socket.id);
  });

  // Allow a user to create a new game lobby
  socket.on("create-lobby", (armyList, callback) => {
    // TODO: Generate short random ID
    const lobbyId = nanoid(6);// socket.id;
    // Create a new game lobby
    lobbies[lobbyId] = {
      id: lobbyId,
      users: [{ id: socket.id, list: armyList }],
      actions: []
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
    lobby.users.push(user);
    // Let the user know they joined successfully
    callback(lobby);
  });

  socket.on("modify-unit", (action) => {
    const lobbyId = Array.from(socket.rooms)[1];
    const lobby = lobbies[lobbyId];
    lobby.actions.push(action);
    io.to(lobbyId).emit("modify-unit", action);
  });
});


