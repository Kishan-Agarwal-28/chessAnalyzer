let board = null;
let game = new Chess();
let ws = null;
let currentMoveIndex = -1;
let moves = [];
let arrows = null;

// Initialize WebSocket connection
function initWebSocket() {
    ws = createAuthenticatedWebSocket("ws://chessanalyzer.onrender.com/ws")
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'analysis') {
            updateAnalysis(data);
            updateArrows(data);
        }
    };

    ws.onclose = function() {
        setTimeout(initWebSocket, 1000); // Try to reconnect
    };
}

// Get all squares attacked by a piece
function getAttackedSquares(from, pieceType, color) {
    const attacks = [];
    const board = game.board();
    
    // Helper to check if square is attackable
    const canAttack = (toSquare) => {
        const piece = game.get(toSquare);
        return !piece || piece.color !== color;
    };
    
    switch(pieceType.toLowerCase()) {
        case 'p': // Pawn
            const forward = color === 'w' ? 1 : -1;
            const rank = parseInt(from[1]);
            const file = from.charCodeAt(0) - 'a'.charCodeAt(0);
            
            // Diagonal captures
            if (file > 0) {
                const leftCapture = String.fromCharCode('a'.charCodeAt(0) + file - 1) + (rank + forward);
                if (canAttack(leftCapture)) attacks.push(leftCapture);
            }
            if (file < 7) {
                const rightCapture = String.fromCharCode('a'.charCodeAt(0) + file + 1) + (rank + forward);
                if (canAttack(rightCapture)) attacks.push(rightCapture);
            }
            break;
            
        case 'n': // Knight
            const knightMoves = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];
            const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
            const fromRank = parseInt(from[1]) - 1;
            
            for (const [dx, dy] of knightMoves) {
                const toFile = fromFile + dx;
                const toRank = fromRank + dy;
                if (toFile >= 0 && toFile < 8 && toRank >= 0 && toRank < 8) {
                    const toSquare = String.fromCharCode('a'.charCodeAt(0) + toFile) + (toRank + 1);
                    if (canAttack(toSquare)) attacks.push(toSquare);
                }
            }
            break;
            
        case 'b': // Bishop
            for (const [dx, dy] of [[1,1], [1,-1], [-1,1], [-1,-1]]) {
                let file = from.charCodeAt(0) - 'a'.charCodeAt(0);
                let rank = parseInt(from[1]) - 1;
                while (true) {
                    file += dx;
                    rank += dy;
                    if (file < 0 || file > 7 || rank < 0 || rank > 7) break;
                    const toSquare = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
                    if (canAttack(toSquare)) attacks.push(toSquare);
                    if (game.get(toSquare)) break;
                }
            }
            break;
            
        case 'r': // Rook
            for (const [dx, dy] of [[0,1], [0,-1], [1,0], [-1,0]]) {
                let file = from.charCodeAt(0) - 'a'.charCodeAt(0);
                let rank = parseInt(from[1]) - 1;
                while (true) {
                    file += dx;
                    rank += dy;
                    if (file < 0 || file > 7 || rank < 0 || rank > 7) break;
                    const toSquare = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
                    if (canAttack(toSquare)) attacks.push(toSquare);
                    if (game.get(toSquare)) break;
                }
            }
            break;
            
        case 'q': // Queen (combination of bishop and rook)
            for (const [dx, dy] of [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]) {
                let file = from.charCodeAt(0) - 'a'.charCodeAt(0);
                let rank = parseInt(from[1]) - 1;
                while (true) {
                    file += dx;
                    rank += dy;
                    if (file < 0 || file > 7 || rank < 0 || rank > 7) break;
                    const toSquare = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
                    if (canAttack(toSquare)) attacks.push(toSquare);
                    if (game.get(toSquare)) break;
                }
            }
            break;
            
        case 'k': // King
            for (const [dx, dy] of [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]]) {
                const file = from.charCodeAt(0) - 'a'.charCodeAt(0) + dx;
                const rank = parseInt(from[1]) - 1 + dy;
                if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
                    const toSquare = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
                    if (canAttack(toSquare)) attacks.push(toSquare);
                }
            }
            break;
    }
    
    return attacks;
}

