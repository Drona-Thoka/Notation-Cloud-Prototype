window.addEventListener('load', function() {
    // Assuming chessboard.js and chess.js are loaded
    const boardElement = document.getElementById('myBoard');
    if (!boardElement) {
        alert("myBoard element not found!");
        return;
    }

    if (typeof Chess === 'undefined') {
        alert("Chess.js not loaded!");
        return;
    }
    if (typeof Chessboard === 'undefined') {
        alert("Chessboard.js not loaded!");
        return;
    }

    const game = new Chess();
    //alert("game initialized : " + game)

    const board = ChessBoard('myBoard', {
        draggable: true,
        position: 'start',
        onDrop: onDrop,
    });
    alert("board initialized : " + board);


    function onDrop(source, target) {
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q' // Example: always promote to a queen
        });

        // If the move is illegal, snap the piece back
        if (move === null) return 'snapback';
    }

    // Update the board after a successful move (e.g., for castling)
    board.on('change', function() {
        board.position(game.fen());
    });

});

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

// Simple PGN Live Update
function updatePGN() {
    // Get all the form values (use placeholder text if empty)
    const event = document.getElementById('event').value || document.getElementById('event').placeholder;
    const site = document.getElementById('site').value || document.getElementById('site').placeholder;
    const date = document.getElementById('date').value || document.getElementById('date').placeholder;
    const round = document.getElementById('round').value || document.getElementById('round').placeholder;
    const white = document.getElementById('white').value || document.getElementById('white').placeholder;
    const black = document.getElementById('black').value || document.getElementById('black').placeholder;
    const result = document.getElementById('result').value;
    
    // Get the moves
    const moves = document.getElementById('moveInput').value || '';
    
    // Build the PGN
    let pgn = `[Event "${event}"]
[Site "${site}"]
[Date "${date}"]
[Round "${round}"]
[White "${white}"]
[Black "${black}"]
[Result "${result}"]

${moves}`;
    
    // If there are moves, add the result at the end
    if (moves.trim()) {
        pgn += ` ${result}`;
    } else {
        pgn += result;
    }
    
    // Put it in the output
    document.getElementById('pgnOutput').textContent = pgn;
}

// Auto-numbering when Enter is pressed
function setupAutoNumbering() {
    const moveInput = document.getElementById('moveInput');
    
    moveInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Stop normal Enter behavior
            
            const cursorPos = moveInput.selectionStart;
            const text = moveInput.value;
            
            // Get the current line
            const textBeforeCursor = text.substring(0, cursorPos);
            const lines = textBeforeCursor.split('\n');
            const currentLine = lines[lines.length - 1];
            
            // Check if current line has both moves (white and black)
            const moveCount = countMovesInLine(currentLine);
            
            if (moveCount < 2) {
                // Show simple warning bubble
                showWarningBubble(this, "Complete the move pair first");
                return; // Don't allow Enter
            }
            
            // Both moves present, start new line with next number
            const nextMoveNumber = getNextMoveNumber(text);
            const newText = text.substring(0, cursorPos) + '\n' + nextMoveNumber + '. ' + text.substring(cursorPos);
            
            moveInput.value = newText;
            
            // Set cursor position after the new move number
            const newCursorPos = cursorPos + ('\n' + nextMoveNumber + '. ').length;
            moveInput.setSelectionRange(newCursorPos, newCursorPos);
            
            // Update PGN output
            updatePGN();
        }
    });
}

function countMovesInLine(line) {
    // Remove move number (like "1. ") then count remaining moves
    const withoutNumber = line.replace(/^\d+\.\s*/, '');
    if (!withoutNumber.trim()) return 0;
    
    // Split by spaces and count valid moves
    const tokens = withoutNumber.trim().split(/\s+/);
    return tokens.filter(token => token.length > 0).length;
}

function getCurrentMoveNumber(line) {
    const match = line.match(/^(\d+)\./);
    return match ? parseInt(match[1]) : 1;
}

function getNextMoveNumber(text) {
    // Find the highest move number in the text
    const matches = text.match(/(\d+)\./g);
    if (!matches) return 1;
    
    const numbers = matches.map(match => parseInt(match.replace('.', '')));
    return Math.max(...numbers) + 1;
}

// Listen for changes on ALL inputs
document.addEventListener('DOMContentLoaded', function() {
    setupAutoNumbering();

    const inputs = ['event', 'site', 'date', 'round', 'white', 'black', 'result', 'moveInput'];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        element.addEventListener('input', updatePGN);
    });
    
    // Update once when page loads
    updatePGN();
});

