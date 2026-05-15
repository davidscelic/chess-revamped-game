const boardElement = document.getElementById("board");
const turnElement = document.getElementById("turn");
const messageElement = document.getElementById("message");
const capturedWhiteElement = document.getElementById("capturedWhite");
const capturedBlackElement = document.getElementById("capturedBlack");
const moveHistoryElement = document.getElementById("moveHistory");
const whiteClockElement = document.getElementById("whiteClock");
const blackClockElement = document.getElementById("blackClock");

let lightColor = "#eeeeee";
let darkColor = "#769656";

let board;
let currentTurn;
let selectedSquare;
let gameOver;
let ratingUpdated;

let halfmoveClock;
let fullmoveNumber;

let capturedWhite;
let capturedBlack;
let moveHistory;
let undoStack;
let positionCounts;

let whiteTime;
let blackTime;
let increment;
let timerInterval;

let playerRating = Number(localStorage.getItem("chessRevampedRating")) || 1000;

const symbols = {
  wp: "♙", wr: "♖", wn: "♘", wb: "♗", wq: "♕", wk: "♔",
  bp: "♟", br: "♜", bn: "♞", bb: "♝", bq: "♛", bk: "♚"
};

const standardNames = {
  p: "Pawn",
  r: "Rook",
  n: "Knight",
  b: "Bishop",
  q: "Queen",
  k: "King"
};

const turkishNames = {
  p: "Nefer",
  r: "Subay",
  n: "Çavuş",
  b: "Kurmay",
  q: "Başkan",
  k: "Sultan"
};

const pieceValues = {
  p: 1,
  q: 2,
  n: 3,
  b: 3,
  r: 5,
  k: 1000
};

const boardThemes = {
  green: { light: "#eeeeee", dark: "#769656" },
  brown: { light: "#f0d9b5", dark: "#b58863" },
  blue: { light: "#e8f1ff", dark: "#4b79a1" },
  red: { light: "#fff1f1", dark: "#b94a48" },
  gray: { light: "#eeeeee", dark: "#666666" },
  purple: { light: "#f2e8ff", dark: "#6a4c93" }
};

function initializeAISelector() {
  const aiSelect = document.getElementById("aiElo");
  aiSelect.innerHTML = "";

  for (let elo = 200; elo <= 2500; elo += 100) {
    const option = document.createElement("option");
    option.value = elo;
    option.textContent = `Elo-style ${elo}`;

    if (elo === 1200) {
      option.selected = true;
    }

    aiSelect.appendChild(option);
  }
}

function getStartingBoard() {
  return [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"]
  ];
}

function restartGame() {
  board = getStartingBoard();
  currentTurn = "white";
  selectedSquare = null;
  gameOver = false;
  ratingUpdated = false;

  halfmoveClock = 0;
  fullmoveNumber = 1;

  capturedWhite = [];
  capturedBlack = [];
  moveHistory = [];
  undoStack = [];
  positionCounts = new Map();

  setupClock();
  stopClock();

  addCurrentPositionToRepetitionHistory();

  drawBoard();
  updatePanels();
  updateLanguageDisplay();
  updateRatingDisplay();
  updateClockDisplay();

  if (!getPlayerColor()) {
    messageElement.textContent = "Choose your side to start: White, Black, or Random.";
    turnElement.textContent = "Choose your side";
    return;
  }

  messageElement.textContent = "Chess Revamped started.";
  startClock();
  scheduleAIIfNeeded();
}

function handleSideSelection() {
  restartGame();
}

function setupClock() {
  const [base, inc] = document.getElementById("timeControl").value.split("|").map(Number);
  whiteTime = base;
  blackTime = base;
  increment = inc;
  updateClockDisplay();
}

function startClock() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (gameOver) return;
    if (!getPlayerColor()) return;

    if (currentTurn === "white") {
      whiteTime--;
      if (whiteTime <= 0) {
        whiteTime = 0;
        endGame("White ran out of time. Black wins.", "black");
      }
    } else {
      blackTime--;
      if (blackTime <= 0) {
        blackTime = 0;
        endGame("Black ran out of time. White wins.", "white");
      }
    }

    updateClockDisplay();
  }, 1000);
}

function stopClock() {
  clearInterval(timerInterval);
}

