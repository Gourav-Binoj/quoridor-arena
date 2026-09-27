'use client';

import { useMemo, useState } from 'react';
import {
  BOARD_SIZE,
  createInitialGameState,
  getLegalMoves,
  isWallPlacementLegal,
  submitPlayerAction
} from '@/lib/quoridor';

export default function HomePage() {
  const [game, setGame] = useState(createInitialGameState());
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  const legalMoves = useMemo(() => getLegalMoves(game, game.currentPlayer), [game]);

  const handleCellClick = (row: number, col: number) => {
    const legalTarget = legalMoves.some((cell) => cell.row === row && cell.col === col);

    if (legalTarget) {
      const next = submitPlayerAction(game, {
        player: game.currentPlayer,
        type: 'move',
        to: { row, col }
      });
      setGame(next);
      return;
    }

    const wall = { row, col, orientation };
    if (isWallPlacementLegal(game, game.currentPlayer, wall)) {
      const next = submitPlayerAction(game, {
        player: game.currentPlayer,
        type: 'wall',
        wall
      });
      setGame(next);
    }
  };

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">Quoridor Arena</p>
            <h1 className="text-3xl font-bold text-stone-900">Think Ahead. Block Smart. Reach the Goal.</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${orientation === 'horizontal' ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-800'}`}
              onClick={() => setOrientation('horizontal')}
            >
              Horizontal wall
            </button>
            <button
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${orientation === 'vertical' ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-800'}`}
              onClick={() => setOrientation('vertical')}
            >
              Vertical wall
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-[32px] border border-stone-200 bg-[#f8f3ed] p-4 shadow-[0_16px_40px_rgba(73,48,25,0.12)]">
            <div className="grid grid-cols-9 gap-1 rounded-[24px] bg-[#d39a4b] p-2 shadow-inner">
              {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => {
                const row = Math.floor(index / BOARD_SIZE);
                const col = index % BOARD_SIZE;
                const player1 = game.players.player1.pawn;
                const player2 = game.players.player2.pawn;

                const isPlayer1 = row === player1.row && col === player1.col;
                const isPlayer2 = row === player2.row && col === player2.col;
                const isLegalMove = legalMoves.some((cell) => cell.row === row && cell.col === col);

                return (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    aria-label={`Cell ${row + 1}, ${col + 1}`}
                    onClick={() => handleCellClick(row, col)}
                    className={[
                      'relative flex aspect-square items-center justify-center rounded-md border border-[#b37a2d] text-xs font-semibold',
                      (row + col) % 2 === 0 ? 'bg-[#e7c18d]' : 'bg-[#d8a765]',
                      isLegalMove ? 'ring-2 ring-emerald-300 ring-offset-1' : '',
                      isPlayer1 || isPlayer2 ? 'shadow-inner' : ''
                    ].join(' ')}
                  >
                    {isPlayer1 && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-stone-200 bg-[#f7f3ee] text-[10px] font-bold text-stone-900 shadow-md">
                        P1
                      </span>
                    )}
                    {isPlayer2 && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-stone-700 bg-[#1f1a14] text-[10px] font-bold text-stone-100 shadow-md">
                        P2
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4 rounded-[28px] border border-stone-200 bg-white/70 p-5 shadow-md backdrop-blur-sm">
            <div className="rounded-2xl bg-stone-900 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-300">Current turn</p>
              <p className="mt-2 text-2xl font-bold">{game.currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Status</p>
              <p className="mt-2 text-lg font-semibold text-stone-900">{game.status === 'finished' ? `Winner: ${game.winner}` : 'In progress'}</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Walls remaining</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>Player 1</span>
                <strong>{game.players.player1.wallsRemaining}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Player 2</span>
                <strong>{game.players.player2.wallsRemaining}</strong>
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-full bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500"
              onClick={() => setGame(createInitialGameState())}
            >
              Reset local board
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
