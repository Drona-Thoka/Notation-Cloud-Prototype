// PGN Maker
// The textarea is the source of truth: moves are typed one pair per line ("1. e4 e5"),
// validated with chess.js, and mirrored on the board. Dragging a piece appends the move.

let game = null;   // chess.js game for the current (valid) moves
let board = null;  // chessboard.js board

window.addEventListener('load', function() {
    if (typeof Chess === 'undefined' || typeof Chessboard === 'undefined') {
        setStatus("Chess libraries failed to load. Check your internet connection.", true);
        return;
    }

    game = new Chess();
    board = Chessboard('myBoard', {
        draggable: true,
        position: 'start',
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: function() { board.position(game.fen()); } // castling, en passant, promotion
    });

    const moveInput = document.getElementById('moveInput');
    if (moveInput.value.trim() === '') moveInput.value = '1. ';
    moveInput.addEventListener('input', syncBoard);
    moveInput.addEventListener('keydown', onMoveInputKeydown);

    document.getElementById('copy-btn').addEventListener('click', copyPGN);
    document.getElementById('download-btn').addEventListener('click', downloadPGN);
    document.getElementById('attach-btn').addEventListener('click', attachPGN);
    document.getElementById('clear-btn').addEventListener('click', clearMoves);

    prefillFromUploadForm();
    syncBoard();
});

// == Parsing / validation ==

