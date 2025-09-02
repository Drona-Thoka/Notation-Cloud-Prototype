document.addEventListener('DOMContentLoaded', () => {
    //alert("Board Dom loaded")
    const game = new Chess();

    alert("Type of Game" + typeof game)

    const board = Chessboard('board', {
        draggable: true,
        position: 'start',
        pieceTheme: '/static/img/wikipedia/{piece}.png',
        onDrop: handleMove
    });

    alert("Type of Board" + typeof board)

    function handleMove(source, target, piece, newPos, oldPos, orientation) {
        const move = game.move({ from: source, to: target, promotion: 'q' });
        if (move === null) return 'snapback';
        updatePGNOutput();
    }

    function updatePGNOutput() {
        const pgn = game.pgn();
        const output = document.getElementById('pgnOutput');
        if (output) output.innerText = pgn;
    }

    window.game = game;
    window.board = board;
    window.updatePGNOutput = updatePGNOutput;
});
