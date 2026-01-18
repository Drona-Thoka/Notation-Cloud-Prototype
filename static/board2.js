window.addEventListener('load', function() {
    // Assuming chessboard.js and chess.js are loaded
    const boardElement = document.getElementById('myBoard');
    if (!boardElement) {
        //alert("myBoard element not found!");
        return;
    }

    if (typeof Chess === 'undefined') {
        //alert("Chess.js not loaded!");
        return;
    }
    if (typeof Chessboard === 'undefined') {
        //alert("Chessboard.js not loaded!");
        return;
    }

    const game = new Chess();
    //alert("game initialized : " + game)

    const board = ChessBoard('myBoard', {
        draggable: true,
        position: 'start',
        onDrop: onDrop,
    });
    //alert("board initialized : " + board);


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

let validationGame = new Chess(); // Separate game instance for validation

function createMoveMatrix(pgn){
    return pgn.replace(/\d+\./g, '').trim().split(/\r+/).filter(Boolean);
}

function createMoveArray(pgn) {
    return pgn.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
}
function validateMoves(pgn) {
    //alert("validateMoves->before game reset");
    validationGame.reset();
    //alert("validateMoves->before move matrix");
    const moveRows = createMoveMatrix(pgn);
    
    for(let i = 0; i < moveRows.length; i++){
        //alert("validateMoves->before move array");
        const moves = createMoveArray(moveRows[i]);
        //alert("validateMoves->after move array");
    
        for (let j = 0; j < moves.length; j++) {
            try {
                const result = validationGame.move(moves[j]);
                //alert("validateMoves->after validation game");
                if (!result) {
                    return {
                        valid: false,
                        moveRow: i + 1,
                        moveNumber: j, 
                        move: moves[j],
                        reason: "illegal_move"
                    }
                }
            } catch (e) {
                return {
                    valid: false,
                    moveRow: i + 1,
                    moveNumber: j, 
                    move: moves[j],
                    reason: "wrong_text_input"
                }
            }
        }
    }
    return {
        valid: true,
        moveRow: 0,
        moveNumber: 0, 
        move: "",
        reason: ""
    }
};


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
function collectPGN() {
    // Get all the form values (use placeholder text if empty)
    const event = document.getElementById('event').value || document.getElementById('event').placeholder;
    const site = document.getElementById('site').value || document.getElementById('site').placeholder;
    const date = document.getElementById('date').value || document.getElementById('date').placeholder;
    const round = document.getElementById('round').value || document.getElementById('round').placeholder;
    const white = document.getElementById('white').value || document.getElementById('white').placeholder;
    const black = document.getElementById('black').value || document.getElementById('black').placeholder;
    const result = document.getElementById('result').value;
    //alert("Data collected");
    // Get the moves
    const moveStr = document.getElementById('moveInput').value || '';
    //alert("Moves collected");
    
    // Build the PGN
    let pgn = 
`[Event "${event}"]
[Site "${site}"]
[Date "${date}"]
[Round "${round}"]
[White "${white}"]
[Black "${black}"]
[Result "${result}"]

${moveStr}`;
    
    //alert("PGn string built");
    // If there are moves, add the result at the end
    
    return {pgn: pgn, result: result, moveStr: moveStr};
    // Put it in the output
    //document.getElementById('pgnOutput').textContent = pgn;
}

// == Copy Button == 
document.addEventListener('DOMContentLoaded', function() {
    const copyBtn = document.getElementById('copy-btn');
    const pgnOutput = document.getElementById('pgnOutput');

    copyBtn.addEventListener('click', async function() {
        const pgn = pgnOutput.textContent.trim();

        if (!pgn) {
            showWarningBubble(copyBtn, "No PGN to copy!");
            return;
        }

        try {
            await navigator.clipboard.writeText(pgn);
            showWarningBubble(copyBtn, "PGN copied!");
        } catch (err) {
            console.error("Clipboard copy failed:", err);
            showWarningBubble(copyBtn, "Copy failed — check permissions");
        }
    });
});

//Download
document.addEventListener('DOMContentLoaded', function() {
    downloadBtn = document.getElementById("download-btn");

    downloadBtn.addEventListener('click', function(){
        console.log("click event listener is called :");
        //alert("click event listener is called :");
        const pgn = collectPGN();
        //alert("Movestr:" + pgn.moveStr);
        // == New code == 
        let valid = validateMoves(pgn.moveStr);
        if(!valid.valid)
        {
            alert("invalid input found");
            return;
        }


        if (!pgn) {
            showWarningBubble(downloadBtn, "No PGN to download!");
            return;
        }

        // Create a blob (text file)
        //alert("Before Blob");
        const blob = new Blob([pgn.pgn + " " + pgn.result], { type: 'text/plain' });
        //alert("After Blob:");
        const url = URL.createObjectURL(blob);
        //alert("After URL:");

        // Create a temporary link and trigger click
        const a = document.createElement('a');
        a.href = url;
        a.download = 'game.pgn'; // default filename
        document.body.appendChild(a);
        a.click();
        //alert("After a.click:");

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        console.log("PGN downloaded!");
        //alert("PGN downloaded!");
        // Feedback
        showWarningBubble(downloadBtn, "PGN downloaded!");

    });
});

// Auto-numbering when Enter is pressed
function setupAutoNumbering() {
    const moveInput = document.getElementById('moveInput');
    
    moveInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            //alert("before preventDefault");
            // e.preventDefault(); // Stop normal Enter behavior
            // //alert("after preventDefault");
            
            // const cursorPos = moveInput.selectionStart;
            const text = moveInput.value;
            
            // // Get the current line
            // const textBeforeCursor = text.substring(0, cursorPos);
            const lines = text.split('\n');
            const currentLine = lines[lines.length - 1];
            
            // Check if current line has both moves (white and black)
            const moveCount = countMovesInLine(currentLine);
            //alert("moveCount:" + moveCount);
            if (moveCount < 2) {
                // Show simple warning bubble
                showWarningBubble(this, "Complete the move pair first");
                return; // Don't allow Enter
            }

            if (moveCount > 2){
                showWarningBubble(this, "Only 1 move per color (2 total)")
                return;
            } 
            
            const currentLineText = getCurrentMoveNumber(currentLine) + '. ' + currentLine.replace(/^\d+\.\s*/, '');
            const isValid = validateMoves(currentLineText);
            if (!isValid) {
                showWarningBubble(this, "Current line has invalid moves");
                return;
            }
            
            // Both moves present, start new line with next number
            const nextMoveNumber = getNextMoveNumber(text);
            const newText = text.substring(0, cursorPos) + '\n' + nextMoveNumber + '. ' + text.substring(cursorPos);
            
            moveInput.value = newText;
            
            // Set cursor position after the new move number
            const newCursorPos = cursorPos + ('\n' + nextMoveNumber + '. ').length;
            moveInput.setSelectionRange(newCursorPos, newCursorPos);
            
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
});

