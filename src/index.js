// Firebase Integration
import { db } from './firebase-config.js';

// Socket.io connection - UPDATE THIS URL WITH YOUR RENDER BACKEND URL
const BACKEND_URL = 'https://your-backend-name.onrender.com'; // ⚠️ CHANGE THIS!
let socket = null;

// Initialize Socket.io connection
function initSocket() {
    if (!socket) {
        socket = io(BACKEND_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        // Connection event handlers
        socket.on('connect', () => {
            console.log('Connected to server!');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            alert('Failed to connect to game server. Please try again later.');
        });

        // Game event handlers
        setupSocketEventHandlers();
    }
    return socket;
}

// Setup all socket event handlers
function setupSocketEventHandlers() {
    // Room created successfully
    socket.on('roomCreated', ({ roomCode, symbol }) => {
        gameState.gameCode = roomCode;
        gameState.mySymbol = symbol;
        gameState.isHost = true;
        
        document.getElementById('gameCodeDisplay').textContent = roomCode;
        document.getElementById('gameCodeSection').classList.remove('hidden');
    });

    // Player joined the room
    socket.on('playerJoined', ({ players }) => {
        if (players.length === 2) {
            gameState.p2Name = players[1].name;
            startOnlineGame();
        }
    });

    // Game started
    socket.on('gameStart', ({ players, currentTurn }) => {
        gameState.currentPlayer = currentTurn;
        startOnlineGame();
    });

    // Opponent made a move
    socket.on('moveMade', ({ board, currentTurn, moveIndex }) => {
        gameState.board = board;
        gameState.currentPlayer = currentTurn;
        renderBoard();
        
        // Check for winner
        const winner = checkWin(gameState.board, currentTurn === 'X' ? 'O' : 'X');
        if (winner) {
            endGame(currentTurn === 'X' ? 'O' : 'X', winner.combo);
        } else if (gameState.board.every(b => b)) {
            endGame('draw');
        }
    });

    // Game over
    socket.on('gameOver', ({ winner }) => {
        if (winner === 'draw') {
            endGame('draw');
        } else {
            const winCombo = findWinningCombo(gameState.board, winner);
            endGame(winner, winCombo);
        }
    });

    // Error handling
    socket.on('error', (message) => {
        alert(message);
        showOnlineMenu();
    });

    // Opponent disconnected
    socket.on('opponentDisconnected', () => {
        alert('Your opponent has disconnected!');
        cleanupOnlineGame();
        showMenu();
    });
}

// Find winning combination
function findWinningCombo(board, player) {
    for (let combo of winCombos) {
        if (combo.every(idx => board[idx] === player)) {
            return combo;
        }
    }
    return null;
}

// Game State
const gameState = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameMode: null,
    difficulty: null,
    p1Name: 'Player one',
    p2Name: 'Player two',
    isGameOver: false,
    stats: JSON.parse(localStorage.getItem('ttt_stats')) || {
        total: 0,
        p1Wins: 0,
        p2Wins: 0,
        draws: 0
    },
    scores: { p1: 0, p2: 0 },
    musicEnabled: localStorage.getItem('ttt_music') === 'true' || false,
    fromGame: false,
    // Online game state
    isOnline: false,
    gameCode: null,
    isHost: false,
    mySymbol: null,
    opponentName: null
};

// Win Combinations
const winCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// Audio
let bgMusic = null;

// Get bgMusic element when DOM is ready
function getBgMusicElement() {
    if (!bgMusic) {
        bgMusic = document.getElementById('bgMusic');
    }
    return bgMusic;
}

// Initialize
window.addEventListener('load', () => {
    showMenu();
    initMusic();
    setupMusicToggle();
});

// Music Functions
function setupMusicToggle() {
    const musicToggle = document.getElementById('musicToggle');
    if (musicToggle) {
        musicToggle.addEventListener('click', toggleMusic);
        musicToggle.style.cursor = 'pointer';
    }
}