function updateClockDisplay() {
  whiteClockElement.textContent = `White: ${formatTime(whiteTime)}`;
  blackClockElement.textContent = `Black: ${formatTime(blackTime)}`;
}

function formatTime(seconds) {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function drawBoard() {
  boardElement.innerHTML = "";

  const playerColor = getPlayerColor();
  const rows = playerColor === "black" ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const cols = playerColor === "black" ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  const legalMoves = selectedSquare
    ? getLegalMovesForPiece(selectedSquare.row, selectedSquare.col)
    : [];

  const whiteRoyal = findKing("white");
  const blackRoyal = findKing("black");

  for (const row of rows) {
    for (const col of cols) {
      const square = document.createElement("div");
      square.classList.add("square");
      square.style.backgroundColor = (row + col) % 2 === 0 ? lightColor : darkColor;

      if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
        square.classList.add("selected");
      }

      const legalMove = legalMoves.find(move => move.toRow === row && move.toCol === col);

      if (legalMove) {
        if (board[row][col]) {
          square.classList.add("capture");
        } else {
          square.classList.add("legal");
        }
      }

      if (
        whiteRoyal &&
        row === whiteRoyal.row &&
        col === whiteRoyal.col &&
        isKingInCheck("white")
      ) {
        square.classList.add("in-check");
      }

      if (
        blackRoyal &&
        row === blackRoyal.row &&
        col === blackRoyal.col &&
        isKingInCheck("black")
      ) {
        square.classList.add("in-check");
      }

      const piece = board[row][col];
      square.textContent = symbols[piece] || "";

      square.addEventListener("click", () => handleSquareClick(row, col));

      boardElement.appendChild(square);
    }
  }

  if (!getPlayerColor()) {
    turnElement.textContent = "Choose your side";
  } else {
    turnElement.textContent = gameOver ? "Game Over" : `Turn: ${capitalize(currentTurn)}`;
  }
}

function handleSquareClick(row, col) {
  if (!getPlayerColor()) {
    messageElement.textContent = "Choose your side first: White, Black, or Random.";
    return;
  }

  if (gameOver) return;

  if (isAITurn()) {
    messageElement.textContent = "Computer is thinking.";
    return;
  }

  const clickedPiece = board[row][col];

  if (selectedSquare === null) {
    if (!clickedPiece) {
      messageElement.textContent = "Select a piece first.";
      return;
    }

    if (getPieceColor(clickedPiece) !== currentTurn) {
      messageElement.textContent = `It is ${currentTurn}'s turn.`;
      return;
    }

    selectedSquare = { row, col };
    messageElement.textContent = "";
    drawBoard();
    return;
  }

  const fromRow = selectedSquare.row;
  const fromCol = selectedSquare.col;
  const selectedPiece = board[fromRow][fromCol];

  if (row === fromRow && col === fromCol) {
    selectedSquare = null;
    messageElement.textContent = "";
    drawBoard();
    return;
  }

  if (clickedPiece && getPieceColor(clickedPiece) === currentTurn) {
    selectedSquare = { row, col };
    messageElement.textContent = "";
    drawBoard();
    return;
  }

  if (isLegalMove(selectedPiece, fromRow, fromCol, row, col, true)) {
    let promotionChoice = null;

    if (isPawnPromotionMove(selectedPiece, row)) {
      promotionChoice = askPromotionChoice();
    }

    makeMove(fromRow, fromCol, row, col, {
      promotionChoice,
      record: true
    });

    selectedSquare = null;
    finishTurn();
  } else {
    messageElement.textContent = `Illegal move or your ${getRoyalName()} would be in check.`;
  }
}

function finishTurn() {
  const movingColor = currentTurn;

  if (movingColor === "white") {
    whiteTime += increment;
  } else {
    blackTime += increment;
  }

  currentTurn = getOpponentColor(currentTurn);

  if (currentTurn === "white") {
    fullmoveNumber++;
  }

  addCurrentPositionToRepetitionHistory();

  const result = checkGameEnd(currentTurn);

  drawBoard();
  updatePanels();
  updateClockDisplay();

  if (!result) {
    if (isKingInCheck(currentTurn)) {
      messageElement.textContent = `${capitalize(currentTurn)} ${getRoyalName()} is in check.`;
    } else {
      messageElement.textContent = `${capitalize(currentTurn)} to move.`;
    }

    scheduleAIIfNeeded();
  }
}

