const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER = 1;
const BOT = 2;

let board = [];
let gameOver = false;
let botThinking = false;
let processing = false;
let difficulty = 'medium';
let lastHoverCol = -1;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    gameOver = false;
    botThinking = false;
    processing = false;
    clearHover();
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
    if (difficulty === 'easy') {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
    const depth = difficulty === 'medium' ? 2 : 4;
    return minimax(depth, -Infinity, Infinity, true).col;
}

function animateColumnDrop(col, row, player, callback) {
    const indicator = document.querySelector(`.indicator[data-col="${col}"]`);
    const targetCell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!indicator || !targetCell) { callback(); return; }

    const indicatorRect = indicator.getBoundingClientRect();
    const cellRect = targetCell.getBoundingClientRect();
    const size = indicatorRect.width;

    const piece = document.createElement('div');
    piece.className = `falling-piece ${player === PLAYER ? 'player' : 'bot'}`;
    piece.style.left = `${indicatorRect.left + indicatorRect.width / 2}px`;
    piece.style.top = `${indicatorRect.top + indicatorRect.height / 2}px`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size}px`;
    piece.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(piece);

    const dx = cellRect.left - indicatorRect.left;
    const dy = cellRect.top - indicatorRect.top;

    const anim = piece.animate([
        { transform: 'translate(-50%, -50%) translate(0, 0)', opacity: 1 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`, opacity: 1 }
    ], { duration: 350, easing: 'ease-in' });

    anim.onfinish = () => { piece.remove(); callback(); };
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
    document.querySelectorAll('.indicator.active').forEach(el => el.classList.remove('active'));
    lastHoverCol = -1;
}

function processMove(col, row, player) {
    dropPiece(col, player);
    render();
    const winResult = checkWin(row, col, player);
    if (winResult) {
        gameOver = true;
        highlightWin(winResult);
        if (player === PLAYER) {
            statusEl.textContent = 'You win!';
            statusEl.className = 'win-text';
        } else {
            statusEl.textContent = 'Bot wins!';
            statusEl.className = 'lose-text';
        }
        return true;
    }
    if (isBoardFull()) {
        gameOver = true;
        statusEl.textContent = "It's a draw!";
        statusEl.className = 'draw-text';
        return true;
    }
    return false;
}

function handleCellClick(col) {
    if (gameOver || botThinking || processing) return;
    if (!isValidMove(col)) return;
    clearHover();
    processing = true;

    const row = getDropRow(col);
    animateColumnDrop(col, row, PLAYER, () => {
        const ended = processMove(col, row, PLAYER);
        if (ended) { processing = false; return; }

        botThinking = true;
        statusEl.textContent = 'Bot is thinking...';
        statusEl.className = 'thinking-text';
        setTimeout(() => {
            const botCol = getBotMove();
            if (botCol === -1) {
                botThinking = false;
                processing = false;
                gameOver = true;
                statusEl.textContent = "It's a draw!";
                statusEl.className = 'draw-text';
                return;
            }
            const botRow = getDropRow(botCol);
            animateColumnDrop(botCol, botRow, BOT, () => {
                const ended = processMove(botCol, botRow, BOT);
                botThinking = false;
                processing = false;
                if (ended) return;
                statusEl.textContent = 'Your turn!';
                statusEl.className = '';
            });
        }, 500);
    });
}

boardEl.addEventListener('mousemove', (e) => {
    if (gameOver || botThinking || processing) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const col = parseInt(cell.dataset.col);
    if (col === lastHoverCol) return;
    clearHover();
    lastHoverCol = col;
    if (isValidMove(col)) {
        const indicator = document.querySelector(`.indicator[data-col="${col}"]`);
        if (indicator) indicator.classList.add('active');
    }
});

boardEl.addEventListener('mouseleave', () => clearHover());

document.querySelector('.indicators').addEventListener('mousemove', (e) => {
    if (gameOver || botThinking || processing) return;
    const indicator = e.target.closest('.indicator');
    if (!indicator) return;
    const col = parseInt(indicator.dataset.col);
    if (col === lastHoverCol) return;
    clearHover();
    lastHoverCol = col;
    if (isValidMove(col)) {
        indicator.classList.add('active');
    }
});

document.querySelector('.indicators').addEventListener('mouseleave', () => clearHover());

boardEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleCellClick(parseInt(cell.dataset.col));
});

document.querySelector('.indicators').addEventListener('click', (e) => {
    const indicator = e.target.closest('.indicator');
    if (!indicator) return;
    handleCellClick(parseInt(indicator.dataset.col));
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
