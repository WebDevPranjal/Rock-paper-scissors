import express from "express";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
const server = http.createServer(app);

app.use(cors(
  {
    origin: "http://localhost:3000",
  }
))

const PORT = 3145;

const wss = new WebSocketServer({ server });

const rooms = [];

const startNewGame = (rooms, ws) => {
  // define player object
  const player = {
    id: uuidv4(),
    ws,
    score: 0,
    move: null,
  };
  // check if there are no rooms
  if (rooms.length === 0) {
    rooms.push({
      id: uuidv4(),
      players: [player],
      state: "waiting",
      result: null,
    });
    ws.send(JSON.stringify({ type: "waiting-for-player" }));
  } else {
    const room = rooms.find(room => room.state === "waiting");
    if (room) {
      room.players.push(player);
      room.state = "playing";
      room.result = null;
      room.players.forEach(player => player.ws.send(JSON.stringify({ type: "game-started", roomId: room.id, yourId: player.id, otherId: room.players.find(p => p.id !== player.id).id})));
    } else {
      rooms.push({
        id: uuidv4(),
        players: [player],
        state: "waiting",
        result: null,
      });
      ws.send(JSON.stringify({ type: "waiting-for-player" }));
    }
  }
};

const overAllWinner = (score, room) => {
  if (score >= 3) {
    const winner = room.players.find(player => player.score >= 3);
    room.players.forEach(player => player.ws.send(JSON.stringify({ type: "game-over", winner: winner.id })));
    // remove the room from the rooms array
  }
}

const makeMove = (ws, payload) => {
  //console.log("move")
 // console.log('rooms:',rooms)
  const room = rooms.find(room => room.id === payload.roomId);
  if (!room) return;
 // console.log("room finded")

 // console.log(room, payload)

  const player = room.players.find(player => player.id === payload.playerId);
  if (!player) return;
 // console.log("player finded")

  player.move = payload.move;

  const otherPlayer = room.players.find(player => player.id !== payload.playerId);

  if (otherPlayer && otherPlayer.move) {
    // Determine the winner
    const result = determineWinner(player.move, otherPlayer.move);
    room.result = result;

    // Update scores
    if (result === "player1") {
      player.score += 1;
      overAllWinner(player.score, room);
    } else if (result === "player2") {
      otherPlayer.score += 1;
      overAllWinner(otherPlayer.score, room);
    }

   // console.log("result", result)
    const moves = { [player.id]: player.move, [otherPlayer.id]: otherPlayer.move };
    const scores = { [player.id]: player.score, [otherPlayer.id]: otherPlayer.score };
    room.players.forEach(player => player.ws.send(JSON.stringify({ type: "game-result", result, moves, scores })));
   // console.log("send result to players")
    // Reset moves
    room.players.forEach(player => player.move = null);
  } else {
   // console.log("one move hit")
    ws.send(JSON.stringify({ type: "move-acknowledged" }));
  }
};

const determineWinner = (move1, move2) => {
  // Implement game logic to determine the winner based on moves
  // For example, rock-paper-scissors logic
  if (move1 === move2) return "draw";
  if ((move1 === "rock" && move2 === "scissors") ||
    (move1 === "scissors" && move2 === "paper") ||
    (move1 === "paper" && move2 === "rock")) {
    return "player1";
  } else {
    return "player2";
  }
};

wss.on("connection", (ws, req) => {
  console.log(`New client connected`);

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    const { type, payload } = data;

    if (type === "start-new-game") {
      startNewGame(rooms, ws);
    } else if (type === "make-move") {
      makeMove(ws, payload);
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected`);
    rooms.forEach(room => {
      room.players = room.players.filter(player => player.ws !== ws);
      if (room.players.length === 0) {
        const roomIndex = rooms.indexOf(room);
        if (roomIndex > -1) {
          rooms.splice(roomIndex, 1);
        }
      }
    });
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error: ${error}`);
  });

  ws.send(JSON.stringify({ type: "connected" }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (error) => {
  console.error(`Server error: ${error}`);
});