function scheduleAIIfNeeded() {
  if (!gameOver && getPlayerColor() && isAITurn()) {
    setTimeout(computerMove, 350);
  }
}

function computerMove() {
  if (gameOver || !isAITurn()) return;

  const moves = getAllLegalMoves(currentTurn);

  if (moves.length === 0) {
    checkGameEnd(currentTurn);
    drawBoard();
    updatePanels();
    return;
  }

  const move = chooseAIMove(moves);
  const piece = board[move.fromRow][move.fromCol];

  let promotionChoice = null;

  if (isPawnPromotionMove(piece, move.toRow)) {
    promotionChoice = chooseAIPromotion();
  }

  makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, {
    promotionChoice,
    record: true
  });

  finishTurn();
}

function chooseAIMove(moves) {
  const elo = getAIElo();

  const randomChance = getRandomMoveChance(elo);

  if (Math.random() < randomChance) {
    return randomMove(moves);
  }

  if (elo < 700) {
    return randomMove(moves);
  }

  if (elo < 1100) {
    return chooseCaptureMove(moves);
  }

  if (elo < 1600) {
    return chooseBestScoredMove(moves);
  }

  const depth = getSearchDepth(elo);
  return chooseMinimaxMove(moves, depth);
}

function getRandomMoveChance(elo) {
  if (elo <= 300) return 0.85;
  if (elo <= 600) return 0.65;
  if (elo <= 900) return 0.45;
  if (elo <= 1200) return 0.25;
  if (elo <= 1500) return 0.15;
  if (elo <= 1800) return 0.08;
  if (elo <= 2100) return 0.04;
  return 0.02;
}

function getSearchDepth(elo) {
  if (elo < 1800) return 1;
  if (elo < 2300) return 2;
  return 3;
}

function randomMove(moves) {
  return moves[Math.floor(Math.random() * moves.length)];
}

function chooseCaptureMove(moves) {
  const capturingMoves = moves.filter(move => {
    const target = board[move.toRow][move.toCol];
    return target !== "";
  });

  if (capturingMoves.length > 0) {
    return randomMove(capturingMoves);
  }

  return randomMove(moves);
}

function chooseBestScoredMove(moves) {
  let bestScore = -9999;
  let bestMoves = [];

  for (const move of moves) {
    const score = scoreMove(move);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return randomMove(bestMoves);
}

function chooseMinimaxMove(moves, depth) {
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of moves) {
    const snapshot = createQuickSnapshot();
    applyMoveWithoutRecording(move.fromRow, move.fromCol, move.toRow, move.toCol);

    currentTurn = getOpponentColor(currentTurn);
    const score = -negamax(depth - 1, -Infinity, Infinity);

    restoreQuickSnapshot(snapshot);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return randomMove(bestMoves);
}

function negamax(depth, alpha, beta) {
  const color = currentTurn;
  const moves = getAllLegalMoves(color);

  if (moves.length === 0) {
    if (isKingInCheck(color)) {
      return -99999;
    }

    return 0;
  }

  if (depth === 0) {
    return evaluatePosition(color);
  }

  let bestScore = -Infinity;

  for (const move of moves) {
    const snapshot = createQuickSnapshot();

    applyMoveWithoutRecording(move.fromRow, move.fromCol, move.toRow, move.toCol);
    currentTurn = getOpponentColor(currentTurn);

    const score = -negamax(depth - 1, -beta, -alpha);

    restoreQuickSnapshot(snapshot);

    bestScore = Math.max(bestScore, score);
    alpha = Math.max(alpha, score);

    if (alpha >= beta) break;
  }

  return bestScore;
}

function evaluatePosition(colorPerspective) {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];

      if (!piece) continue;

      const value = pieceValues[getPieceType(piece)] * 100;
      const centerBonus = 8 - Math.abs(3.5 - row) - Math.abs(3.5 - col);
      const pieceScore = value + centerBonus;

      if (getPieceColor(piece) === colorPerspective) {
        score += pieceScore;
      } else {
        score -= pieceScore;
      }
    }
  }

  if (isKingInCheck(getOpponentColor(colorPerspective))) {
    score += 30;
  }

  if (isKingInCheck(colorPerspective)) {
    score -= 30;
  }

  return score;
}