function initMusic() {
    const musicToggle = document.getElementById('musicToggle');
    
    if (gameState.musicEnabled && musicToggle) {
        musicToggle.parentElement.classList.add('active');
        playMusic();
    }
}

function toggleMusic() {
    const musicToggle = document.getElementById('musicToggle');
    
    gameState.musicEnabled = !gameState.musicEnabled;
    localStorage.setItem('ttt_music', gameState.musicEnabled);
    
    if (musicToggle) {
        if (gameState.musicEnabled) {
            musicToggle.parentElement.classList.add('active');
            playMusic();
        } else {
            musicToggle.parentElement.classList.remove('active');
            pauseMusic();
        }
    }
}

function playMusic() {
    const audio = getBgMusicElement();
    if (gameState.musicEnabled && audio) {
        audio.play().catch(e => console.log('Audio play failed:', e));
    }
}

function pauseMusic() {
    const audio = getBgMusicElement();
    if (audio) {
        audio.pause();
    }
}

// Navigation Functions
function showMenu() {
    hideAll();
    gameState.fromGame = false;
    
    // Clean up online game
    if (gameState.isOnline && socket) {
        socket.disconnect();
        socket = null;
    }
    
    gameState.isOnline = false;
    gameState.gameCode = null;
    gameState.isHost = false;
    gameState.mySymbol = null;
    
    // Remove online status indicator
    const indicator = document.querySelector('.online-status');
    if (indicator) indicator.remove();
    
    document.getElementById('menuScreen').classList.remove('hidden');
}

function showDifficultySelection() {
    hideAll();
    document.getElementById('difficultyScreen').classList.remove('hidden');
}

function showNameInput() {
    hideAll();
    document.getElementById('nameInputScreen').classList.remove('hidden');
}

function showSettings() {
    hideAll();
    document.getElementById('settingsScreen').classList.remove('hidden');
}

function showSettingsFromGame() {
    gameState.fromGame = true;
    hideAll();
    document.getElementById('settingsScreen').classList.remove('hidden');
}

function backFromSettings() {
    if (gameState.fromGame) {
        backToGame();
    } else {
        showMenu();
    }
}

function backToGame() {
    hideAll();
    document.getElementById('gameScreen').classList.remove('hidden');
}

function showStatsFromSettings() {
    hideAll();
    showStats();
}

function showAbout() {
    hideAll();
    document.getElementById('aboutScreen').classList.remove('hidden');
}

function showOnlineMenu() {
    hideAll();
    document.getElementById('onlineMenuScreen').classList.remove('hidden');
}

function showCreateGame() {
    hideAll();
    document.getElementById('createGameScreen').classList.remove('hidden');
    document.getElementById('gameCodeSection').classList.add('hidden');
}

function hideAll() {
    document.querySelectorAll('.menu-screen, .name-input-screen, .game-screen, .stats-screen, .settings-screen, .about-screen')
        .forEach(s => s.classList.add('hidden'));
}

// Game Functions
function startGame(mode, diff = null) {
    gameState.gameMode = mode;
    gameState.difficulty = diff;
    gameState.scores = { p1: 0, p2: 0 };

    if (mode === 'computer') {
        const playerName = document.getElementById('playerNameInput').value.trim();
        gameState.p1Name = playerName || 'Player one';
        gameState.p2Name = 'Computer';
    } else {
        gameState.p1Name = document.getElementById('p1Input').value.trim() || 'Player one';
        gameState.p2Name = document.getElementById('p2Input').value.trim() || 'Player two';
    }

    document.getElementById('p1NameDisplay').textContent = gameState.p1Name;
    document.getElementById('p2NameDisplay').textContent = gameState.p2Name;

    resetGame();
    updateScoreDisplay();
    hideAll();
    document.getElementById('gameScreen').classList.remove('hidden');
}

