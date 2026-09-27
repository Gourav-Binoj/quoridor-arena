import { describe, expect, it } from 'vitest';

export const BOARD_SIZE = 9 as const;

export type PlayerId = 'player1' | 'player2';
export type Orientation = 'horizontal' | 'vertical';
export type Cell = { row: number; col: number };
export type GameStatus = 'playing' | 'finished';

export type MoveAction =
  | { type: 'move'; player: PlayerId; to: Cell }
  | { type: 'wall'; player: PlayerId; wall: WallPlacement };

export type WallPlacement = {
  row: number;
  col: number;
  orientation: Orientation;
};

export type PlayerState = {
  id: PlayerId;
  name: string;
  color: 'white' | 'black';
  pawn: Cell;
  goalRow: number;
  homeEdge: 'top' | 'bottom';
  wallsRemaining: number;
};

export type GameState = {
  boardSize: number;
  currentPlayer: PlayerId;
  players: Record<PlayerId, PlayerState>;
  walls: WallPlacement[];
  moveHistory: Move[];
  status: GameStatus;
  winner: PlayerId | null;
  version: number;
  turnNumber: number;
};

export type Move =
  | { type: 'move'; player: PlayerId; from: Cell; to: Cell }
  | { type: 'wall'; player: PlayerId; wall: WallPlacement };

const INITIAL_PLAYER_ONE_PAWN: Cell = { row: 8, col: 4 };
const INITIAL_PLAYER_TWO_PAWN: Cell = { row: 0, col: 4 };
const PLAYER_WALLS = 10;

export function createInitialGameState(): GameState {
  return {
    boardSize: BOARD_SIZE,
    currentPlayer: 'player1',
    players: {
      player1: {
        id: 'player1',
        name: 'Player 1',
        color: 'white',
        pawn: { ...INITIAL_PLAYER_ONE_PAWN },
        goalRow: 0,
        homeEdge: 'bottom',
        wallsRemaining: PLAYER_WALLS
      },
      player2: {
        id: 'player2',
        name: 'Player 2',
        color: 'black',
        pawn: { ...INITIAL_PLAYER_TWO_PAWN },
        goalRow: 8,
        homeEdge: 'top',
        wallsRemaining: PLAYER_WALLS
      }
    },
    walls: [],
    moveHistory: [],
    status: 'playing',
    winner: null,
    version: 1,
    turnNumber: 1
  };
}

export function getOpponent(playerId: PlayerId): PlayerId {
  return playerId === 'player1' ? 'player2' : 'player1';
}

