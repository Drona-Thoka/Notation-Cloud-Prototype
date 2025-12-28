window.addEventListener("load", function() {
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
    ////alert("game initialized : " + game)

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

function createMoveString(pgn){
        return pgn.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
}

function validateMoves(pgn){
    validationGame.reset();
    const moves = createMoveString(pgn);

    for(let i = 0; i < moves.length; i++){

        try{        
            const result = validationGame.move(moves[i], {sloppy: true});
            if(!result){
                return {
                    valid: false,
                    moveIndex: i,  
                    move: moves[i],
                    reason: "illegal_move"
                }
            }
        }
        catch (e){
            return {
                valid: false, 
                moveIndex: i,
                move: moves[i],
                reason: "wrong_text_input"
            }
        }

    }  

    return {
        valid: true, 
        moveIndex: null,
        move: null,
        reason: null
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


document.addEventListener('DOMContentLoaded', function(){
    downloadBtn = document.getElementById("download-btn");

    downloadBtn.addEventListener('click', function(){
        const pgn = document.getElementById('pgnOutput').textContent.trim();

        if (!pgn) {
            showWarningBubble(downloadBtn, "No PGN to download!");
            return;
        }

        // Create a blob (text file)
        const blob = new Blob([pgn], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        // Create a temporary link and trigger click
        const a = document.createElement('a');
        a.href = url;
        a.download = 'game.pgn'; // default filename
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        // Feedback
        showWarningBubble(downloadBtn, "PGN downloaded!");
    });

});


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