function resetGame() {
    gameState.board = Array(9).fill(null);
    gameState.currentPlayer = 'X';
    gameState.isGameOver = false;
    renderBoard();
    document.querySelectorAll('.win-line').forEach(line => line.remove());
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';

    gameState.board.forEach((cell, i) => {
        const div = document.createElement('div');
        div.className = `cell ${cell ? 'taken ' + cell : ''}`;
        div.textContent = cell || '';
        div.onclick = () => handleMove(i);
        boardEl.appendChild(div);
    });

    addCornerDecorations(boardEl);
}

function addCornerDecorations(boardEl) {
    const bottomLeft = document.createElement('div');
    bottomLeft.style.cssText = `
        position: absolute;
        bottom: -4px;
        left: -4px;
        width: 30px;
        height: 30px;
        border: 4px solid #ffa500;
        border-top: none;
        border-right: none;
        border-radius: 0 0 0 25px;
        box-shadow: 0 0 15px #ffa500;
    `;
    boardEl.appendChild(bottomLeft);

    const bottomRight = document.createElement('div');
    bottomRight.style.cssText = `
        position: absolute;
        bottom: -4px;
        right: -4px;
        width: 30px;
        height: 30px;
        border: 4px solid #ffa500;
        border-top: none;
        border-left: none;
        border-radius: 0 0 25px 0;
        box-shadow: 0 0 15px #ffa500;
    `;
    boardEl.appendChild(bottomRight);
}

function handleMove(i) {
    if (gameState.isGameOver || gameState.board[i]) return;

    // For online games, check if it's my turn
    if (gameState.isOnline) {
        if (gameState.currentPlayer !== gameState.mySymbol) {
            return; // Not my turn
        }
    }

    gameState.board[i] = gameState.currentPlayer;
    renderBoard();

    // For online games, send move to server
    if (gameState.isOnline) {
        socket.emit('makeMove', {
            roomCode: gameState.gameCode,
            index: i
        });
        return; // Server will handle game logic for online games
    }

    // Local game logic
    const winner = checkWin(gameState.board, gameState.currentPlayer);
    if (winner) {
        endGame(gameState.currentPlayer, winner.combo);
    } else if (gameState.board.every(b => b)) {
        endGame('draw');
    } else {
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';

        if (gameState.gameMode === 'computer' && gameState.currentPlayer === 'O') {
            setTimeout(computerMove, 800);
        }
    }
}

function checkWin(board, player) {
    for (let combo of winCombos) {
        if (combo.every(idx => board[idx] === player)) {
            return { combo };
        }
    }
    return null;
}

// Computer AI
function computerMove() {
    let move;
    if (gameState.difficulty === 'easy') {
        move = getRandomMove();
    } else if (gameState.difficulty === 'medium') {
        move = Math.random() > 0.5 ? minimax(gameState.board, 'O').index : getRandomMove();
    } else {
        move = minimax(gameState.board, 'O').index;
    }
    handleMove(move);
}

function getRandomMove() {
    const avail = gameState.board
        .map((v, i) => v === null ? i : null)
        .filter(v => v !== null);
    return avail[Math.floor(Math.random() * avail.length)];
}

function minimax(newBoard, player) {
    const availSpots = newBoard
        .map((v, i) => v === null ? i : null)
        .filter(v => v !== null);

    if (checkWin(newBoard, 'X')) return { score: -10 };
    if (checkWin(newBoard, 'O')) return { score: 10 };
    if (availSpots.length === 0) return { score: 0 };

    const moves = [];
    for (let i = 0; i < availSpots.length; i++) {
        const move = {};
        move.index = availSpots[i];
        newBoard[availSpots[i]] = player;

        if (player === 'O') {
            move.score = minimax(newBoard, 'X').score;
        } else {
            move.score = minimax(newBoard, 'O').score;
        }

        newBoard[availSpots[i]] = null;
        moves.push(move);
    }

    let bestMove;
    if (player === 'O') {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }
    return moves[bestMove];
}

