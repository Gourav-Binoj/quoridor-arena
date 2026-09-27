export const BOARD_SIZE = 9 as const;
export const WALLS_PER_PLAYER = 10 as const;

export type PlayerId = 'player1' | 'player2';
export type Orientation = 'horizontal' | 'vertical';
export type GameStatus = 'playing' | 'finished';

export type Cell = {
  row: number;
  col: number;
};

export type WallPlacement = {
  row: number;
  col: number;
  orientation: Orientation;
};

export type Move =
  | { type: 'move'; player: PlayerId; from: Cell; to: Cell }
  | { type: 'wall'; player: PlayerId; wall: WallPlacement }
  | { type: 'resign'; player: PlayerId };

export type PlayerState = {
  id: PlayerId;
  name: string;
  color: 'white' | 'black';
  pawn: Cell;
  goalRow: number;
  wallsRemaining: number;
};

export type GameState = {
  boardSize: number;
  status: GameStatus;
  winner: PlayerId | null;
  currentPlayer: PlayerId;
  version: number;
  turnNumber: number;
  players: Record<PlayerId, PlayerState>;
  walls: WallPlacement[];
  moveHistory: Move[];
};

export type MoveAction =
  | { type: 'move'; player: PlayerId; to: Cell }
  | { type: 'wall'; player: PlayerId; wall: WallPlacement }
  | { type: 'resign'; player: PlayerId };

const STARTING_POSITIONS: Record<PlayerId, Cell> = {
  player1: { row: BOARD_SIZE - 1, col: Math.floor(BOARD_SIZE / 2) },
  player2: { row: 0, col: Math.floor(BOARD_SIZE / 2) }
};

const DIRECTIONS: ReadonlyArray<Cell> = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 }
];

export function createInitialGameState(): GameState {
  return {
    boardSize: BOARD_SIZE,
    status: 'playing',
    winner: null,
    currentPlayer: 'player1',
    version: 1,
    turnNumber: 1,
    players: {
      player1: {
        id: 'player1',
        name: 'Player 1',
        color: 'white',
        pawn: { ...STARTING_POSITIONS.player1 },
        goalRow: 0,
        wallsRemaining: WALLS_PER_PLAYER
      },
      player2: {
        id: 'player2',
        name: 'Player 2',
        color: 'black',
        pawn: { ...STARTING_POSITIONS.player2 },
        goalRow: BOARD_SIZE - 1,
        wallsRemaining: WALLS_PER_PLAYER
      }
    },
    walls: [],
    moveHistory: []
  };
}

export function getOpponent(player: PlayerId): PlayerId {
  return player === 'player1' ? 'player2' : 'player1';
}

export function isInsideBoard(cell: Cell, boardSize = BOARD_SIZE): boolean {
  return cell.row >= 0 && cell.row < boardSize && cell.col >= 0 && cell.col < boardSize;
}

function isSameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

function wallMatches(a: WallPlacement, b: WallPlacement): boolean {
  return a.orientation === b.orientation && a.row === b.row && a.col === b.col;
}

function hasBlockingWallBetween(from: Cell, to: Cell, walls: WallPlacement[]): boolean {
  if (from.row === to.row) {
    const horizontalStep = to.col - from.col;
    if (Math.abs(horizontalStep) !== 1) {
      return true;
    }

    const leftCol = Math.min(from.col, to.col);
    return walls.some((wall) => wall.orientation === 'vertical' && wall.row === from.row && wall.col === leftCol);
  }

  if (from.col === to.col) {
    const verticalStep = to.row - from.row;
    if (Math.abs(verticalStep) !== 1) {
      return true;
    }

    const topRow = Math.min(from.row, to.row);
    return walls.some((wall) => wall.orientation === 'horizontal' && wall.row === topRow && wall.col === from.col);
  }

  return true;
}

function adjacentCells(cell: Cell): Cell[] {
  return DIRECTIONS.map((direction) => ({
    row: cell.row + direction.row,
    col: cell.col + direction.col
  })).filter((candidate) => isInsideBoard(candidate));
}

function legalMovesIgnoringOpponent(position: Cell, walls: WallPlacement[]): Cell[] {
  return adjacentCells(position).filter((candidate) => !hasBlockingWallBetween(position, candidate, walls));
}

