const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER = 1;
const BOT = 2;

let board = [];
let gameOver = false;
let botThinking = false;
let difficulty = 'medium';
let lastHoverCol = -1;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    gameOver = false;
    botThinking = false;
    statusEl.textContent = 'Your turn! Click a column to drop your piece.';
    statusEl.className = '';
    render();
}

function getDropRow(col) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][col] === EMPTY) return row;
    }
    return -1;
}

function isValidMove(col) {
    return col >= 0 && col < COLS && board[0][col] === EMPTY;
}

function getValidMoves() {
    const moves = [];
    for (let col = 0; col < COLS; col++) {
        if (isValidMove(col)) moves.push(col);
    }
    return moves;
}

function dropPiece(col, player) {
    const row = getDropRow(col);
    if (row === -1) return -1;
    board[row][col] = player;
    return row;
}

function checkWin(row, col, player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
        const cells = [{ row, col }];
        for (let i = 1; i < 4; i++) {
            const r = row + dr * i, c = col + dc * i;
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player)
                cells.push({ row: r, col: c });
            else break;
        }
        for (let i = 1; i < 4; i++) {
            const r = row - dr * i, c = col - dc * i;
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player)
                cells.push({ row: r, col: c });
            else break;
        }
        if (cells.length >= 4) return cells;
    }
    return null;
}

function isBoardFull() {
    return board[0].every(cell => cell !== EMPTY);
}

function evaluateWindow(row, col, dr, dc) {
    let botCount = 0, humanCount = 0, emptyCount = 0;
    for (let i = 0; i < 4; i++) {
        const r = row + dr * i, c = col + dc * i;
        if (board[r][c] === BOT) botCount++;
        else if (board[r][c] === PLAYER) humanCount++;
        else emptyCount++;
    }
    if (botCount === 4) return 100;
    if (humanCount === 4) return -100;
    if (botCount === 3 && emptyCount === 1) return 5;
    if (humanCount === 3 && emptyCount === 1) return -5;
    if (botCount === 2 && emptyCount === 2) return 2;
    if (humanCount === 2 && emptyCount === 2) return -2;
    return 0;
}

function evaluate() {
    let score = 0;
    const center = Math.floor(COLS / 2);
    for (let row = 0; row < ROWS; row++) {
        if (board[row][center] === BOT) score += 4;
        else if (board[row][center] === PLAYER) score -= 4;
    }
    for (let row = 0; row < ROWS; row++)
        for (let col = 0; col < COLS - 3; col++)
            score += evaluateWindow(row, col, 0, 1);
    for (let row = 0; row < ROWS - 3; row++)
        for (let col = 0; col < COLS; col++)
            score += evaluateWindow(row, col, 1, 0);
    for (let row = 0; row < ROWS - 3; row++)
        for (let col = 0; col < COLS - 3; col++)
            score += evaluateWindow(row, col, 1, 1);
    for (let row = 0; row < ROWS - 3; row++)
        for (let col = 3; col < COLS; col++)
            score += evaluateWindow(row, col, 1, -1);
    return score;
}

function minimax(depth, alpha, beta, isMaximizing) {
    const validMoves = getValidMoves();
    if (depth === 0 || validMoves.length === 0) {
        return { score: evaluate() };
    }
    validMoves.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
    if (isMaximizing) {
        let best = { score: -Infinity };
        for (const col of validMoves) {
            const row = dropPiece(col, BOT);
            let score;
            if (checkWin(row, col, BOT)) {
                score = 1000000 + depth;
            } else {
                score = minimax(depth - 1, alpha, beta, false).score;
            }
            board[row][col] = EMPTY;
            if (score > best.score) {
                best = { col, score };
            }
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = { score: Infinity };
        for (const col of validMoves) {
            const row = dropPiece(col, PLAYER);
            let score;
            if (checkWin(row, col, PLAYER)) {
                score = -1000000 - depth;
            } else {
                score = minimax(depth - 1, alpha, beta, true).score;
            }
            board[row][col] = EMPTY;
            if (score < best.score) {
                best = { col, score };
            }
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return best;
    }
}

function getBotMove() {
    const validMoves = getValidMoves();
    if (validMoves.length === 0) return -1;
    if (difficulty === 'easy') return validMoves[Math.floor(Math.random() * validMoves.length)];
    const depth = difficulty === 'medium' ? 4 : 6;
    return minimax(depth, -Infinity, Infinity, true).col;
}

function highlightWin(cells) {
    cells.forEach(({ row, col }) => {
        const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (cell) cell.classList.add('win');
    });
}

function render() {
    boardEl.innerHTML = '';
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            const val = board[row][col];
            if (val === PLAYER) cell.classList.add('player');
            else if (val === BOT) cell.classList.add('bot');
            boardEl.appendChild(cell);
        }
    }
}

function clearHover() {
    document.querySelectorAll('.cell.hover').forEach(el => el.classList.remove('hover'));
    lastHoverCol = -1;
}

function handleCellClick(col) {
    if (gameOver || botThinking) return;
    if (!isValidMove(col)) return;
    clearHover();
    const row = dropPiece(col, PLAYER);
    render();
    const winResult = checkWin(row, col, PLAYER);
    if (winResult) {
        gameOver = true;
        highlightWin(winResult);
        statusEl.textContent = 'You win!';
        statusEl.className = 'win-text';
        return;
    }
    if (isBoardFull()) {
        gameOver = true;
        statusEl.textContent = "It's a draw!";
        statusEl.className = 'draw-text';
        return;
    }
    botThinking = true;
    statusEl.textContent = 'Bot is thinking...';
    statusEl.className = 'thinking-text';
    setTimeout(() => {
        const botCol = getBotMove();
        if (botCol === -1) {
            botThinking = false;
            gameOver = true;
            statusEl.textContent = "It's a draw!";
            statusEl.className = 'draw-text';
            return;
        }
        const botRow = dropPiece(botCol, BOT);
        render();
        const botWin = checkWin(botRow, botCol, BOT);
        if (botWin) {
            gameOver = true;
            highlightWin(botWin);
            statusEl.textContent = 'Bot wins!';
            statusEl.className = 'lose-text';
            botThinking = false;
            return;
        }
        if (isBoardFull()) {
            gameOver = true;
            statusEl.textContent = "It's a draw!";
            statusEl.className = 'draw-text';
            botThinking = false;
            return;
        }
        botThinking = false;
        statusEl.textContent = 'Your turn!';
        statusEl.className = '';
    }, 500);
}

boardEl.addEventListener('mousemove', (e) => {
    if (gameOver || botThinking) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const col = parseInt(cell.dataset.col);
    if (col === lastHoverCol) return;
    clearHover();
    lastHoverCol = col;
    const dropRow = getDropRow(col);
    if (dropRow === -1) return;
    const dropCell = boardEl.querySelector(`.cell[data-row="${dropRow}"][data-col="${col}"]`);
    if (dropCell) dropCell.classList.add('hover');
});

boardEl.addEventListener('mouseleave', () => clearHover());

boardEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleCellClick(parseInt(cell.dataset.col));
});

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
        initBoard();
    });
});

document.getElementById('new-game').addEventListener('click', initBoard);

initBoard();