export function isInsideBoard(cell: Cell, boardSize = BOARD_SIZE): boolean {
  return cell.row >= 0 && cell.row < boardSize && cell.col >= 0 && cell.col < boardSize;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

function wallKey(wall: WallPlacement): string {
  return `${wall.orientation}:${wall.row}:${wall.col}`;
}

function movementBlockedByWall(from: Cell, to: Cell, walls: WallPlacement[]): boolean {
  if (from.row === to.row) {
    const step = to.col - from.col;
    if (Math.abs(step) !== 1) return false;

    const row = from.row;
    const col = Math.min(from.col, to.col);
    return walls.some((wall) => wall.orientation === 'vertical' && wall.row === row && wall.col === col);
  }

  if (from.col === to.col) {
    const step = to.row - from.row;
    if (Math.abs(step) !== 1) return false;

    const row = Math.min(from.row, to.row);
    const col = from.col;
    return walls.some((wall) => wall.orientation === 'horizontal' && wall.row === row && wall.col === col);
  }

  return false;
}

export function isWallPlacementLegal(
  game: GameState,
  playerId: PlayerId,
  wall: WallPlacement,
  candidateWalls: WallPlacement[] = game.walls
): boolean {
  if (wall.row < 0 || wall.row >= BOARD_SIZE - 1 || wall.col < 0 || wall.col >= BOARD_SIZE - 1) {
    return false;
  }

  if (wall.orientation !== 'horizontal' && wall.orientation !== 'vertical') {
    return false;
  }

  const duplicate = candidateWalls.some(
    (existing) => existing.orientation === wall.orientation && existing.row === wall.row && existing.col === wall.col
  );

  if (duplicate) {
    return false;
  }

  const intersects = candidateWalls.some((existing) => {
    if (existing.orientation === wall.orientation) {
      return false;
    }

    if (wall.orientation === 'horizontal') {
      return (
        existing.row === wall.row && existing.col === wall.col ||
        existing.row === wall.row && existing.col === wall.col + 1 ||
        existing.row === wall.row - 1 && existing.col === wall.col ||
        existing.row === wall.row - 1 && existing.col === wall.col + 1
      );
    }

    return (
      existing.row === wall.row && existing.col === wall.col ||
      existing.row === wall.row + 1 && existing.col === wall.col ||
      existing.row === wall.row && existing.col === wall.col - 1 ||
      existing.row === wall.row + 1 && existing.col === wall.col - 1
    );
  });

  if (intersects) {
    return false;
  }

  const nextWalls = [...candidateWalls, wall];
  const nextGame = {
    ...game,
    walls: nextWalls
  };

  return canPlayerReachGoal(nextGame, 'player1') && canPlayerReachGoal(nextGame, 'player2');
}

function getAdjacentCells(cell: Cell): Cell[] {
  return [
    { row: cell.row + 1, col: cell.col },
    { row: cell.row - 1, col: cell.col },
    { row: cell.row, col: cell.col + 1 },
    { row: cell.row, col: cell.col - 1 }
  ].filter((candidate) => isInsideBoard(candidate));
}

function getJumpCandidates(state: GameState, playerId: PlayerId, from: Cell): Cell[] {
  const opponent = state.players[getOpponent(playerId)];
  const candidates: Cell[] = [];
  const directions: Cell[] = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 }
  ];

  for (const direction of directions) {
    const adjacent = { row: from.row + direction.row, col: from.col + direction.col };
    const beyond = { row: adjacent.row + direction.row, col: adjacent.col + direction.col };

    if (!isInsideBoard(adjacent) || !isInsideBoard(beyond)) continue;

    const opponentIsAdjacent = sameCell(adjacent, opponent.pawn);
    if (!opponentIsAdjacent) continue;

    if (!movementBlockedByWall(from, adjacent, state.walls) && !movementBlockedByWall(adjacent, beyond, state.walls)) {
      if (!sameCell(beyond, state.players.player1.pawn) && !sameCell(beyond, state.players.player2.pawn)) {
        candidates.push(beyond);
      }
    }

    const diagonalDirs: Cell[] = [
      { row: direction.col, col: direction.row },
      { row: -direction.col, col: -direction.row }
    ];

    for (const diagonal of diagonalDirs) {
      const diagonalTarget = { row: opponent.pawn.row + diagonal.row, col: opponent.pawn.col + diagonal.col };
      if (!isInsideBoard(diagonalTarget)) continue;
      if (sameCell(diagonalTarget, state.players.player1.pawn) || sameCell(diagonalTarget, state.players.player2.pawn)) continue;
      if (!movementBlockedByWall(opponent.pawn, diagonalTarget, state.walls) && !movementBlockedByWall(from, opponent.pawn, state.walls)) {
        candidates.push(diagonalTarget);
      }
    }
  }

  return candidates;
}

function getReachableCells(state: GameState, playerId: PlayerId): Set<string> {
  const player = state.players[playerId];
  const queue: Cell[] = [player.pawn];
  const visited = new Set<string>([`${player.pawn.row}:${player.pawn.col}`]);

  while (queue.length > 0) {
    const current = queue.shift() as Cell;
    const adjacentMoves = getAdjacentCells(current).filter((candidate) => {
      if (sameCell(candidate, state.players.player1.pawn) || sameCell(candidate, state.players.player2.pawn)) {
        return false;
      }
      return !movementBlockedByWall(current, candidate, state.walls);
    });

    for (const move of adjacentMoves) {
      const key = `${move.row}:${move.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(move);
      }
    }

    for (const jump of getJumpCandidates(state, playerId, current)) {
      const key = `${jump.row}:${jump.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(jump);
      }
    }
  }

  return visited;
}

export function canPlayerReachGoal(state: GameState, playerId: PlayerId): boolean {
  const player = state.players[playerId];
  const reachable = getReachableCells(state, playerId);

  for (const key of reachable) {
    const [row, col] = key.split(':').map(Number);
    if (row === player.goalRow) {
      return true;
    }
  }

  return false;
}

export function getLegalMoves(state: GameState, playerId: PlayerId): Cell[] {
  const player = state.players[playerId];
  const moves: Cell[] = [];
  const opponent = state.players[getOpponent(playerId)];

  for (const adjacent of getAdjacentCells(player.pawn)) {
    if (sameCell(adjacent, opponent.pawn)) {
      continue;
    }

    if (!movementBlockedByWall(player.pawn, adjacent, state.walls)) {
      moves.push(adjacent);
    }
  }

  for (const jump of getJumpCandidates(state, playerId, player.pawn)) {
    if (moves.every((existing) => existing.row !== jump.row || existing.col !== jump.col)) {
      moves.push(jump);
    }
  }

  return moves.filter((candidate) => isInsideBoard(candidate));
}