// Strip move numbers, results, comments and annotations, leaving SAN tokens
function tokenizeMoves(text) {
    return text
        .replace(/\{[^}]*\}/g, ' ')                    // {comments}
        .replace(/\d+\.(\.\.)?/g, ' ')                 // 1.  1...
        .replace(/(1-0|0-1|1\/2-1\/2|0\.5-0\.5|\*)/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map(token => token.replace(/[!?]+$/, '').replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O'));
}

// Play the typed moves on a fresh game. Returns {game, error} where error describes the first bad move
function parseMoves(text) {
    const parsed = new Chess();
    const tokens = tokenizeMoves(text);

    for (let i = 0; i < tokens.length; i++) {
        if (!parsed.move(tokens[i])) {
            const moveNumber = Math.floor(i / 2) + 1;
            const side = (i % 2 === 0) ? "White" : "Black";
            return { game: parsed, error: `Move ${moveNumber} (${side}): "${tokens[i]}" is not legal here` };
        }
    }
    return { game: parsed, error: null };
}

// Re-parse the textarea and update the board + status line
function syncBoard() {
    const result = parseMoves(document.getElementById('moveInput').value);
    game = result.game;
    if (board) board.position(game.fen());

    if (result.error) {
        setStatus(result.error, true);
    } else {
        const plies = game.history().length;
        let msg = plies === 0 ? "No moves yet" : `${Math.ceil(plies / 2)} move(s), ${game.turn() === 'w' ? 'White' : 'Black'} to play`;
        if (game.in_checkmate()) msg = "Checkmate!";
        else if (game.in_draw()) msg = "Draw";
        setStatus(msg, false);
    }
    return result;
}

function setStatus(message, isError) {
    const status = document.getElementById('move-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
}

// == Board dragging ==

function onDragStart(source, piece) {
    if (parseMoves(document.getElementById('moveInput').value).error) return false; // fix the text first
    if (game.game_over()) return false;
    if ((game.turn() === 'w' && piece.startsWith('b')) || (game.turn() === 'b' && piece.startsWith('w'))) return false;
}

function onDrop(source, target) {
    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';

    appendMoveToText(move);
    syncBoard();
}

// Add a SAN move to the end of the textarea, keeping one move pair per line
function appendMoveToText(move) {
    const moveInput = document.getElementById('moveInput');
    let text = moveInput.value.replace(/\s+$/, '');
    const moveNumber = Math.ceil(game.history().length / 2);

    if (move.color === 'w') {
        if (/^\d+\.$/.test(lastLine(text))) {
            text += ' ' + move.san;                          // line already has "N."
        } else {
            text += (text ? '\n' : '') + moveNumber + '. ' + move.san;
        }
    } else {
        text += ' ' + move.san;
    }
    moveInput.value = text;
}

function lastLine(text) {
    const lines = text.split('\n');
    return lines[lines.length - 1].trim();
}

// == Auto-numbering when Enter is pressed ==

function onMoveInputKeydown(e) {
    if (e.key !== 'Enter') return;

    const moveInput = this;
    // Only auto-number when typing at the end; let Enter behave normally mid-text
    if (moveInput.selectionStart !== moveInput.value.length) return;

    e.preventDefault();
    const result = syncBoard();
    if (result.error) {
        showWarningBubble(moveInput, "Fix the invalid move first");
        return;
    }

    const plies = game.history().length;
    if (plies === 0 || plies % 2 === 1) {
        showWarningBubble(moveInput, "Complete the move pair first");
        return;
    }

    moveInput.value = moveInput.value.replace(/\s+$/, '') + '\n' + (plies / 2 + 1) + '. ';
    moveInput.setSelectionRange(moveInput.value.length, moveInput.value.length);
}

// == PGN output ==

function fieldOr(id, fallback) {
    const value = document.getElementById(id).value.trim();
    return value || fallback;
}

// Build the PGN text, or return null (after warning) if the moves are invalid
function buildPGN(button) {
    const result = syncBoard();
    if (result.error) {
        showWarningBubble(button, result.error);
        return null;
    }
    if (result.game.history().length === 0) {
        showWarningBubble(button, "No moves to export!");
        return null;
    }

    const dateValue = document.getElementById('date').value; // YYYY-MM-DD
    const pgnGame = result.game;
    pgnGame.header(
        'Event', fieldOr('event', '?'),
        'Site', fieldOr('site', '?'),
        'Date', dateValue ? dateValue.replace(/-/g, '.') : '????.??.??',
        'Round', fieldOr('round', '?'),
        'White', fieldOr('white', '?'),
        'Black', fieldOr('black', '?'),
        'Result', document.getElementById('result').value
    );
    return pgnGame.pgn({ max_width: 80, newline_char: '\n' }) + '\n';
}

function pgnFileName() {
    const name = [fieldOr('white', 'White'), 'vs', fieldOr('black', 'Black'), document.getElementById('date').value]
        .filter(Boolean).join('_');
    return name.replace(/[^A-Za-z0-9_.-]+/g, '-') + '.pgn';
}

async function copyPGN() {
    const copyBtn = document.getElementById('copy-btn');
    const pgn = buildPGN(copyBtn);
    if (!pgn) return;

    try {
        await navigator.clipboard.writeText(pgn);
        showWarningBubble(copyBtn, "PGN copied!");
    } catch (err) {
        console.error("Clipboard copy failed:", err);
        showWarningBubble(copyBtn, "Copy failed — check permissions");
    }
}

function downloadPGN() {
    const downloadBtn = document.getElementById('download-btn');
    const pgn = buildPGN(downloadBtn);
    if (!pgn) return;

    const url = URL.createObjectURL(new Blob([pgn], { type: 'application/x-chess-pgn' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = pgnFileName();
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    showWarningBubble(downloadBtn, "PGN downloaded!");
}

function clearMoves() {
    const moveInput = document.getElementById('moveInput');
    moveInput.value = '1. ';
    syncBoard();
    moveInput.focus();
}

// == Link with the upload form (when opened from the Notation Cloud page) ==

function uploadForm() {
    try {
        if (window.opener && !window.opener.closed) return window.opener.document;
    } catch (e) { /* different origin */ }
    return null;
}

// Copy players/date/event already typed in the upload form, and show the attach button
function prefillFromUploadForm() {
    const doc = uploadForm();
    if (!doc || !doc.getElementById('pgnUpload')) return;

    const copyField = (fromId, toId, skip) => {
        const from = doc.getElementById(fromId);
        const to = document.getElementById(toId);
        if (from && to && !to.value && from.value && from.value !== skip) to.value = from.value;
    };
    copyField('whitePlayerUpload', 'white');
    copyField('blackPlayerUpload', 'black');
    copyField('dateUpload', 'date');
    copyField('eventUpload', 'event', 'Event');

    const result = doc.getElementById('resultUpload');
    if (result && result.selectedIndex > 0) {
        document.getElementById('result').value = result.value === '0.5-0.5' ? '1/2-1/2' : result.value;
    }
    document.getElementById('attach-btn').style.display = '';
}

// Put the PGN straight into the upload form's PGN file input
function attachPGN() {
    const attachBtn = document.getElementById('attach-btn');
    const doc = uploadForm();
    if (!doc) {
        showWarningBubble(attachBtn, "Upload page was closed");
        return;
    }
    const pgn = buildPGN(attachBtn);
    if (!pgn) return;

    const transfer = new DataTransfer();
    transfer.items.add(new File([pgn], pgnFileName(), { type: 'application/x-chess-pgn' }));
    const pgnInput = doc.getElementById('pgnUpload');
    pgnInput.files = transfer.files;
    // Setting .files doesn't fire "change", so trigger it for the form's PGN autofill
    pgnInput.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
    showWarningBubble(attachBtn, "Attached to upload form!");
}

function showWarningBubble(element, message) {
    const existingBubble = document.querySelector('.warning-bubble');
    if (existingBubble) existingBubble.remove();

    const bubble = document.createElement('div');
    bubble.className = 'warning-bubble';
    bubble.textContent = message;

    const rect = element.getBoundingClientRect();
    bubble.style.left = (rect.left + rect.width / 2) + 'px';
    bubble.style.top = (rect.top - 35 + window.scrollY) + 'px';
    bubble.style.transform = 'translateX(-50%)';

    document.body.appendChild(bubble);
    setTimeout(() => bubble.classList.add('show'), 10);
    setTimeout(() => {
        bubble.classList.remove('show');
        setTimeout(() => bubble.remove(), 200);
    }, 2000);
}
