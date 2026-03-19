// Ludo game engine — pure logic, no UI

export const BOARD_SIZE = 52; // Total board squares
export const HOME_STRETCH = 6; // Final stretch before home
export const PIECES_PER_PLAYER = 4;
export const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47]; // Star/safe squares

// Starting positions for each player color on the main board
export const START_POSITIONS = [0, 13, 26, 39];
// Home entry positions (the square before entering home stretch)
export const HOME_ENTRY = [50, 11, 24, 37];

export const PLAYER_COLORS = ["#ef4444", "#22c55e", "#eab308", "#3b82f6"]; // Red, Green, Yellow, Blue
export const PLAYER_LABELS = ["Red", "Green", "Yellow", "Blue"];

export type PiecePosition = number; // -1 = in yard, 0-51 = on board, 100-105 = home stretch, 200 = finished

export interface LudoState {
  pieces: PiecePosition[][]; // pieces[playerIndex][pieceIndex]
  currentTurn: number;
  diceValue: number | null;
  winner: number | null;
}

export function createInitialState(playerCount: number): LudoState {
  const pieces: PiecePosition[][] = [];
  for (let i = 0; i < playerCount; i++) {
    pieces.push([-1, -1, -1, -1]);
  }
  return { pieces, currentTurn: 0, diceValue: null, winner: null };
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

// Convert a player-relative position to absolute board position
export function toAbsolute(playerIndex: number, relativePos: number): number {
  if (relativePos < 0 || relativePos >= 100) return relativePos; // yard or home stretch
  return (relativePos + START_POSITIONS[playerIndex]) % BOARD_SIZE;
}

// Convert absolute position to player-relative
export function toRelative(playerIndex: number, absolutePos: number): number {
  return (absolutePos - START_POSITIONS[playerIndex] + BOARD_SIZE) % BOARD_SIZE;
}

export function getValidMoves(state: LudoState, playerIndex: number, dice: number): number[] {
  const validPieces: number[] = [];
  const playerPieces = state.pieces[playerIndex];

  for (let i = 0; i < PIECES_PER_PLAYER; i++) {
    const pos = playerPieces[i];

    // In yard — can only come out on 6
    if (pos === -1) {
      if (dice === 6) validPieces.push(i);
      continue;
    }

    // Already finished
    if (pos === 200) continue;

    // On home stretch (100-105)
    if (pos >= 100 && pos < 200) {
      const newPos = pos + dice;
      if (newPos <= 105) validPieces.push(i); // Can move within or reach home (105 = last, 106 would be exact finish)
      if (newPos === 100 + HOME_STRETCH) validPieces.push(i); // Exact finish
      continue;
    }

    // On main board
    const relPos = toRelative(playerIndex, pos);
    const newRelPos = relPos + dice;

    if (newRelPos < BOARD_SIZE) {
      validPieces.push(i);
    } else if (newRelPos >= BOARD_SIZE && newRelPos < BOARD_SIZE + HOME_STRETCH) {
      // Entering home stretch
      validPieces.push(i);
    } else if (newRelPos === BOARD_SIZE + HOME_STRETCH) {
      // Exact finish
      validPieces.push(i);
    }
    // else overshot — not valid
  }

  return [...new Set(validPieces)];
}

export interface MoveResult {
  newState: LudoState;
  killed: { playerIndex: number; pieceIndex: number } | null;
  enteredHome: boolean;
  extraTurn: boolean;
}

export function movePiece(state: LudoState, playerIndex: number, pieceIndex: number, dice: number): MoveResult {
  const newState: LudoState = {
    pieces: state.pieces.map(p => [...p]),
    currentTurn: state.currentTurn,
    diceValue: dice,
    winner: state.winner,
  };

  const pos = newState.pieces[playerIndex][pieceIndex];
  let killed: MoveResult["killed"] = null;
  let enteredHome = false;
  let extraTurn = dice === 6;

  if (pos === -1) {
    // Move out of yard to start
    const startAbs = START_POSITIONS[playerIndex];
    // Check for kill at start
    const killResult = checkKill(newState, playerIndex, startAbs);
    if (killResult) { killed = killResult; extraTurn = true; }
    newState.pieces[playerIndex][pieceIndex] = startAbs;
  } else if (pos >= 100) {
    // Home stretch movement
    const newPos = pos + dice;
    if (newPos >= 100 + HOME_STRETCH) {
      newState.pieces[playerIndex][pieceIndex] = 200; // Finished!
      enteredHome = true;
      extraTurn = true;
    } else {
      newState.pieces[playerIndex][pieceIndex] = newPos;
    }
  } else {
    // Main board movement
    const relPos = toRelative(playerIndex, pos);
    const newRelPos = relPos + dice;

    if (newRelPos >= BOARD_SIZE + HOME_STRETCH) {
      // Exact finish
      newState.pieces[playerIndex][pieceIndex] = 200;
      enteredHome = true;
      extraTurn = true;
    } else if (newRelPos >= BOARD_SIZE) {
      // Enter home stretch
      newState.pieces[playerIndex][pieceIndex] = 100 + (newRelPos - BOARD_SIZE);
    } else {
      const newAbsPos = toAbsolute(playerIndex, newRelPos);
      const killResult = checkKill(newState, playerIndex, newAbsPos);
      if (killResult) { killed = killResult; extraTurn = true; }
      newState.pieces[playerIndex][pieceIndex] = newAbsPos;
    }
  }

  // Check winner
  if (newState.pieces[playerIndex].every(p => p === 200)) {
    newState.winner = playerIndex;
  }

  // Next turn
  if (!extraTurn) {
    const playerCount = newState.pieces.length;
    newState.currentTurn = (playerIndex + 1) % playerCount;
  }

  return { newState, killed, enteredHome, extraTurn };
}

function checkKill(state: LudoState, movingPlayer: number, targetPos: number): MoveResult["killed"] {
  if (SAFE_POSITIONS.includes(targetPos)) return null;
  
  for (let p = 0; p < state.pieces.length; p++) {
    if (p === movingPlayer) continue;
    for (let i = 0; i < PIECES_PER_PLAYER; i++) {
      if (state.pieces[p][i] === targetPos) {
        state.pieces[p][i] = -1; // Send back to yard
        return { playerIndex: p, pieceIndex: i };
      }
    }
  }
  return null;
}

// Board coordinate mapping for rendering (simplified grid positions)
// Returns {x, y} in a 15x15 grid
export function getBoardPosition(absolutePos: number): { x: number; y: number } {
  // Standard Ludo board positions mapped to 15x15 grid
  const positions: Record<number, { x: number; y: number }> = {};
  
  // Bottom arm (Red start area) - positions 0-5 going up
  const bottomArm = [
    {x:6,y:14},{x:6,y:13},{x:6,y:12},{x:6,y:11},{x:6,y:10},{x:6,y:9},
  ];
  // Left turn at top of bottom arm
  const bottomToLeft = [{x:5,y:8}];
  // Left arm going left - positions 7-12
  const leftArm = [
    {x:4,y:8},{x:3,y:8},{x:2,y:8},{x:1,y:8},{x:0,y:8},{x:0,y:7},
  ];
  // Turn up
  const leftToTop = [{x:0,y:6}];
  // Top of left going right - positions 14-19  
  const topFromLeft = [
    {x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:5,y:6},{x:6,y:5},
  ];
  // Top arm going up
  const topArm = [
    {x:6,y:4},{x:6,y:3},{x:6,y:2},{x:6,y:1},{x:6,y:0},{x:7,y:0},
  ];
  // Turn right
  const topToRight = [{x:8,y:0}];
  // Right going down
  const rightFromTop = [
    {x:8,y:1},{x:8,y:2},{x:8,y:3},{x:8,y:4},{x:8,y:5},{x:9,y:6},
  ];
  // Right arm going right
  const rightArm = [
    {x:10,y:6},{x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},{x:14,y:7},
  ];
  // Turn down
  const rightToBottom = [{x:14,y:8}];
  // Bottom from right going left
  const bottomFromRight = [
    {x:13,y:8},{x:12,y:8},{x:11,y:8},{x:10,y:8},{x:9,y:8},{x:8,y:9},
  ];
  // Bottom going down
  const bottomReturn = [
    {x:8,y:10},{x:8,y:11},{x:8,y:12},{x:8,y:13},{x:8,y:14},{x:7,y:14},
  ];

  const allPositions = [
    ...bottomArm, ...bottomToLeft, ...leftArm, ...leftToTop,
    ...topFromLeft, ...topArm, ...topToRight, ...rightFromTop,
    ...rightArm, ...rightToBottom, ...bottomFromRight, ...bottomReturn,
  ];

  return allPositions[absolutePos % BOARD_SIZE] || { x: 7, y: 7 };
}

// Home stretch positions for each player
export function getHomeStretchPosition(playerIndex: number, stretchPos: number): { x: number; y: number } {
  // stretchPos 0-5 within home stretch (100-105 mapped to 0-5)
  const pos = stretchPos - 100;
  const stretches: Record<number, { x: number; y: number }[]> = {
    0: [{x:7,y:13},{x:7,y:12},{x:7,y:11},{x:7,y:10},{x:7,y:9},{x:7,y:8}], // Red - bottom to center
    1: [{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7},{x:5,y:7},{x:6,y:7}],     // Green - left to center
    2: [{x:7,y:1},{x:7,y:2},{x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6}],     // Yellow - top to center
    3: [{x:13,y:7},{x:12,y:7},{x:11,y:7},{x:10,y:7},{x:9,y:7},{x:8,y:7}], // Blue - right to center
  };
  return stretches[playerIndex]?.[pos] || { x: 7, y: 7 };
}

// Yard positions for each player
export function getYardPosition(playerIndex: number, pieceIndex: number): { x: number; y: number } {
  const yards: Record<number, { x: number; y: number }[]> = {
    0: [{x:2,y:11},{x:4,y:11},{x:2,y:13},{x:4,y:13}],  // Red - bottom left
    1: [{x:2,y:1},{x:4,y:1},{x:2,y:3},{x:4,y:3}],      // Green - top left
    2: [{x:10,y:1},{x:12,y:1},{x:10,y:3},{x:12,y:3}],   // Yellow - top right
    3: [{x:10,y:11},{x:12,y:11},{x:10,y:13},{x:12,y:13}],// Blue - bottom right
  };
  return yards[playerIndex]?.[pieceIndex] || { x: 7, y: 7 };
}
