import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import rooms from "./game-service/rooms.js";
import {joinPrivateGame, makeMove, 
        startGame, 
        startPrivateGame, 
        userDisconnect, 
        userExit
} from "./game-service/game-methods.js";

const app = express();
const server = http.createServer(app);

app.use(cors(
  {
    origin: "http://localhost:3000",
  }
))

const PORT = 3145;
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  console.log(`New client connected`);

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    const { type, payload } = data;

    if (type === "start-new-game") {
      startGame(rooms, ws);
    } else if (type === "make-move") {
      makeMove(ws, payload);
    } else if (type === "user-exit") {
      userExit(payload);
    } else if (type === "start-private-game") {
      startPrivateGame(rooms, ws);
    } else if (type === "join-private-game") {
      joinPrivateGame(ws, payload);
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected`);
    userDisconnect(ws);
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error: ${error}`);
  });

  ws.send(JSON.stringify({ type: "connected" }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