// End Game
function endGame(result, winCombo = null) {
    gameState.isGameOver = true;
    gameState.stats.total++;

    if (result === 'draw') {
        gameState.stats.draws++;
        showWinModal('Draw!', '🤝');
    } else {
        if (result === 'X') {
            gameState.scores.p1++;
            gameState.stats.p1Wins++;
        } else {
            gameState.scores.p2++;
            gameState.stats.p2Wins++;
        }

        const winnerName = result === 'X' ? gameState.p1Name : gameState.p2Name;
        const symbol = result === 'X' ? '✕' : '◯';
        const color = result === 'X' ? '#ff6b9d' : '#00d9ff';

        if (winCombo) {
            highlightWinningCells(winCombo);
            drawWinLine(winCombo);
        }

        showWinModal(winnerName, symbol, color);
    }

    updateScoreDisplay();
    localStorage.setItem('ttt_stats', JSON.stringify(gameState.stats));
}

function highlightWinningCells(combo) {
    const cells = document.querySelectorAll('.cell');
    combo.forEach(idx => {
        cells[idx].classList.add('winner');
    });
}

function drawWinLine(combo) {
    const boardEl = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');

    const firstCell = cells[combo[0]].getBoundingClientRect();
    const lastCell = cells[combo[2]].getBoundingClientRect();
    const boardRect = boardEl.getBoundingClientRect();

    const line = document.createElement('div');
    line.className = 'win-line';

    const x1 = firstCell.left + firstCell.width / 2 - boardRect.left;
    const y1 = firstCell.top + firstCell.height / 2 - boardRect.top;
    const x2 = lastCell.left + lastCell.width / 2 - boardRect.left;
    const y2 = lastCell.top + lastCell.height / 2 - boardRect.top;

    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

    line.style.width = length + 'px';
    line.style.height = '4px';
    line.style.left = x1 + 'px';
    line.style.top = y1 + 'px';
    line.style.transform = `rotate(${angle}deg)`;
    line.style.transformOrigin = '0 50%';

    boardEl.appendChild(line);
}

// Modal Functions
function showWinModal(text, symbol, color = '#00d9ff') {
    const modal = document.getElementById('winModal');
    const symbolEl = document.getElementById('winnerSymbol');
    const textEl = document.getElementById('winnerText');
    
    symbolEl.textContent = symbol;
    symbolEl.style.color = color;
    symbolEl.style.textShadow = `0 0 30px ${color}, 0 0 60px ${color}`;

    textEl.textContent = text;
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('winModal').classList.add('hidden');
    resetGame();
}

function goHomeFromModal() {
    document.getElementById('winModal').classList.add('hidden');
    showMenu();
}

function updateScoreDisplay() {
    document.getElementById('scoreDisplay').textContent = 
        `${gameState.scores.p1}:${gameState.scores.p2}`;
}

