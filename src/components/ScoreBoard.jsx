import { useState, useRef, useEffect } from 'react';
import PlayerCard from './PlayerCard';
import RoundInput from './RoundInput';

const SCORE_COLOR = (score, isDark) => {
  if (score === null || score === undefined) return isDark ? 'text-gray-600' : 'text-gray-300';
  if (score === 0) return isDark ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold';
  if (score >= 80) return isDark ? 'text-red-400 font-black' : 'text-red-600 font-black';
  if (score >= 40) return isDark ? 'text-yellow-400 font-bold' : 'text-yellow-600 font-bold';
  if (score >= 20) return isDark ? 'text-blue-400' : 'text-blue-600';
  return isDark ? 'text-emerald-300' : 'text-emerald-700';
};

const SCORE_BG = (score, isDark) => {
  if (score === null || score === undefined) return '';
  if (score === 0) return isDark ? 'bg-emerald-500/10' : 'bg-emerald-50';
  if (score >= 80) return isDark ? 'bg-red-500/10' : 'bg-red-50';
  if (score >= 40) return isDark ? 'bg-yellow-500/10' : 'bg-yellow-50';
  if (score >= 20) return isDark ? 'bg-blue-500/10' : 'bg-blue-50';
  return '';
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function SplitModal({ players, outThreshold, totalPool, buyInAmount, computeSplit, onConfirm, onCancel, isDark }) {
  const splits = computeSplit();
  const activePlayers = players.filter(p => !p.isOut);
  const sortedActive = [...activePlayers].sort((a, b) => a.totalScore - b.totalScore);
  const outPlayers = players.filter(p => p.isOut);
  const totalSplit = Object.values(splits).reduce((s, v) => s + v, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={onCancel} />
      <div className={`relative rounded-2xl shadow-2xl w-full max-w-sm animate-bounce-in
        ${isDark ? 'bg-casino-felt border border-casino-green-light/50' : 'bg-white border border-emerald-200'}`}>

        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b ${isDark ? 'border-casino-green-light/30' : 'border-emerald-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-lg font-black ${isDark ? 'text-casino-gold' : 'text-emerald-800'}`}>
                💰 Split the Pool
              </h2>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
                Based on current scores · All players agree
              </p>
            </div>
            <button onClick={onCancel} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold
              ${isDark ? 'bg-casino-green-light/60 text-white' : 'bg-gray-100 text-gray-600'}`}>×</button>
          </div>
        </div>

        {/* Pool summary */}
        <div className={`mx-5 mt-4 rounded-xl p-3 flex items-center justify-between
          ${isDark ? 'bg-casino-gold/10 border border-casino-gold/30' : 'bg-amber-50 border border-amber-200'}`}>
          <div>
            <div className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Total Pool</div>
            <div className={`text-2xl font-black ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>₹{totalPool}</div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>Buy-in: ₹{buyInAmount}/player</div>
            <div className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>{activePlayers.length} active · {outPlayers.length} out</div>
          </div>
        </div>

        {/* Split breakdown */}
        <div className="px-5 py-4 space-y-2">
          <p className={`text-xs font-bold mb-3 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Split by drop chances · equal share within same group
          </p>
          {sortedActive.map((p, i) => {
            const dropChances = Math.floor(Math.max(0, outThreshold - p.totalScore) / 20);
            return (
              <div key={p.id} className={`flex items-center gap-3 p-2.5 rounded-xl
                ${isDark ? 'bg-casino-green/40' : 'bg-emerald-50'}`}>
                <span className="text-lg w-7 text-center">{i < 3 ? RANK_MEDALS[i] : `#${i + 1}`}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-emerald-900'}`}>{p.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>{p.totalScore} pts</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full
                      ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                      {dropChances}🃏 drops left
                    </span>
                  </div>
                </div>
                <div className={`text-lg font-black ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>
                  ₹{splits[p.id] || 0}
                </div>
              </div>
            );
          })}
          {outPlayers.map(p => (
            <div key={p.id} className={`flex items-center gap-3 p-2.5 rounded-xl opacity-50
              ${isDark ? 'bg-casino-green/20' : 'bg-gray-50'}`}>
              <span className="text-lg w-7 text-center">💀</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold truncate line-through ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{p.name}</div>
                <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>OUT · {p.totalScore} pts</div>
              </div>
              <div className={`text-lg font-black ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>₹0</div>
            </div>
          ))}
          {totalPool > 0 && totalSplit !== totalPool && (
            <p className={`text-xs text-center ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
              ⚠️ Rounding diff: ₹{totalPool - totalSplit} goes to leader
            </p>
          )}
        </div>

        {/* Actions */}
        <div className={`px-5 pb-5 pt-2 border-t flex gap-3 ${isDark ? 'border-casino-green-light/30' : 'border-emerald-100'}`}>
          <button
            onClick={onCancel}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95
              ${isDark ? 'bg-casino-green-light/50 text-white hover:bg-casino-green-light' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(splits)}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-all active:scale-95 shadow-lg"
          >
            ✅ Confirm Split
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScoreBoard({
  players,
  rounds,
  theme,
  outThreshold,
  buyInAmount,
  totalPool,
  onAddRound,
  onUndoRound,
  onResetGame,
  onPauseGame,
  onEditName,
  onToggleTheme,
  onRejoinPlayer,
  onEndWithSplit,
  onUpdateBuyIn,
  computeSplit,
  getLeader,
  clearEliminated,
  currentTurnPlayerId,
}) {
  const [showRoundInput, setShowRoundInput] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showSetPool, setShowSetPool] = useState(false);
  const [poolInput, setPoolInput] = useState('');
  const [confirmUndo, setConfirmUndo] = useState(false);
  const tableRef = useRef(null);
  const isDark = theme === 'dark';
  const leader = getLeader();

  const activePlayers = players.filter(p => !p.isOut);
  const maxScore = activePlayers.length > 0
    ? activePlayers.reduce((max, p) => Math.max(max, p.totalScore), 0)
    : players.reduce((max, p) => Math.max(max, p.totalScore), 0);
  // Rejoin allowed only when NO active player is in the No Drop zone (<20 pts left)
  const rejoinAllowed = !activePlayers.some(p => (outThreshold - p.totalScore) < 20);

  // Sorted: active by rank first, then out players
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isOut && !b.isOut) return 1;
    if (!a.isOut && b.isOut) return -1;
    return (a.rank || 99) - (b.rank || 99);
  });

  useEffect(() => {
    players.forEach(p => {
      if (p.justEliminated) {
        setTimeout(() => clearEliminated(p.id), 1000);
      }
    });
  }, [players, clearEliminated]);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [rounds]);

  const handleSubmitRound = (scores) => {
    onAddRound(scores);
    setShowRoundInput(false);
  };

  const handleUndoClick = () => {
    if (rounds === 0) return;
    if (!confirmUndo) {
      setConfirmUndo(true);
      setTimeout(() => setConfirmUndo(false), 3000);
    } else {
      onUndoRound();
      setConfirmUndo(false);
    }
  };

  const handleSetPool = () => {
    const val = parseInt(poolInput, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateBuyIn(val);
      setShowSetPool(false);
      setPoolInput('');
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-casino-felt' : 'bg-emerald-50'}`}>

      {/* ── Sticky header ── */}
      <header className={`sticky top-0 z-30 flex-shrink-0
        ${isDark ? 'glass-dark border-b border-casino-green-light/30' : 'bg-white/90 border-b border-emerald-100 backdrop-blur-md'} shadow-lg`}>
        <div className="px-4 pt-2.5 pb-1.5 max-w-6xl mx-auto w-full">
          {/* Row 1: title + controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg flex-shrink-0">🃏</span>
              <h1 className={`text-sm font-black whitespace-nowrap ${isDark ? 'text-casino-gold' : 'text-emerald-800'}`}>
                Indian Rummy
              </h1>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={onPauseGame} title="Save & go home"
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all active:scale-90
                  ${isDark ? 'bg-casino-green-light/60 text-white hover:bg-casino-green-light' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                🏠
              </button>

              <button onClick={onToggleTheme}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 text-sm
                  ${isDark ? 'bg-casino-green-light/60 text-casino-gold hover:bg-casino-green-light' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                {isDark ? '☀️' : '🌙'}
              </button>

              <button onClick={handleUndoClick} disabled={rounds === 0}
                className={`h-8 px-2.5 rounded-full flex items-center gap-1 text-xs font-bold transition-all active:scale-90
                  ${rounds === 0
                    ? 'opacity-30 cursor-not-allowed ' + (isDark ? 'bg-casino-green-light/30 text-gray-500' : 'bg-gray-100 text-gray-400')
                    : confirmUndo
                      ? 'bg-orange-500 text-white animate-pulse'
                      : isDark ? 'bg-casino-green-light/60 text-white hover:bg-casino-green-light' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  }`}>
                {confirmUndo ? '⚠️ Confirm' : '↩ Undo'}
              </button>

              {activePlayers.length >= 2 && (
                <button onClick={() => setShowSplitModal(true)}
                  className={`h-8 px-3 rounded-full flex items-center gap-1 text-xs font-bold transition-all active:scale-90
                    ${isDark ? 'bg-casino-gold/20 text-casino-gold border border-casino-gold/40 hover:bg-casino-gold/30' : 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'}`}>
                  🏁 Finish
                </button>
              )}

              <button onClick={() => setShowConfirmReset(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all active:scale-90
                  ${isDark ? 'bg-red-900/60 text-red-400 hover:bg-red-900' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                🔄
              </button>
            </div>
          </div>

          {/* Row 2: stats + pool pill */}
          <div className="flex items-center justify-between mt-1">
            <p className={`text-xs whitespace-nowrap ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
              R{rounds} · {activePlayers.length} active · {outThreshold}pts
            </p>
            <button
              onClick={() => { setShowSetPool(v => !v); setPoolInput(buyInAmount > 0 ? String(buyInAmount) : ''); }}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold text-xs transition-all active:scale-95
                ${totalPool > 0
                  ? isDark
                    ? 'bg-casino-gold/20 border-casino-gold/50 text-casino-gold hover:bg-casino-gold/30'
                    : 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
                  : isDark
                    ? 'bg-casino-green-light/30 border-casino-green-light/50 text-emerald-400 hover:bg-casino-green-light/40'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-500 hover:bg-emerald-100'
                }`}
              title="Set buy-in amount"
            >
              💰 {totalPool > 0 ? `₹${totalPool}` : 'Set Pool'}
            </button>
          </div>
        </div>

        {/* Set pool inline input */}
        {showSetPool && (
          <div className={`px-4 pb-3 pt-0 flex items-center gap-2 max-w-6xl mx-auto w-full animate-slideUp`}>
            <span className={`text-xs font-semibold flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>₹ per player:</span>
            <input
              autoFocus
              type="number"
              min="0"
              placeholder="e.g. 200"
              value={poolInput}
              onChange={e => setPoolInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') handleSetPool(); if (e.key === 'Escape') setShowSetPool(false); }}
              className={`w-28 px-2.5 py-1.5 rounded-lg border text-sm font-bold outline-none
                ${isDark ? 'bg-casino-green text-white border-casino-gold placeholder-emerald-600' : 'bg-white text-emerald-900 border-emerald-400'}`}
            />
            {poolInput && (
              <span className={`text-xs ${isDark ? 'text-casino-gold' : 'text-amber-600'}`}>
                = ₹{parseInt(poolInput || 0) * players.reduce((s, p) => s + (p.contributions || 1), 0)} total pool
              </span>
            )}
            <button onClick={handleSetPool}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 active:scale-95 transition-all">
              Save
            </button>
            <button onClick={() => setShowSetPool(false)}
              className={`text-xs px-2 py-1.5 rounded-lg ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
              Cancel
            </button>
          </div>
        )}
      </header>

      {/* ── Horizontal player cards strip ── */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${isDark ? 'border-casino-green-light/20' : 'border-emerald-100'}`}>
        <div className="overflow-x-auto scrollbar-thin -mx-1 px-1 flex justify-center">
          <div className="flex gap-2.5 pb-1 flex-shrink-0">
            {sortedPlayers.map(player => {
              const isLeader = leader?.id === player.id;
              const isCurrentTurn = !player.isOut && player.id === currentTurnPlayerId;
              const invested = buyInAmount ? (player.contributions || 1) * buyInAmount : 0;
              const lastScore = player.scores.length > 0 ? player.scores[player.scores.length - 1] : null;
              const ptsRemaining = outThreshold - player.totalScore;
              const noDropAllowed = !player.isOut && ptsRemaining < 20;
              return (
                <div key={player.id}
                  className={`relative rounded-2xl p-3 border flex-shrink-0 w-[120px] transition-all duration-300
                    ${player.isOut
                      ? isDark ? 'bg-gray-800/60 border-gray-600/40 opacity-70' : 'bg-gray-100/80 border-gray-300 opacity-70'
                      : isLeader
                        ? isDark ? 'glass-gold border-casino-gold/50 shadow-lg shadow-yellow-500/20 animate-pulse-gold' : 'bg-amber-50/90 border-amber-400 shadow-md shadow-amber-200'
                        : isCurrentTurn
                          ? isDark ? 'glass border-blue-400/70 shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/50' : 'bg-blue-50/90 border-blue-400 shadow-md shadow-blue-100 ring-2 ring-blue-300/50'
                          : isDark ? 'glass border-white/10 shadow-sm' : 'bg-white/90 border-emerald-200 shadow-sm'
                    }`}
                >
                  {isLeader && !player.isOut && (
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 text-base">👑</div>
                  )}
                  {isCurrentTurn && !isLeader && (
                    <div className={`absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap
                      ${isDark ? 'bg-blue-500/80 text-white' : 'bg-blue-500 text-white'}`}>
                      ▶ Turn
                    </div>
                  )}
                  {/* Rank */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
                      {player.isOut ? '💀' : player.rank <= 3 ? ['🥇','🥈','🥉'][player.rank-1] : `#${player.rank}`}
                    </span>
                    {invested > 0 && (
                      <span className={`text-[10px] font-bold px-1 rounded ${isDark ? 'bg-casino-gold/15 text-casino-gold' : 'bg-amber-100 text-amber-700'}`}>
                        ₹{invested}
                      </span>
                    )}
                  </div>
                  {/* Name */}
                  <div className={`text-xs font-black truncate mb-1 ${player.isOut ? isDark ? 'text-gray-400 line-through' : 'text-gray-500 line-through' : isDark ? 'text-white' : 'text-emerald-900'}`}>
                    {player.name}
                  </div>
                  {/* Score */}
                  <div className={`text-2xl font-black leading-none mb-1
                    ${player.isOut ? isDark ? 'text-red-400' : 'text-red-500'
                      : player.totalScore >= 150 ? isDark ? 'text-red-400' : 'text-red-600'
                      : player.totalScore >= 100 ? isDark ? 'text-yellow-400' : 'text-yellow-600'
                      : isDark ? 'text-emerald-300' : 'text-emerald-600'
                    }`}>
                    {player.totalScore}
                  </div>
                  {lastScore !== null && !player.isOut && (
                    <div className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold text-center
                      ${isDark ? 'bg-casino-green-light/50 text-casino-gold-light' : 'bg-emerald-100 text-emerald-700'}`}>
                      {lastScore === 0 ? '🏆 Won' : `+${lastScore} last`}
                    </div>
                  )}
                  {noDropAllowed && (
                    <div className={`mt-1.5 text-[10px] font-black text-center px-1 py-1 rounded-lg animate-pulse
                      ${isDark ? 'bg-orange-900/50 text-orange-300 border border-orange-700/50' : 'bg-orange-100 text-orange-700 border border-orange-300'}`}>
                      ⛔ No Drop
                    </div>
                  )}
                  {/* OUT overlay with rejoin */}
                  {player.isOut && (
                    <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-black/50 backdrop-blur-[1px]">
                      <span className="bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded-full rotate-[-8deg]">OUT</span>
                      {onRejoinPlayer && rejoinAllowed && (
                        <button
                          onClick={() => onRejoinPlayer(player.id)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black px-2 py-1 rounded-full active:scale-95 transition-all"
                        >
                          ↩ {maxScore + 1}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content: full-width score table ── */}
      <div className="flex-1 max-w-6xl mx-auto w-full">

        <div className="px-4 pt-4 pb-2">
          {rounds === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 animate-fadeIn">
              <div className="text-5xl animate-float">🎲</div>
              <p className={`text-base font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>No rounds yet</p>
              <p className={`text-sm ${isDark ? 'text-emerald-600' : 'text-emerald-400'}`}>Tap "Add Round" to start scoring</p>
            </div>
          ) : (
            <div className={`rounded-2xl overflow-hidden shadow-lg border
              ${isDark ? 'glass border-casino-green-light/30' : 'bg-white border-emerald-100'}`}>

              {/* Single horizontal scroll wrapper for entire table */}
              <div className="overflow-x-auto scrollbar-thin">
                <div style={{ minWidth: `${48 + sortedPlayers.length * 72}px` }}>

                  {/* Table header */}
                  <div className={`flex border-b ${isDark ? 'border-casino-green-light/30 bg-casino-green/60' : 'border-emerald-100 bg-emerald-50'}`}>
                    <div className={`w-12 flex-shrink-0 px-2 py-3 text-xs font-bold ${isDark ? 'text-casino-gold' : 'text-emerald-600'}`}>Rnd</div>
                    <div className="flex flex-1">
                      {sortedPlayers.map(player => {
                        const isTurn = !player.isOut && player.id === currentTurnPlayerId;
                        return (
                        <div key={player.id}
                          className={`flex-1 min-w-[72px] px-1 py-3 text-xs font-bold text-center truncate relative
                            ${player.isOut
                              ? isDark ? 'text-gray-500 line-through' : 'text-gray-400 line-through'
                              : isTurn
                                ? isDark ? 'text-blue-300 bg-blue-500/15' : 'text-blue-700 bg-blue-100/80'
                                : leader?.id === player.id
                                  ? isDark ? 'text-casino-gold' : 'text-amber-600'
                                  : isDark ? 'text-emerald-300' : 'text-emerald-700'
                            }`}>
                          <span className={isTurn ? 'animate-pulse' : ''}>{player.name}</span>
                          {player.isOut && <span className="ml-0.5 no-underline" style={{ textDecoration: 'none' }}>💀</span>}
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Round rows — vertical scroll only */}
                  <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: rounds <= 10 ? 'none' : '400px' }} ref={tableRef}>
                    {Array.from({ length: rounds }, (_, roundIdx) => (
                      <div key={roundIdx}
                        className={`flex border-b last:border-0 transition-colors
                          ${isDark ? 'border-casino-green-light/15 hover:bg-casino-green/20' : 'border-emerald-50 hover:bg-emerald-50/50'}`}>
                        <div className={`w-12 flex-shrink-0 px-2 py-2.5 flex items-center`}>
                          <span className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0
                            ${isDark ? 'bg-casino-green-light/50 text-casino-gold' : 'bg-emerald-100 text-emerald-700'}`}>
                            {roundIdx + 1}
                          </span>
                        </div>
                        <div className="flex flex-1">
                          {sortedPlayers.map(player => {
                            const score = player.scores[roundIdx];
                            const isRejoinRound = (player.rejoinedAtRounds || []).includes(roundIdx);
                            return (
                              <div key={player.id}
                                className={`flex-1 min-w-[72px] px-1 py-2.5 text-center text-sm
                                  ${SCORE_BG(score, isDark)} ${SCORE_COLOR(score, isDark)}`}>
                                {isRejoinRound && (
                                  <span className={`block text-[9px] font-bold leading-none mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>↩ rejoin</span>
                                )}
                                {score === null || score === undefined
                                  ? <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                                  : score === 0 ? '🏆' : score}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals row */}
                  <div className={`flex border-t-2 ${isDark ? 'border-casino-gold/30 bg-casino-green/80' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className={`w-12 flex-shrink-0 px-2 py-2.5 text-xs font-black ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>Tot</div>
                    <div className="flex flex-1">
                      {sortedPlayers.map(player => (
                        <div key={player.id}
                          className={`flex-1 min-w-[72px] px-1 py-2.5 text-center text-sm font-black
                            ${player.isOut
                              ? isDark ? 'text-red-400' : 'text-red-500'
                              : leader?.id === player.id
                                ? isDark ? 'text-casino-gold' : 'text-amber-600'
                                : isDark ? 'text-white' : 'text-emerald-900'
                            }`}>
                          {player.totalScore}
                          {player.isOut && <span className="ml-0.5 text-xs">💀</span>}
                          {leader?.id === player.id && !player.isOut && <span className="ml-0.5 text-xs">👑</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-1.5 mt-3 pb-24 md:pb-4">
            {[
              { color: isDark ? 'text-emerald-400' : 'text-emerald-600', label: '🏆 Won' },
              { color: isDark ? 'text-blue-400' : 'text-blue-600', label: '🏃 20 Drop' },
              { color: isDark ? 'text-yellow-400' : 'text-yellow-600', label: '⚠️ 40 Mid' },
              { color: isDark ? 'text-red-400' : 'text-red-600', label: '💀 80 Full' },
            ].map(({ color, label }) => (
              <span key={label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-casino-green/60' : 'bg-white shadow-sm'} ${color}`}>
                {label}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* ── Sticky FAB ── */}
      {activePlayers.length >= 2 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setShowRoundInput(true)}
            className={`h-14 px-6 rounded-full font-black text-base shadow-2xl transition-all duration-300
              hover:scale-110 active:scale-95 flex items-center gap-2
              ${isDark
                ? 'bg-casino-gold text-casino-felt shadow-yellow-500/40 hover:bg-casino-gold-light'
                : 'bg-emerald-600 text-white shadow-emerald-300 hover:bg-emerald-700'
              }`}>
            <span className="text-xl">+</span>
            <span>Add Round</span>
          </button>
        </div>
      )}

      {/* ── Round Input Modal ── */}
      {showRoundInput && (
        <RoundInput
          players={players}
          roundNumber={rounds + 1}
          onSubmit={handleSubmitRound}
          onCancel={() => setShowRoundInput(false)}
          theme={theme}
          outThreshold={outThreshold}
        />
      )}

      {/* ── Split Modal ── */}
      {showSplitModal && (
        <SplitModal
          players={players}
          outThreshold={outThreshold}
          totalPool={totalPool}
          buyInAmount={buyInAmount}
          computeSplit={computeSplit}
          isDark={isDark}
          onConfirm={(splits) => { onEndWithSplit(splits); setShowSplitModal(false); }}
          onCancel={() => setShowSplitModal(false)}
        />
      )}

      {/* ── Reset Confirmation ── */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmReset(false)} />
          <div className={`relative rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-bounce-in
            ${isDark ? 'bg-casino-felt border border-casino-green-light/50' : 'bg-white border border-emerald-200'}`}>
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">🔄</div>
              <h3 className={`text-lg font-black mb-2 ${isDark ? 'text-white' : 'text-emerald-900'}`}>Start New Game?</h3>
              <p className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>All current game data will be lost.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmReset(false)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95
                  ${isDark ? 'bg-casino-green-light/60 text-white hover:bg-casino-green-light' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                Cancel
              </button>
              <button onClick={() => { onResetGame(); setShowConfirmReset(false); }}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95">
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
