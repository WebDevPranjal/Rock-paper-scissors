// type room = {
//     id: String,
//     players: [],
//     state: String,
//     result: String,
//     isPrivate: Boolean,
// }

import rooms from "./rooms.js";
import { v4 as uuidv4 } from "uuid";

export const startGame = (rooms, ws) => {
    // defining the player object
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
            isPrivate: false,
        });
        ws.send(JSON.stringify({ type: "waiting-for-player" }));
    }else {
        // check if there is a room in waiting state
        const room = rooms.find(room => room.state === "waiting");
        if (room) {
            room.players.push(player);
            room.state = "playing";
            room.result = null;
            room.players.forEach(player => {
                player.ws.send(JSON.stringify({ 
                    type: "game-started", 
                    roomId: room.id, 
                    yourId: player.id, 
                    otherId: room.players.find(p => p.id !== player.id).id
                }));
            });
        }else {
            rooms.push({
                id: uuidv4(),
                players: [player],
                state: "waiting",
                result: null,
                isPrivate: false,
            });
            ws.send(JSON.stringify({ type: "waiting-for-player" }));
        }
    }
}

export const startPrivateGame = (rooms, ws) => {
    // defining the player object
    const player = {
        id: uuidv4(),
        ws,
        score: 0,
        move: null,
    };

    rooms.push({
        id: uuidv4(),
        players: [player],
        state: "waiting",
        result: null,
        isPrivate: true,
    })
}

export const joinPrivateGame = (ws, payload) => {
    const room = rooms.find(room => room.id === payload.roomId);
    if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
    }

    const player = {
        id: uuidv4(),
        ws,
        score: 0,
        move: null,
    };

    room.players.push(player);
    room.state = "playing";
    room.result = null;

    room.players.forEach(player => {
        player.ws.send(JSON.stringify({ 
            type: "game-started", 
            roomId: room.id, 
            yourId: player.id, 
            otherId: room.players.find(p => p.id !== player.id).id
        }));
    });

}

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

const overAllWinner = (score, room) => {
    if (score === 3) {
        const player = room.players.find(player => player.score === 3);
        room.players.forEach(player => player.ws.send(JSON.stringify({ type: "game-over", winner: player.id })));
        room.players.forEach(player => player.score = 0);
    }
}

export const makeMove = (ws, payload) => {
    const room = rooms.find(room => room.id === payload.roomId);
    if (!room){
        ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
    }

    const player = room.players.find(player => player.id === payload.playerId);
    if (!player){
        ws.send(JSON.stringify({ type: "error", message: "Player not found" }));
    }

    player.move = payload.move;
    const otherPlayer = room.players.find(p => p.id !== player.id);

    if(otherPlayer && otherPlayer.move){
        // check if there is a winner
        const result = determineWinner(player.move, otherPlayer.move);
        room.result = result;

        // update scores
        if(result === "player1"){
            player.score += 1;
            overAllWinner(player.score, room);
        } else if(result === "player2"){
            otherPlayer.score += 1;
            overAllWinner(otherPlayer.score, room);
        }

        const moves = { [player.id]: player.move, [otherPlayer.id]: otherPlayer.move };
        const scores = { [player.id]: player.score, [otherPlayer.id]: otherPlayer.score };
        room.players.forEach(player => player.ws.send(JSON.stringify({ type: "game-result", result, moves, scores })));

        // reset moves
        room.players.forEach(player => player.move = null);
    }else {
        room.players.forEach(player => player.ws.send(JSON.stringify({ type: "move-made", move: player.move, score: player.score })));
    }
}

export const userDisconnect = (ws) => {
    rooms.forEach(room => {
        room.players = room.players.filter(player => player.ws !== ws);
        if (room.players.length === 0) {
            const roomIndex = rooms.indexOf(room);
            if (roomIndex > -1) {
                rooms.splice(roomIndex, 1);
            }
        }
    });
}

export const userExit = (payload) => {
    const { roomId, userId } = payload;
    const room = rooms.find(room => room.id === roomId);
    if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
    }

    const otherPlayer = room.players.find(player => player.id !== userId);
    if (otherPlayer) {
        otherPlayer.ws.send(JSON.stringify({ type: "opponent-left" }));
    }
}