// Stats Functions
function showStats() {
    hideAll();
    const s = gameState.stats;
    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card">
            <h3>Total Games</h3>
            <p>${s.total}</p>
        </div>
        <div class="stat-card">
            <h3>Player 1 Wins</h3>
            <p>${s.p1Wins}</p>
        </div>
        <div class="stat-card">
            <h3>Player 2 Wins</h3>
            <p>${s.p2Wins}</p>
        </div>
        <div class="stat-card">
            <h3>Draws</h3>
            <p>${s.draws}</p>
        </div>
    `;
    document.getElementById('statsScreen').classList.remove('hidden');
}

function resetStats() {
    if (confirm("Are you sure you want to reset all statistics? This action cannot be undone.")) {
        gameState.stats = { total: 0, p1Wins: 0, p2Wins: 0, draws: 0 };
        localStorage.setItem('ttt_stats', JSON.stringify(gameState.stats));
        alert("Statistics have been reset successfully!");
        showStats();
    }
}

// Online Game Functions - Now using Socket.io
async function createOnlineGame() {
    const hostName = document.getElementById('hostNameInput').value.trim();
    if (!hostName) {
        alert('Please enter your name!');
        return;
    }

    // Initialize socket connection
    initSocket();

    gameState.isOnline = true;
    gameState.p1Name = hostName;

    hideAll();
    document.getElementById('createGameScreen').classList.remove('hidden');

    // Emit create room event to server
    socket.emit('createRoom', hostName);
}

function copyGameCode() {
    const code = gameState.gameCode;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            alert(`Game code ${code} copied to clipboard!`);
        }).catch(() => {
            fallbackCopyCode(code);
        });
    } else {
        fallbackCopyCode(code);
    }
}

function fallbackCopyCode(code) {
    const tempInput = document.createElement('input');
    tempInput.value = code;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        document.execCommand('copy');
        alert(`Game code ${code} copied!`);
    } catch (err) {
        alert(`Game code: ${code}\n(Manual copy: Select and copy this code)`);
    }
    document.body.removeChild(tempInput);
}

function showJoinGame() {
    hideAll();
    document.getElementById('joinGameScreen').classList.remove('hidden');
    document.getElementById('joinError').classList.add('hidden');
}

async function joinOnlineGame() {
    const guestName = document.getElementById('joinNameInput').value.trim();
    const code = document.getElementById('gameCodeInput').value.trim().toUpperCase();

    if (!guestName) {
        showError('Please enter your name!');
        return;
    }

    if (!code || code.length !== 6) {
        showError('Please enter a valid 6-character game code!');
        return;
    }

    // Initialize socket connection
    initSocket();

    gameState.isOnline = true;
    gameState.gameCode = code;
    gameState.p2Name = guestName;
    gameState.mySymbol = 'O';

    // Emit join room event to server
    socket.emit('joinRoom', { roomCode: code, playerName: guestName });
}

function showError(message) {
    const errorEl = document.getElementById('joinError');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function startOnlineGame() {
    gameState.gameMode = 'online';
    gameState.scores = { p1: 0, p2: 0 };

    document.getElementById('p1NameDisplay').textContent = gameState.p1Name;
    document.getElementById('p2NameDisplay').textContent = gameState.p2Name;

    resetGame();
    updateScoreDisplay();
    hideAll();
    document.getElementById('gameScreen').classList.remove('hidden');

    // Add online status indicator
    addOnlineStatusIndicator();
}

function addOnlineStatusIndicator() {
    const existing = document.querySelector('.online-status');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'online-status';
    indicator.innerHTML = '<span>🌐 Online</span>';
    indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #00ff00;
        color: #000;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: bold;
        box-shadow: 0 0 20px #00ff00;
        z-index: 1000;
    `;
    document.body.appendChild(indicator);
}

async function cleanupOnlineGame() {
    if (socket) {
        socket.emit('leaveRoom', gameState.gameCode);
    }
}

// Expose functions to global scope for onclick handlers
window.showMenu = showMenu;
window.showDifficultySelection = showDifficultySelection;
window.showNameInput = showNameInput;
window.showSettings = showSettings;
window.showSettingsFromGame = showSettingsFromGame;
window.backFromSettings = backFromSettings;
window.backToGame = backToGame;
window.showStatsFromSettings = showStatsFromSettings;
window.showStats = showStats;
window.showAbout = showAbout;
window.showOnlineMenu = showOnlineMenu;
window.showCreateGame = showCreateGame;
window.startGame = startGame;
window.handleMove = handleMove;
window.closeModal = closeModal;
window.goHomeFromModal = goHomeFromModal;
window.toggleMusic = toggleMusic;
window.createOnlineGame = createOnlineGame;
window.copyGameCode = copyGameCode;
window.showJoinGame = showJoinGame;
window.joinOnlineGame = joinOnlineGame;
window.resetStats = resetStats;

// Export db for potential use
export { db };