function scoreMove(move) {
  const piece = board[move.fromRow][move.fromCol];
  const target = board[move.toRow][move.toCol];

  let score = 0;

  if (target) {
    score += pieceValues[getPieceType(target)] * 10;
  }

  if (isPawnPromotionMove(piece, move.toRow)) {
    score += 8;
  }

  const centerBonus =
    4 - Math.abs(3.5 - move.toRow) - Math.abs(3.5 - move.toCol);

  score += centerBonus;

  return score;
}

function makeMove(fromRow, fromCol, toRow, toCol, options = {}) {
  const record = options.record ?? false;
  const promotionChoice = options.promotionChoice ?? null;

  if (record) {
    saveUndoSnapshot();
  }

  const piece = board[fromRow][fromCol];
  const color = getPieceColor(piece);
  const target = board[toRow][toCol];

  let capturedPiece = target;

  if (capturedPiece) {
    if (getPieceColor(capturedPiece) === "white") {
      capturedWhite.push(capturedPiece);
    } else {
      capturedBlack.push(capturedPiece);
    }
  }

  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = "";

  if (isPawnPromotionMove(piece, toRow)) {
    const chosenPiece = promotionChoice || "r";
    board[toRow][toCol] = color[0] + chosenPiece;
  }

  if (getPieceType(piece) === "p" || capturedPiece) {
    halfmoveClock = 0;
  } else {
    halfmoveClock++;
  }

  if (record) {
    moveHistory.push(createMoveText(piece, fromRow, fromCol, toRow, toCol, capturedPiece, promotionChoice));
  }
}

function applyMoveWithoutRecording(fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  const color = getPieceColor(piece);

  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = "";

  if (isPawnPromotionMove(piece, toRow)) {
    board[toRow][toCol] = color[0] + "r";
  }
}

function createMoveText(piece, fromRow, fromCol, toRow, toCol, capturedPiece, promotionChoice) {
  const from = squareName(fromRow, fromCol);
  const to = squareName(toRow, toCol);
  const names = getPieceNames();

  const pieceName = names[getPieceType(piece)];
  const captureText = capturedPiece ? ` captures ${names[getPieceType(capturedPiece)]}` : "";
  const promotionText = promotionChoice ? ` promotes to ${names[promotionChoice]}` : "";

  return `${capitalize(getPieceColor(piece))} ${pieceName}: ${from} → ${to}${captureText}${promotionText}`;
}

function saveUndoSnapshot() {
  undoStack.push({
    board: cloneBoard(board),
    currentTurn,
    selectedSquare: selectedSquare ? { ...selectedSquare } : null,
    gameOver,
    ratingUpdated,
    halfmoveClock,
    fullmoveNumber,
    capturedWhite: [...capturedWhite],
    capturedBlack: [...capturedBlack],
    moveHistory: [...moveHistory],
    positionCounts: new Map(positionCounts),
    whiteTime,
    blackTime
  });
}

function undoMove() {
  if (!getPlayerColor()) {
    messageElement.textContent = "Choose your side before using undo.";
    return;
  }

  if (undoStack.length === 0) {
    messageElement.textContent = "No moves to undo.";
    return;
  }

  restoreUndoSnapshot();

  if (getGameMode() === "ai" && undoStack.length > 0 && currentTurn !== getPlayerColor()) {
    restoreUndoSnapshot();
  }

  gameOver = false;
  selectedSquare = null;
  messageElement.textContent = "Move undone.";
  drawBoard();
  updatePanels();
  updateClockDisplay();
}

function restoreUndoSnapshot() {
  const snapshot = undoStack.pop();

  board = cloneBoard(snapshot.board);
  currentTurn = snapshot.currentTurn;
  selectedSquare = snapshot.selectedSquare;
  gameOver = snapshot.gameOver;
  ratingUpdated = snapshot.ratingUpdated;
  halfmoveClock = snapshot.halfmoveClock;
  fullmoveNumber = snapshot.fullmoveNumber;
  capturedWhite = [...snapshot.capturedWhite];
  capturedBlack = [...snapshot.capturedBlack];
  moveHistory = [...snapshot.moveHistory];
  positionCounts = new Map(snapshot.positionCounts);
  whiteTime = snapshot.whiteTime;
  blackTime = snapshot.blackTime;
}

function createQuickSnapshot() {
  return {
    board: cloneBoard(board),
    currentTurn
  };
}