export function canPlayerReachGoal(state: GameState, playerId: PlayerId): boolean {
  const start = state.players[playerId].pawn;
  const goalRow = state.players[playerId].goalRow;
  const queue: Cell[] = [start];
  const visited = new Set<string>([`${start.row}:${start.col}`]);

  while (queue.length > 0) {
    const current = queue.shift() as Cell;
    if (current.row === goalRow) {
      return true;
    }

    for (const move of legalMovesIgnoringOpponent(current, state.walls)) {
      const key = `${move.row}:${move.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(move);
      }
    }
  }

  return false;
}

function getDirectionalMoveOptions(state: GameState, playerId: PlayerId): Cell[] {
  const player = state.players[playerId];
  const opponent = state.players[getOpponent(playerId)];
  const legalMoves: Cell[] = [];

  for (const direction of DIRECTIONS) {
    const adjacent = {
      row: player.pawn.row + direction.row,
      col: player.pawn.col + direction.col
    };

    if (!isInsideBoard(adjacent) || hasBlockingWallBetween(player.pawn, adjacent, state.walls)) {
      continue;
    }

    const adjacentIsOpponent = isSameCell(adjacent, opponent.pawn);
    if (!adjacentIsOpponent) {
      legalMoves.push(adjacent);
      continue;
    }

    const beyond = {
      row: adjacent.row + direction.row,
      col: adjacent.col + direction.col
    };

    const straightJumpAvailable = isInsideBoard(beyond) && !hasBlockingWallBetween(adjacent, beyond, state.walls);

    if (straightJumpAvailable) {
      legalMoves.push(beyond);
      continue;
    }

    const diagonals =
      direction.row === 0
        ? [
            { row: -1, col: 0 },
            { row: 1, col: 0 }
          ]
        : [
            { row: 0, col: -1 },
            { row: 0, col: 1 }
          ];

    for (const diagonal of diagonals) {
      const diagonalTarget = {
        row: adjacent.row + diagonal.row,
        col: adjacent.col + diagonal.col
      };

      if (!isInsideBoard(diagonalTarget)) {
        continue;
      }

      if (!hasBlockingWallBetween(adjacent, diagonalTarget, state.walls)) {
        legalMoves.push(diagonalTarget);
      }
    }
  }

  return legalMoves;
}

export function getLegalMoves(state: GameState, playerId: PlayerId): Cell[] {
  const deduplicated = new Map<string, Cell>();

  for (const cell of getDirectionalMoveOptions(state, playerId)) {
    deduplicated.set(`${cell.row}:${cell.col}`, cell);
  }

  return Array.from(deduplicated.values());
}

function wallInBounds(wall: WallPlacement): boolean {
  return wall.row >= 0 && wall.row < BOARD_SIZE - 1 && wall.col >= 0 && wall.col < BOARD_SIZE - 1;
}

function wallsIntersect(a: WallPlacement, b: WallPlacement): boolean {
  if (a.orientation === b.orientation) {
    return false;
  }

  const horizontal = a.orientation === 'horizontal' ? a : b;
  const vertical = a.orientation === 'vertical' ? a : b;

  return horizontal.row === vertical.row && horizontal.col === vertical.col;
}

export function isWallPlacementLegal(state: GameState, player: PlayerId, wall: WallPlacement): boolean {
  if (state.status === 'finished') {
    return false;
  }

  if (!state.players[player] || !wallInBounds(wall)) {
    return false;
  }

  if (state.walls.some((existing) => wallMatches(existing, wall) || wallsIntersect(existing, wall))) {
    return false;
  }

  const nextState: GameState = {
    ...state,
    walls: [...state.walls, { ...wall }]
  };

  return canPlayerReachGoal(nextState, 'player1') && canPlayerReachGoal(nextState, 'player2');
}

function cloneStateForNextTurn(state: GameState): GameState {
  return {
    ...state,
    players: {
      player1: {
        ...state.players.player1,
        pawn: { ...state.players.player1.pawn }
      },
      player2: {
        ...state.players.player2,
        pawn: { ...state.players.player2.pawn }
      }
    },
    walls: state.walls.map((wall) => ({ ...wall })),
    moveHistory: [...state.moveHistory]
  };
}

export function submitPlayerAction(state: GameState, action: MoveAction): GameState {
  if (state.status === 'finished') {
    throw new Error('This game is already finished.');
  }

  if (action.player !== state.currentPlayer) {
    throw new Error('It is not this player\'s turn.');
  }

  const next = cloneStateForNextTurn(state);

  if (action.type === 'move') {
    const legalMoves = getLegalMoves(state, action.player);
    const legal = legalMoves.some((move) => isSameCell(move, action.to));

    if (!legal) {
      throw new Error('Illegal move submitted.');
    }

    const from = { ...next.players[action.player].pawn };
    next.players[action.player].pawn = { ...action.to };
    next.moveHistory.push({
      type: 'move',
      player: action.player,
      from,
      to: { ...action.to }
    });

    if (action.to.row === next.players[action.player].goalRow) {
      next.status = 'finished';
      next.winner = action.player;
    }
  }

  if (action.type === 'wall') {
    const actor = next.players[action.player];
    if (actor.wallsRemaining <= 0) {
      throw new Error('Player has no walls remaining.');
    }

    if (!isWallPlacementLegal(state, action.player, action.wall)) {
      throw new Error('Wall placement is illegal.');
    }

    actor.wallsRemaining -= 1;
    next.walls.push({ ...action.wall });
    next.moveHistory.push({
      type: 'wall',
      player: action.player,
      wall: { ...action.wall }
    });
  }

  if (action.type === 'resign') {
    next.status = 'finished';
    next.winner = getOpponent(action.player);
    next.moveHistory.push({ type: 'resign', player: action.player });
  }

  next.version = state.version + 1;
  next.turnNumber = state.turnNumber + 1;

  if (next.status === 'playing') {
    next.currentPlayer = getOpponent(action.player);
  }

  return next;
}