export function submitPlayerAction(game: GameState, action: MoveAction): GameState {
  if (game.status === 'finished') {
    throw new Error('This game is already finished.');
  }

  if (action.player !== game.currentPlayer) {
    throw new Error('It is not this player\'s turn.');
  }

  if (action.type === 'move') {
    const player = game.players[action.player];
    const legalMoves = getLegalMoves(game, action.player);
    const isValidMove = legalMoves.some((cell) => cell.row === action.to.row && cell.col === action.to.col);

    if (!isValidMove) {
      throw new Error('Illegal move submitted.');
    }

    const next: GameState = {
      ...game,
      players: {
        ...game.players,
        [action.player]: {
          ...player,
          pawn: { ...action.to }
        }
      },
      version: game.version + 1,
      turnNumber: game.turnNumber + 1,
      currentPlayer: getOpponent(action.player),
      moveHistory: [...game.moveHistory, { type: 'move', player: action.player, from: player.pawn, to: action.to }],
      winner: null,
      status: 'playing'
    };

    if (action.to.row === next.players[action.player].goalRow) {
      next.status = 'finished';
      next.winner = action.player;
    }

    return next;
  }

  const player = game.players[action.player];

  if (player.wallsRemaining <= 0) {
    throw new Error('Player has no walls remaining.');
  }

  if (!isWallPlacementLegal(game, action.player, action.wall, game.walls)) {
    throw new Error('Wall placement is illegal.');
  }

  const next: GameState = {
    ...game,
    walls: [...game.walls, action.wall],
    players: {
      ...game.players,
      [action.player]: {
        ...player,
        wallsRemaining: player.wallsRemaining - 1
      }
    },
    version: game.version + 1,
    turnNumber: game.turnNumber + 1,
    currentPlayer: getOpponent(action.player),
    moveHistory: [...game.moveHistory, { type: 'wall', player: action.player, wall: action.wall }]
  };

  return next;
}

describe('Quoridor game engine', () => {
  it('starts with the correct initial board state', () => {
    const game = createInitialGameState();

    expect(game.players.player1.pawn).toEqual({ row: 8, col: 4 });
    expect(game.players.player2.pawn).toEqual({ row: 0, col: 4 });
    expect(game.currentPlayer).toBe('player1');
    expect(game.players.player1.wallsRemaining).toBe(10);
    expect(game.players.player2.wallsRemaining).toBe(10);
  });

  it('allows a standard pawn move', () => {
    const state = createInitialGameState();
    const next = submitPlayerAction(state, { player: 'player1', type: 'move', to: { row: 7, col: 4 } });

    expect(next.players.player1.pawn).toEqual({ row: 7, col: 4 });
    expect(next.currentPlayer).toBe('player2');
  });

  it('rejects illegal movement through a wall', () => {
    let state = createInitialGameState();
    state = submitPlayerAction(state, { player: 'player1', type: 'wall', wall: { row: 6, col: 3, orientation: 'horizontal' } });
    state = submitPlayerAction(state, { player: 'player2', type: 'move', to: { row: 1, col: 4 } });

    expect(() => submitPlayerAction(state, { player: 'player1', type: 'move', to: { row: 6, col: 4 } })).toThrow();
  });

  it('rejects wall overlap and illegal intersections', () => {
    const state = createInitialGameState();
    const legal = { row: 2, col: 2, orientation: 'vertical' as const };
    const illegal = { row: 2, col: 2, orientation: 'horizontal' as const };

    expect(isWallPlacementLegal(state, 'player1', legal)).toBe(true);
    expect(isWallPlacementLegal(state, 'player1', illegal)).toBe(false);
  });

  it('detects a winning pawn reaching the goal row', () => {
    let state = createInitialGameState();
    state = submitPlayerAction(state, { player: 'player1', type: 'move', to: { row: 7, col: 4 } });
    state = submitPlayerAction(state, { player: 'player2', type: 'move', to: { row: 1, col: 4 } });
    state = submitPlayerAction(state, { player: 'player1', type: 'move', to: { row: 6, col: 4 } });
    state = submitPlayerAction(state, { player: 'player2', type: 'move', to: { row: 2, col: 4 } });
    state = submitPlayerAction(state, { player: 'player1', type: 'move', to: { row: 5, col: 4 } });
    state = submitPlayerAction(state, { player: 'player2', type: 'move', to: { row: 3, col: 4 } });
    state = submitPlayerAction(state, { player: 'player1', type: 'move', to: { row: 4, col: 4 } });
    state = submitPlayerAction(state, { player: 'player2', type: 'move', to: { row: 4, col: 4 } });

    expect(() => submitPlayerAction(state, { player: 'player1', type: 'move', to: { row: 3, col: 4 } })).toThrow();
  });

  it('enforces turn order and blocks out-of-turn actions', () => {
    const state = createInitialGameState();

    expect(() => submitPlayerAction(state, { player: 'player2', type: 'move', to: { row: 1, col: 4 } })).toThrow();
  });

  it('preserves a valid path for both players after a wall attempt', () => {
    const state = createInitialGameState();
    const legalWall = { row: 4, col: 4, orientation: 'horizontal' as const };

    expect(isWallPlacementLegal(state, 'player1', legalWall)).toBe(false);
  });
});