function restoreQuickSnapshot(snapshot) {
  board = cloneBoard(snapshot.board);
  currentTurn = snapshot.currentTurn;
}

function checkGameEnd(colorToMove) {
  const legalMoves = getAllLegalMoves(colorToMove);
  const inCheck = isKingInCheck(colorToMove);

  if (legalMoves.length === 0 && inCheck) {
    const winner = getOpponentColor(colorToMove);
    endGame(`Checkmate. ${capitalize(winner)} wins.`, winner);
    return true;
  }

  if (legalMoves.length === 0 && !inCheck) {
    endGame("Stalemate. Draw.", "draw");
    return true;
  }

  if (halfmoveClock >= 100) {
    endGame("Draw by 50-move rule.", "draw");
    return true;
  }

  if (isThreefoldRepetition()) {
    endGame("Draw by threefold repetition.", "draw");
    return true;
  }

  if (isInsufficientMaterial()) {
    endGame("Draw by insufficient material.", "draw");
    return true;
  }

  return false;
}

function endGame(message, winner) {
  gameOver = true;
  messageElement.textContent = message;
  clearInterval(timerInterval);

  updateRatingAfterGame(winner);

  drawBoard();
  updatePanels();
  updateClockDisplay();
}

function updateRatingAfterGame(winner) {
  if (ratingUpdated) return;
  if (getGameMode() !== "ai") return;
  if (!getPlayerColor()) return;

  const playerColor = getPlayerColor();
  const aiElo = getAIElo();

  let actualScore;

  if (winner === "draw") {
    actualScore = 0.5;
  } else if (winner === playerColor) {
    actualScore = 1;
  } else {
    actualScore = 0;
  }

  const expectedScore = 1 / (1 + Math.pow(10, (aiElo - playerRating) / 400));
  const k = playerRating < 1200 ? 40 : 32;

  const ratingChange = Math.round(k * (actualScore - expectedScore));

  playerRating += ratingChange;
  localStorage.setItem("chessRevampedRating", playerRating);

  ratingUpdated = true;

  if (ratingChange > 0) {
    messageElement.textContent += ` Rating +${ratingChange}.`;
  } else if (ratingChange < 0) {
    messageElement.textContent += ` Rating ${ratingChange}.`;
  } else {
    messageElement.textContent += " Rating unchanged.";
  }

  updateRatingDisplay();
}

function getAllLegalMoves(color) {
  const moves = [];

  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];

      if (!piece || getPieceColor(piece) !== color) continue;

      for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
          if (isLegalMove(piece, fromRow, fromCol, toRow, toCol, true)) {
            moves.push({ fromRow, fromCol, toRow, toCol });
          }
        }
      }
    }
  }

  return moves;
}

function getLegalMovesForPiece(row, col) {
  const piece = board[row][col];

  if (!piece) return [];

  const moves = [];

  for (let toRow = 0; toRow < 8; toRow++) {
    for (let toCol = 0; toCol < 8; toCol++) {
      if (isLegalMove(piece, row, col, toRow, toCol, true)) {
        moves.push({ fromRow: row, fromCol: col, toRow, toCol });
      }
    }
  }

  return moves;
}

function isLegalMove(piece, fromRow, fromCol, toRow, toCol, protectKing = true) {
  if (!piece) return false;
  if (fromRow === toRow && fromCol === toCol) return false;
  if (!isInsideBoard(toRow, toCol)) return false;

  const target = board[toRow][toCol];

  if (target && getPieceColor(target) === getPieceColor(piece)) {
    return false;
  }

  // The royal piece is never captured directly. Checkmate ends the game.
  if (target && getPieceType(target) === "k") {
    return false;
  }

  if (!isBasicLegalMove(piece, fromRow, fromCol, toRow, toCol)) {
    return false;
  }

  if (protectKing) {
    const color = getPieceColor(piece);
    const capturedPiece = board[toRow][toCol];

    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = "";

    const stillInCheck = isKingInCheck(color);

    board[fromRow][fromCol] = piece;
    board[toRow][toCol] = capturedPiece;

    if (stillInCheck) return false;
  }

  return true;
}

