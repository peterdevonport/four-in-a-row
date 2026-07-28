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
let hoverAnim = null;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

const floatingPiece = document.createElement('div');
floatingPiece.id = 'floating-piece';
document.body.appendChild(floatingPiece);

function getColumnInfo(col) {
    const cell = boardEl.querySelector(`.cell[data-row="0"][data-col="${col}"]`);
    if (!cell) return null;
    const cellRect = cell.getBoundingClientRect();
    const boardRect = boardEl.getBoundingClientRect();
    return {
        centerX: cellRect.left + cellRect.width / 2,
        aboveBoardY: boardRect.top - cellRect.height / 2 - 4,
        width: cellRect.width,
        height: cellRect.height
    };
}

function setFloatingPiece(col) {
    const info = getColumnInfo(col);
    if (!info) return;
    if (hoverAnim) { hoverAnim.cancel(); hoverAnim = null; }
    floatingPiece.style.width = `${info.width}px`;
    floatingPiece.style.height = `${info.height}px`;
    floatingPiece.style.left = `${info.centerX}px`;
    floatingPiece.style.top = `${info.aboveBoardY}px`;
    floatingPiece.style.transform = 'translate(-50%, -50%)';
    floatingPiece.style.display = 'block';
}

function showFloatingPiece() {
    setFloatingPiece(3);
}

function hideFloatingPiece() {
    floatingPiece.style.display = 'none';
}

function slideFloatingPiece(col) {
    const info = getColumnInfo(col);
    if (!info) return;
    const currentX = parseFloat(floatingPiece.style.left);
    const currentY = parseFloat(floatingPiece.style.top);
    if (isNaN(currentX) || isNaN(currentY)) { setFloatingPiece(col); return; }
    const dx = info.centerX - currentX;
    const dy = info.aboveBoardY - currentY;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    if (hoverAnim) { hoverAnim.cancel(); hoverAnim = null; }
    hoverAnim = floatingPiece.animate([
        { transform: 'translate(-50%, -50%)' },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)` }
    ], { duration: 120, easing: 'ease-out' });
    hoverAnim.onfinish = () => {
        hoverAnim = null;
        floatingPiece.style.left = `${info.centerX}px`;
        floatingPiece.style.top = `${info.aboveBoardY}px`;
    };
}

function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
    gameOver = false;
    botThinking = false;
    processing = false;
    lastHoverCol = -1;
    statusEl.textContent = 'Your turn!';
    statusEl.className = '';
    render();
    showFloatingPiece();
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

function fallPiece(info, targetCenterY, player, callback) {
    const piece = document.createElement('div');
    piece.className = `falling-piece ${player === PLAYER ? 'player' : 'bot'}`;
    piece.style.left = `${info.centerX}px`;
    piece.style.top = `${info.aboveBoardY}px`;
    piece.style.width = `${info.width}px`;
    piece.style.height = `${info.height}px`;
    piece.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(piece);
    const fallDy = targetCenterY - info.aboveBoardY;
    piece.animate([
        { transform: 'translate(-50%, -50%)', opacity: 1 },
        { transform: `translate(-50%, -50%) translate(0, ${fallDy}px)`, opacity: 1 }
    ], { duration: 350, easing: 'ease-in' }).onfinish = () => {
        piece.remove();
        callback();
    };
}

function animatePlayerMove(col, row, callback) {
    const info = getColumnInfo(col);
    const targetCell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!info || !targetCell) { callback(); return; }
    const targetRect = targetCell.getBoundingClientRect();
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const currentX = parseFloat(floatingPiece.style.left);
    const currentY = parseFloat(floatingPiece.style.top);
    const slideDx = info.centerX - currentX;
    const slideDy = info.aboveBoardY - currentY;
    const needSlide = !isNaN(currentX) && !isNaN(currentY) && (Math.abs(slideDx) > 1 || Math.abs(slideDy) > 1);

    if (needSlide) {
        if (hoverAnim) { hoverAnim.cancel(); hoverAnim = null; }
        const slide = floatingPiece.animate([
            { transform: 'translate(-50%, -50%)' },
            { transform: `translate(-50%, -50%) translate(${slideDx}px, ${slideDy}px)` }
        ], { duration: 150, easing: 'ease-out' });
        slide.onfinish = () => {
            hideFloatingPiece();
            fallPiece(info, targetCenterY, PLAYER, callback);
        };
    } else {
        hideFloatingPiece();
        fallPiece(info, targetCenterY, PLAYER, callback);
    }
}

function botFall(col, row, callback) {
    const info = getColumnInfo(col);
    const targetCell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (!info || !targetCell) { callback(); return; }
    const targetRect = targetCell.getBoundingClientRect();
    fallPiece(info, targetRect.top + targetRect.height / 2, BOT, callback);
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
    processing = true;
    const row = getDropRow(col);
    animatePlayerMove(col, row, () => {
        const ended = processMove(col, row, PLAYER);
        if (ended) { processing = false; return; }
        botThinking = true;
        hideFloatingPiece();
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
            botFall(botCol, botRow, () => {
                const ended = processMove(botCol, botRow, BOT);
                botThinking = false;
                processing = false;
                if (ended) return;
                showFloatingPiece();
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
    lastHoverCol = col;
    slideFloatingPiece(col);
});

boardEl.addEventListener('mouseleave', () => {
    lastHoverCol = -1;
    if (hoverAnim) { hoverAnim.cancel(); hoverAnim = null; }
    showFloatingPiece();
});

boardEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    handleCellClick(parseInt(cell.dataset.col));
});

document.querySelectorAll('.difficulty .diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty .diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
        initBoard();
    });
});

document.getElementById('new-game').addEventListener('click', initBoard);

initBoard();
