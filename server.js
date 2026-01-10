const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Game state
const rooms = new Map();

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', (playerName) => {
        const roomCode = generateRoomCode();
        rooms.set(roomCode, {
            players: [{ id: socket.id, name: playerName, symbol: 'X' }],
            board: Array(9).fill(null),
            currentTurn: 'X',
            gameStarted: false
        });
        
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, symbol: 'X' });
        console.log(`Room created: ${roomCode} by ${playerName}`);
    });

    socket.on('joinRoom', ({ roomCode, playerName }) => {
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        
        if (room.players.length >= 2) {
            socket.emit('error', 'Room is full');
            return;
        }

        room.players.push({ id: socket.id, name: playerName, symbol: 'O' });
        room.gameStarted = true;
        socket.join(roomCode);
        
        console.log(`${playerName} joined room: ${roomCode}`);
        
        io.to(roomCode).emit('gameStart', {
            players: room.players,
            currentTurn: room.currentTurn
        });
    });

    socket.on('makeMove', ({ roomCode, index }) => {
        const room = rooms.get(roomCode);
        if (!room || !room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.symbol !== room.currentTurn) return;

        if (room.board[index] !== null) return;

        room.board[index] = player.symbol;
        room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';

        io.to(roomCode).emit('moveMade', {
            board: room.board,
            currentTurn: room.currentTurn
        });

        // Check for winner
        const winner = checkWinner(room.board);
        if (winner) {
            io.to(roomCode).emit('gameOver', { winner });
            room.gameStarted = false;
        } else if (!room.board.includes(null)) {
            io.to(roomCode).emit('gameOver', { winner: 'draw' });
            room.gameStarted = false;
        }
    });

    socket.on('requestRematch', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.board = Array(9).fill(null);
        room.currentTurn = 'X';
        room.gameStarted = true;

        io.to(roomCode).emit('rematch');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up rooms
        for (let [code, room] of rooms.entries()) {
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                rooms.delete(code);
            } else {
                // Notify remaining player
                io.to(code).emit('opponentDisconnected');
            }
        }
    });
});

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});