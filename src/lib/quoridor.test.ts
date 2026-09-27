import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  createInitialGameState,
  getLegalMoves,
  isWallPlacementLegal,
  submitPlayerAction,
  type GameState,
  type PlayerId,
  type WallPlacement
} from '@/lib/quoridor';

function withPositions(state: GameState, player1: { row: number; col: number }, player2: { row: number; col: number }, currentPlayer: PlayerId = 'player1'): GameState {
  return {
    ...state,
    currentPlayer,
    players: {
      ...state.players,
      player1: {
        ...state.players.player1,
        pawn: { ...player1 }
      },
      player2: {
        ...state.players.player2,
        pawn: { ...player2 }
      }
    }
  };
}

function hasCell(cells: { row: number; col: number }[], row: number, col: number): boolean {
  return cells.some((cell) => cell.row === row && cell.col === col);
}

describe('quoridor engine', () => {
  it('creates a valid 9x9 initial state', () => {
    const game = createInitialGameState();

    expect(game.boardSize).toBe(BOARD_SIZE);
    expect(game.currentPlayer).toBe('player1');
    expect(game.players.player1.pawn).toEqual({ row: 8, col: 4 });
    expect(game.players.player2.pawn).toEqual({ row: 0, col: 4 });
    expect(game.players.player1.wallsRemaining).toBe(10);
    expect(game.players.player2.wallsRemaining).toBe(10);
  });

  it('supports straight jumps over an adjacent opponent', () => {
    const base = createInitialGameState();
    const state = withPositions(base, { row: 4, col: 4 }, { row: 3, col: 4 }, 'player1');

    const legalMoves = getLegalMoves(state, 'player1');
    expect(hasCell(legalMoves, 2, 4)).toBe(true);
  });

  it('supports diagonal jumps when straight jump is blocked by a wall', () => {
    const base = createInitialGameState();
    const jumpBlockedWall: WallPlacement = { row: 2, col: 4, orientation: 'horizontal' };
    const state = {
      ...withPositions(base, { row: 4, col: 4 }, { row: 3, col: 4 }, 'player1'),
      walls: [jumpBlockedWall]
    };

    const legalMoves = getLegalMoves(state, 'player1');

    expect(hasCell(legalMoves, 3, 3)).toBe(true);
    expect(hasCell(legalMoves, 3, 5)).toBe(true);
    expect(hasCell(legalMoves, 2, 4)).toBe(false);
  });

  it('rejects overlapping and intersecting walls', () => {
    const state = createInitialGameState();
    const wall: WallPlacement = { row: 4, col: 4, orientation: 'horizontal' };

    const withWall = submitPlayerAction(state, { type: 'wall', player: 'player1', wall });

    expect(isWallPlacementLegal(withWall, 'player2', wall)).toBe(false);
    expect(
      isWallPlacementLegal(withWall, 'player2', {
        row: 4,
        col: 4,
        orientation: 'vertical'
      })
    ).toBe(false);
  });

  it('rejects walls that would remove all paths to a goal', () => {
    const state = createInitialGameState();
    const existingBarrier: WallPlacement[] = [
      { row: 4, col: 0, orientation: 'horizontal' },
      { row: 4, col: 1, orientation: 'horizontal' },
      { row: 4, col: 2, orientation: 'horizontal' },
      { row: 4, col: 3, orientation: 'horizontal' },
      { row: 4, col: 4, orientation: 'horizontal' },
      { row: 4, col: 5, orientation: 'horizontal' },
      { row: 4, col: 6, orientation: 'horizontal' }
    ];

    const almostBlocked: GameState = {
      ...state,
      walls: existingBarrier
    };

    expect(
      isWallPlacementLegal(almostBlocked, 'player1', {
        row: 4,
        col: 7,
        orientation: 'horizontal'
      })
    ).toBe(false);
  });

  it('enforces turn order and rejects duplicate wall placements', () => {
    const state = createInitialGameState();
    const wall: WallPlacement = { row: 3, col: 3, orientation: 'vertical' };

    expect(() => submitPlayerAction(state, { type: 'move', player: 'player2', to: { row: 1, col: 4 } })).toThrow(
      /not this player's turn/i
    );

    const withWall = submitPlayerAction(state, { type: 'wall', player: 'player1', wall });
    expect(() => submitPlayerAction(withWall, { type: 'wall', player: 'player2', wall })).toThrow(/illegal/i);
  });

  it('marks winner when reaching goal row and rejects further actions', () => {
    const base = createInitialGameState();
    const nearWin = withPositions(base, { row: 1, col: 4 }, { row: 0, col: 0 }, 'player1');

    const finished = submitPlayerAction(nearWin, {
      type: 'move',
      player: 'player1',
      to: { row: 0, col: 4 }
    });

    expect(finished.status).toBe('finished');
    expect(finished.winner).toBe('player1');
    expect(() => submitPlayerAction(finished, { type: 'resign', player: 'player2' })).toThrow(/already finished/i);
  });

  it('supports resignation and immutable transitions', () => {
    const state = createInitialGameState();
    const next = submitPlayerAction(state, { type: 'resign', player: 'player1' });

    expect(next.status).toBe('finished');
    expect(next.winner).toBe('player2');
    expect(state.status).toBe('playing');
    expect(state).not.toBe(next);
    expect(state.players.player1).not.toBe(next.players.player1);
    expect(state.walls).not.toBe(next.walls);
  });
});