function isBasicLegalMove(piece, fromRow, fromCol, toRow, toCol) {
  const type = getPieceType(piece);
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;

  if (type === "p") {
    return isLegalPawnMove(piece, fromRow, fromCol, toRow, toCol);
  }

  if (type === "r") {
    return isStraightMove(fromRow, fromCol, toRow, toCol);
  }

  if (type === "b") {
    return isDiagonalMove(fromRow, fromCol, toRow, toCol);
  }

  if (type === "n") {
    return (
      (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
      (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2)
    );
  }

  // Queen/Başkan moves like the old king.
  if (type === "q") {
    return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;
  }

  // King/Sultan moves like the old queen.
  if (type === "k") {
    return (
      isStraightMove(fromRow, fromCol, toRow, toCol) ||
      isDiagonalMove(fromRow, fromCol, toRow, toCol)
    );
  }

  return false;
}

function isLegalPawnMove(piece, fromRow, fromCol, toRow, toCol) {
  const color = getPieceColor(piece);
  const direction = color === "white" ? -1 : 1;

  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const target = board[toRow][toCol];

  if (rowDiff !== direction) return false;

  // One square forward, either moving into empty square or capturing enemy.
  if (colDiff === 0) {
    return !target || getPieceColor(target) !== color;
  }

  // One square diagonally forward, only for capture.
  if (Math.abs(colDiff) === 1) {
    return target && getPieceColor(target) !== color;
  }

  return false;
}

function isPawnPromotionMove(piece, toRow) {
  if (!piece || getPieceType(piece) !== "p") return false;

  const color = getPieceColor(piece);

  return (
    (color === "white" && toRow === 0) ||
    (color === "black" && toRow === 7)
  );
}

function askPromotionChoice() {
  const names = getPieceNames();

  let choice = prompt(
    `Promote ${names.p} to: r = ${names.r}, b = ${names.b}, n = ${names.n}, q = ${names.q}`,
    "r"
  );

  if (!choice) return "r";

  choice = choice.toLowerCase();

  if (["q", "r", "b", "n"].includes(choice)) {
    return choice;
  }

  return "r";
}

function chooseAIPromotion() {
  return "r";
}

function isKingInCheck(color) {
  const kingPosition = findKing(color);

  if (!kingPosition) return false;

  return isSquareAttacked(
    kingPosition.row,
    kingPosition.col,
    getOpponentColor(color)
  );
}

function isSquareAttacked(row, col, attackingColor) {
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];

      if (!piece || getPieceColor(piece) !== attackingColor) continue;

      if (doesPieceAttackSquare(piece, fromRow, fromCol, row, col)) {
        return true;
      }
    }
  }

  return false;
}

function doesPieceAttackSquare(piece, fromRow, fromCol, targetRow, targetCol) {
  const type = getPieceType(piece);

  if (type === "p") {
    const color = getPieceColor(piece);
    const direction = color === "white" ? -1 : 1;

    return (
      targetRow - fromRow === direction &&
      Math.abs(targetCol - fromCol) <= 1
    );
  }

  return isBasicLegalMove(piece, fromRow, fromCol, targetRow, targetCol);
}

function findKing(color) {
  const king = color === "white" ? "wk" : "bk";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === king) {
        return { row, col };
      }
    }
  }

  return null;
}

function isStraightMove(fromRow, fromCol, toRow, toCol) {
  if (fromRow !== toRow && fromCol !== toCol) return false;

  return isPathClear(fromRow, fromCol, toRow, toCol);
}

function isDiagonalMove(fromRow, fromCol, toRow, toCol) {
  if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;

  return isPathClear(fromRow, fromCol, toRow, toCol);
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
  const rowStep = Math.sign(toRow - fromRow);
  const colStep = Math.sign(toCol - fromCol);

  let row = fromRow + rowStep;
  let col = fromCol + colStep;

  while (row !== toRow || col !== toCol) {
    if (board[row][col] !== "") return false;

    row += rowStep;
    col += colStep;
  }

  return true;
}

function isThreefoldRepetition() {
  const key = getPositionKey();
  return (positionCounts.get(key) || 0) >= 3;
}

function addCurrentPositionToRepetitionHistory() {
  const key = getPositionKey();
  positionCounts.set(key, (positionCounts.get(key) || 0) + 1);
}

function getPositionKey() {
  const boardKey = board.map(row => row.join(",")).join("/");
  return `${boardKey} ${currentTurn}`;
}