// Get squares protected by a piece
function getProtectedSquares(from, pieceType, color) {
    const protects = [];
    const board = game.board();
    
    // A square is protected if it contains a friendly piece
    const isProtected = (toSquare) => {
        const piece = game.get(toSquare);
        return piece && piece.color === color;
    };
    
    // Use the same movement patterns as attacks but only count friendly pieces
    const potentialSquares = getAttackedSquares(from, pieceType, color);
    return potentialSquares.filter(square => isProtected(square));
}

// Update arrows and highlights based on analysis
function updateArrows(data) {
    if (!board) return;
    
    // Clear all highlights first
    clearHighlights();
    
    // For the last played move
    if (currentMoveIndex >= 0) {
        const lastMove = moves[currentMoveIndex];
        const from = lastMove.from;
        const to = lastMove.to;
        const piece = lastMove.piece;
        const color = lastMove.color;
        
        // Green arrow for the played move
        arrows.addArrow(from, to, 'rgba(76, 175, 80, 0.8)');
        
        // Red highlight for attacked squares
        const attackedSquares = getAttackedSquares(to, piece, color);
        attackedSquares.forEach(square => {
            highlightSquare(square, 'highlight-attacked');
        });
        
        // Blue highlight for protected pieces
        const protectedSquares = getProtectedSquares(to, piece, color);
        protectedSquares.forEach(square => {
            highlightSquare(square, 'highlight-protected');
        });
    }
    
    // For the best move
    if (data.bestMove) {
        const from = data.bestMove.slice(0, 2);
        const to = data.bestMove.slice(2, 4);
        const piece = game.get(from)?.type;
        const color = game.turn();
        
        // Orange arrow for the best move
        arrows.addArrow(from, to, 'rgba(255, 152, 0, 0.8)');
        
        if (piece) {
            // Yellow highlight for best move's potential attacks
            const attackedSquares = getAttackedSquares(to, piece, color);
            attackedSquares.forEach(square => {
                highlightSquare(square, 'highlight-best-attacked');
            });
            
            // Purple arrows for best move's potential protections
            const protectedSquares = getProtectedSquares(to, piece, color);
            protectedSquares.forEach(square => {
                arrows.addArrow(to, square, 'rgba(156, 39, 176, 0.6)');
            });
        }
    }
}

// Function to highlight a square
function highlightSquare(square, className) {
    const squareEl = document.querySelector(`.square-${square}`);
    if (squareEl) {
        squareEl.classList.add(className);
    }
}

// Function to clear all highlights
function clearHighlights() {
    const squares = document.querySelectorAll('.square-55d63');
    squares.forEach(square => {
        square.classList.remove('highlight-attacked', 'highlight-protected', 'highlight-best-attacked');
    });
    if (arrows) {
        arrows.clearArrows();
    }
}

// Update the analysis display
function updateAnalysis(data) {
    document.getElementById('score').textContent = data.score.toFixed(2);
    document.getElementById('bestMove').textContent = data.bestMove;
    document.getElementById('analysis').textContent = data.analysis;
    document.getElementById('bestLine').textContent = data.pv.join(' ');
    
    // Update evaluation bar
    const evalBar = document.querySelector('.eval-fill');
    const evalHeight = Math.max(0, Math.min(100, (50 - data.score * 5))) + '%';
    evalBar.style.height = evalHeight;
}

// Load and parse PGN
function loadPGN(pgn) {
    if (!game.load_pgn(pgn)) {
        alert('Invalid PGN format');
        return false;
    }
    
    moves = [];
    const history = game.history({ verbose: true });
    
    // Reset the game and build moves list
    game.reset();
    currentMoveIndex = -1;
    
    const movesList = document.getElementById('movesList');
    movesList.innerHTML = '';
    
    history.forEach((move, index) => {
        moves.push(move);
        
        if (index % 2 === 0) {
            const moveRow = document.createElement('div');
            moveRow.className = 'move-row';
            moveRow.innerHTML = `${Math.floor(index/2 + 1)}. ${move.san}`;
            moveRow.setAttribute('data-move-index', index);
            movesList.appendChild(moveRow);
        } else {
            const lastRow = movesList.lastElementChild;
            lastRow.innerHTML += ` ${move.san}`;
        }
    });
    
    // Add click handlers for moves
    document.querySelectorAll('.move-row').forEach(row => {
        row.addEventListener('click', () => {
            const moveIndex = parseInt(row.getAttribute('data-move-index'));
            goToMove(moveIndex);
        });
    });
    
    return true;
}

// Navigate to specific move
function goToMove(index) {
    if (index < -1 || index >= moves.length) return;
    
    let targetFen;
    
    // Store current position
    const currentPosition = game.fen();
    
    // Calculate target position
    const tempGame = new Chess();
    for (let i = 0; i <= index; i++) {
        tempGame.move(moves[i]);
    }
    targetFen = tempGame.fen();
    
    // Update the actual game state
    game.load(targetFen);
    currentMoveIndex = index;
    
    // Animate to the new position
    board.position(targetFen, true); // true enables animation
    
    // Update active move in the moves list
    document.querySelectorAll('.move-row').forEach(row => {
        row.classList.remove('active');
        const rowIndex = parseInt(row.getAttribute('data-move-index'));
        if (rowIndex === index || rowIndex === (index - 1)) {
            row.classList.add('active');
        }
    });
    
    // Clear existing highlights and request analysis
    clearHighlights();
    requestAnalysis(index >= 0 ? moves[index].san : null);
}

// Request position analysis
function requestAnalysis(lastMove) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            command: 'analyze_position',
            fen: game.fen(),
            last_move: lastMove
        }));
    }
}

// Initialize the board and game
window.onload = function() {
    const config = {
        draggable: true,
        position: 'start',
        onDrop: (source, target) => {
            // Check if the move is legal
            const move = game.move({
                from: source,
                to: target,
                promotion: 'q' // Always promote to queen for simplicity
            });

            // If illegal move, snapback
            if (move === null) return 'snapback';

            // Add the move to our moves list
            moves.push(move);
            currentMoveIndex = moves.length - 1;

            // Clear any existing highlights and arrows
            clearHighlights();

            // Request analysis after each move
            requestAnalysis(move);

            // Update board position
            board.position(game.fen());
        },
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    };
    
    // Initialize the board after making sure jQuery is loaded
    $(document).ready(() => {
        board = Chessboard('board', config);
        arrows = new ChessboardArrows('board_wrapper');
        initWebSocket();
        
        // Make sure board fills its container
        $('#board').css({
            width: '100%',
            height: '100%'
        });
        
        // Adjust board size on window resize
        $(window).resize(() => {
            board.resize();
            clearHighlights();  // Re-apply highlights after resize
        });
    });
    
    // Button handlers
    document.getElementById('analyzePgn').addEventListener('click', () => {
        const pgn = document.getElementById('pgnInput').value;
        if (loadPGN(pgn)) {
            goToMove(-1); // Start from initial position
        }
    });
    
    document.getElementById('prevMove').addEventListener('click', () => {
        goToMove(currentMoveIndex - 1);
    });
    
    document.getElementById('nextMove').addEventListener('click', () => {
        goToMove(currentMoveIndex + 1);
    });
    
    document.getElementById('startBtn').addEventListener('click', () => {
        game.reset();
        board.start();
        moves = [];
        currentMoveIndex = -1;
        clearHighlights();
        requestAnalysis();
    });
    
    document.getElementById('flipBtn').addEventListener('click', () => {
        board.flip();
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            goToMove(currentMoveIndex - 1);
        } else if (e.key === 'ArrowRight') {
            goToMove(currentMoveIndex + 1);
        }
    });
    
    // Initial analysis request
    requestAnalysis();
};