function isInsufficientMaterial() {
  const pieces = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) pieces.push(piece);
    }
  }

  const nonKings = pieces.filter(piece => getPieceType(piece) !== "k");

  if (nonKings.length === 0) return true;

  const strongPieces = nonKings.filter(piece => {
    const type = getPieceType(piece);
    return type === "p" || type === "r";
  });

  if (strongPieces.length > 0) return false;

  const whiteSmallPieces = nonKings.filter(piece => getPieceColor(piece) === "white").length;
  const blackSmallPieces = nonKings.filter(piece => getPieceColor(piece) === "black").length;

  return whiteSmallPieces <= 1 && blackSmallPieces <= 1;
}

function updatePanels() {
  capturedWhiteElement.textContent = capturedWhite.map(piece => symbols[piece]).join(" ");
  capturedBlackElement.textContent = capturedBlack.map(piece => symbols[piece]).join(" ");

  moveHistoryElement.innerHTML = "";

  for (const move of moveHistory) {
    const item = document.createElement("li");
    item.textContent = move;
    moveHistoryElement.appendChild(item);
  }
}

function updateLanguageDisplay() {
  updateRulesText();
  showRandomTip();
  updatePanels();
}

function updateRulesText() {
  const names = getPieceNames();

  document.getElementById("rulesText").innerHTML = `
    <ul>
      <li><strong>${names.k}:</strong> Moves like the old queen. This is still the royal piece. If it is checkmated, you lose.</li>
      <li><strong>${names.q}:</strong> Moves like the old king, only one square in any direction.</li>
      <li><strong>${names.p}:</strong> Moves one square forward only. No two-square opening move.</li>
      <li><strong>${names.p} captures:</strong> Can capture one square forward or one square diagonally forward.</li>
      <li><strong>Castling:</strong> Removed.</li>
      <li><strong>En passant:</strong> Removed.</li>
      <li><strong>Promotion:</strong> ${names.p} can promote to ${names.r}, ${names.b}, ${names.n}, or ${names.q}. ${names.r} is usually strongest.</li>
    </ul>
  `;
}

function showRandomTip() {
  const names = getPieceNames();

  const tips = [
    `Your ${names.k} is powerful, but it still cannot move into check.`,
    `${names.q} is weaker in Chess Revamped. Do not value it like a normal queen.`,
    `${names.p} can capture straight forward. This changes pawn fights a lot.`,
    `Promotion to ${names.r} is usually stronger than promotion to ${names.q}.`,
    `Use ${names.p} chains to trap the enemy ${names.k}.`,
    `Open lines matter because the ${names.k} moves long-range.`,
    `A trapped ${names.k} can still be checkmated even though it moves like a queen.`
  ];

  document.getElementById("tipText").textContent =
    tips[Math.floor(Math.random() * tips.length)];
}

function updateRatingDisplay() {
  document.getElementById("ratingDisplay").textContent = `Your Rating: ${playerRating}`;
  document.getElementById("aiRatingDisplay").textContent = `AI: ${getAIElo()}`;
}

function setBoardTheme() {
  const theme = document.getElementById("boardTheme").value;
  lightColor = boardThemes[theme].light;
  darkColor = boardThemes[theme].dark;

  if (board) {
    drawBoard();
  }
}

function randomizePlayerSide() {
  const randomColor = Math.random() < 0.5 ? "white" : "black";
  document.getElementById("playerColor").value = randomColor;
  restartGame();

  messageElement.textContent = `Random side selected: ${capitalize(randomColor)}. Game started.`;
}

function getPieceNames() {
  return document.getElementById("pieceLanguage").value === "turkish"
    ? turkishNames
    : standardNames;
}

function getRoyalName() {
  return getPieceNames().k;
}

function getGameMode() {
  return document.getElementById("gameMode").value;
}

function getPlayerColor() {
  return document.getElementById("playerColor").value;
}

function getAIElo() {
  return Number(document.getElementById("aiElo").value);
}

function isAITurn() {
  return getGameMode() === "ai" && currentTurn !== getPlayerColor();
}

function getPieceColor(piece) {
  return piece[0] === "w" ? "white" : "black";
}

function getPieceType(piece) {
  return piece[1];
}

function getOpponentColor(color) {
  return color === "white" ? "black" : "white";
}

function isInsideBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function squareName(row, col) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  return files[col] + (8 - row);
}

function cloneBoard(sourceBoard) {
  return sourceBoard.map(row => [...row]);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

initializeAISelector();
setBoardTheme();
restartGame();