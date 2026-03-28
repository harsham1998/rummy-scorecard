import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const SUITS = ['♠', '♥', '♦', '♣'];
const THRESHOLD_PRESETS = [
  { label: '80', value: 80, desc: 'Standard' },
  { label: '101', value: 101, desc: 'Extended' },
  { label: '201', value: 201, desc: 'Long game' },
];
const RULES = [
  { icon: '🏆', title: 'Won (0 pts)', desc: 'Player who declares successfully and wins the round scores 0.' },
  { icon: '📉', title: 'Drop (20 pts)', desc: 'Leave the game at the start of your turn before picking a card.' },
  { icon: '⚠️', title: 'Middle Drop (40 pts)', desc: 'Leave mid-game after picking at least one card.' },
  { icon: '💀', title: 'Full Count (80 pts)', desc: 'Lose the round — sum of all unmelded cards, max 80.' },
  { icon: '❌', title: 'Wrong Declaration (80 pts)', desc: 'Declare incorrectly: 80-point penalty regardless of hand.' },
  { icon: '🔢', title: 'Manual Count', desc: 'Enter exact unmelded card value (A/J/Q/K = 10, others = face value).' },
  { icon: '🚫', title: 'Elimination', desc: `A player is OUT when their total reaches the elimination score. Last player standing wins!` },
];
const RANK_EMOJIS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

const computePlayerStats = (name, pastGames) => {
  let played = 0, wonSolo = 0, splitCount = 0, invested = 0, totalWon = 0;
  const recentGames = [];
  for (const game of pastGames) {
    const p = game.players.find(pl => pl.name === name);
    if (!p) continue;
    played++;
    const inv = (p.contributions || 1) * (game.buyInAmount || 0);
    invested += inv;
    const isWinner = game.winner?.name === name;
    const hasSplit = game.splitResults != null && game.splitResults[p.id] > 0;
    if (hasSplit) splitCount++;
    else if (isWinner) wonSolo++;
    let winAmt = 0;
    if (game.splitResults?.[p.id] != null) winAmt = game.splitResults[p.id];
    else if (isWinner) winAmt = game.totalPool || 0;
    totalWon += winAmt;
    recentGames.push({ date: game.date, isWinner: isWinner || hasSplit, score: p.totalScore, winAmt, inv, rounds: game.rounds });
  }
  const won = wonSolo + splitCount;
  return {
    played, wonSolo, splitCount, won,
    lost: played - won,
    winPct: played > 0 ? Math.round((won / played) * 100) : 0,
    invested, totalWon,
    profit: totalWon - invested,
    recentGames: recentGames.slice(0, 5),
  };
};

function PlayerProfileModal({ name, pastGames, onClose, isDark }) {
  const stats = computePlayerStats(name, pastGames);
  const avatarEmojis = ['🎴', '🃏', '🎲', '♠', '♥', '♦', '♣'];
  const avatar = avatarEmojis[name.charCodeAt(0) % avatarEmojis.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-bounce-in
        ${isDark ? 'bg-casino-felt border border-casino-green-light/40' : 'bg-white border border-emerald-100'}`}>

        {/* Header */}
        <div className={`px-5 pt-5 pb-4 ${isDark ? 'bg-casino-green/60' : 'bg-emerald-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                ${isDark ? 'bg-casino-gold/20 border border-casino-gold/40' : 'bg-emerald-100 border border-emerald-200'}`}>
                {avatar}
              </div>
              <div>
                <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-emerald-900'}`}>{name}</div>
                <div className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.played} games played</div>
              </div>
            </div>
            <button onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all active:scale-90
                ${isDark ? 'bg-casino-green-light/50 text-white' : 'bg-white text-gray-500 shadow-sm'}`}>×</button>
          </div>

          {/* Win rate bar */}
          <div className={`text-xs font-semibold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            Win rate · {stats.winPct}%
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-casino-green-light/30' : 'bg-emerald-100'}`}>
            <div
              className={`h-full rounded-full transition-all ${stats.winPct >= 50 ? 'bg-emerald-500' : 'bg-orange-400'}`}
              style={{ width: `${stats.winPct}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className={`grid grid-cols-3 border-b ${isDark ? 'border-casino-green-light/20' : 'border-emerald-100'}`}>
          {[
            { label: 'Played', value: stats.played, color: '' },
            { label: 'Won', value: stats.won, color: isDark ? 'text-emerald-400' : 'text-emerald-600' },
            { label: 'Win %', value: `${stats.winPct}%`, color: stats.winPct >= 50 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-orange-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`py-3 text-center border-r last:border-r-0 ${isDark ? 'border-casino-green-light/20' : 'border-emerald-100'}`}>
              <div className={`text-xl font-black ${color || (isDark ? 'text-white' : 'text-emerald-900')}`}>{value}</div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>{label}</div>
            </div>
          ))}
        </div>

        {/* Money breakdown */}
        <div className="px-5 py-4 space-y-2.5">
          {[
            { label: 'Total Invested', value: `₹${stats.invested}`, color: isDark ? 'text-white' : 'text-emerald-900' },
            { label: 'Total Won', value: `₹${stats.totalWon}`, color: isDark ? 'text-casino-gold' : 'text-amber-600' },
            {
              label: 'Net Profit',
              value: stats.profit === 0 ? '₹0' : `${stats.profit > 0 ? '+' : ''}₹${stats.profit}`,
              color: stats.profit > 0 ? 'text-emerald-400' : stats.profit < 0 ? 'text-red-400' : isDark ? 'text-gray-400' : 'text-gray-500',
              big: true,
            },
          ].map(({ label, value, color, big }) => (
            <div key={label} className={`flex items-center justify-between py-2 border-b last:border-b-0
              ${isDark ? 'border-casino-green-light/15' : 'border-emerald-50'}`}>
              <span className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{label}</span>
              <span className={`font-black ${big ? 'text-lg' : 'text-sm'} ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Recent games */}
        {stats.recentGames.length > 0 && (
          <div className={`px-5 pb-5 border-t ${isDark ? 'border-casino-green-light/20' : 'border-emerald-100'}`}>
            <div className={`text-xs font-bold mt-3 mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Recent Games</div>
            <div className="space-y-1.5">
              {stats.recentGames.map((g, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs
                  ${isDark ? 'bg-casino-green/40' : 'bg-emerald-50'}`}>
                  <span>{g.isWinner ? '🏆' : '🎴'}</span>
                  <span className={`flex-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{formatDate(g.date)}</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-emerald-900'}`}>{g.score} pts</span>
                  {g.winAmt > 0 && (
                    <span className={`font-black ${isDark ? 'text-casino-gold' : 'text-amber-600'}`}>₹{g.winAmt}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const formatDate = (isoString) => {
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday = new Date(now - 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ` · ${time}`;
};

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
  return '';
};

function PastGameModal({ game, onClose, isDark }) {
  const sorted = [...game.players].sort((a, b) => a.totalScore - b.totalScore);
  const winner = game.winner || sorted[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fadeIn">
      {/* Full-screen backdrop */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-casino-felt' : 'bg-emerald-50'}`}>

        {/* ── Header ── */}
        <div className={`flex-shrink-0 px-4 pt-3 pb-2 border-b shadow-lg
          ${isDark ? 'glass-dark border-casino-green-light/30' : 'bg-white/90 border-emerald-100 backdrop-blur-md'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg flex-shrink-0">🃏</span>
              <div className="min-w-0">
                <div className={`text-sm font-black whitespace-nowrap ${isDark ? 'text-casino-gold' : 'text-emerald-800'}`}>
                  Game Summary
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all active:scale-95
                ${isDark ? 'bg-casino-green-light/60 text-white hover:bg-casino-green-light' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
              ← Back
            </button>
          </div>
          <div className={`text-xs mt-1 whitespace-nowrap ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
            {formatDate(game.date)} · {game.rounds} rounds · Out@{game.outThreshold}pts
            {game.totalPool > 0 && ` · 💰 ₹${game.totalPool}`}
          </div>
        </div>

        {/* ── Winner banner ── */}
        <div className={`flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b
          ${isDark ? 'bg-casino-gold/10 border-casino-green-light/20' : 'bg-amber-50 border-amber-100'}`}>
          <span className="text-xl">🏆</span>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-semibold ${isDark ? 'text-casino-gold/70' : 'text-amber-600'}`}>WINNER</div>
            <div className={`text-base font-black truncate ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>
              {winner?.name} · {winner?.totalScore} pts
            </div>
          </div>
          {game.splitResults && (
            <div className={`text-xs text-right flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Split game
            </div>
          )}
        </div>

        {/* ── Player cards strip ── */}
        <div className={`flex-shrink-0 px-4 py-3 border-b ${isDark ? 'border-casino-green-light/20' : 'border-emerald-100'}`}>
          <div className="overflow-x-auto scrollbar-thin flex justify-center">
            <div className="flex gap-2.5 pb-1 flex-shrink-0">
              {sorted.map((player, idx) => {
                const isWinner = winner?.id === player.id;
                const invested = game.buyInAmount ? (player.contributions || 1) * game.buyInAmount : 0;
                const splitAmt = game.splitResults?.[player.id];
                return (
                  <div key={player.id}
                    className={`relative rounded-2xl p-3 border flex-shrink-0 w-[112px]
                      ${player.isOut
                        ? isDark ? 'bg-gray-800/60 border-gray-600/40 opacity-70' : 'bg-gray-100/80 border-gray-300 opacity-70'
                        : isWinner
                          ? isDark ? 'glass-gold border-casino-gold/50 shadow-lg' : 'bg-amber-50/90 border-amber-400 shadow-md'
                          : isDark ? 'glass border-white/10 shadow-sm' : 'bg-white/90 border-emerald-200 shadow-sm'
                      }`}>
                    {isWinner && !player.isOut && (
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 text-base">👑</div>
                    )}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-bold ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
                        {player.isOut ? '💀' : RANK_EMOJIS[idx] || `#${idx+1}`}
                      </span>
                      {invested > 0 && (
                        <span className={`text-[10px] font-bold px-1 rounded ${isDark ? 'bg-casino-gold/15 text-casino-gold' : 'bg-amber-100 text-amber-700'}`}>
                          ₹{invested}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs font-black truncate mb-1
                      ${player.isOut ? isDark ? 'text-gray-400 line-through' : 'text-gray-500 line-through' : isDark ? 'text-white' : 'text-emerald-900'}`}>
                      {player.name}
                    </div>
                    <div className={`text-2xl font-black leading-none mb-1
                      ${player.isOut ? isDark ? 'text-red-400' : 'text-red-500'
                        : isWinner ? isDark ? 'text-casino-gold' : 'text-amber-600'
                        : player.totalScore >= 150 ? isDark ? 'text-red-400' : 'text-red-600'
                        : player.totalScore >= 100 ? isDark ? 'text-yellow-400' : 'text-yellow-600'
                        : isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                      {player.totalScore}
                    </div>
                    {splitAmt != null && (
                      <div className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold text-center
                        ${splitAmt > 0 ? isDark ? 'bg-casino-gold/20 text-casino-gold' : 'bg-amber-100 text-amber-700'
                          : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        {splitAmt > 0 ? `₹${splitAmt}` : '₹0'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Score table + Prize box ── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
          <div className="flex gap-4 items-start flex-col lg:flex-row">

          {/* Score table */}
          <div className="flex-1 min-w-0">
          <div className={`rounded-2xl overflow-hidden shadow-lg border
            ${isDark ? 'glass border-casino-green-light/30' : 'bg-white border-emerald-100'}`}>
            <div className="overflow-x-auto scrollbar-thin">
              <div style={{ minWidth: `${48 + sorted.length * 72}px` }}>

                {/* Header row */}
                <div className={`flex border-b ${isDark ? 'border-casino-green-light/30 bg-casino-green/60' : 'border-emerald-100 bg-emerald-50'}`}>
                  <div className={`w-12 flex-shrink-0 px-2 py-3 text-xs font-bold ${isDark ? 'text-casino-gold' : 'text-emerald-600'}`}>Rnd</div>
                  <div className="flex flex-1">
                    {sorted.map(player => (
                      <div key={player.id}
                        className={`flex-1 min-w-[72px] px-1 py-3 text-xs font-bold text-center truncate
                          ${player.isOut
                            ? isDark ? 'text-gray-500 line-through' : 'text-gray-400 line-through'
                            : winner?.id === player.id ? isDark ? 'text-casino-gold' : 'text-amber-600'
                            : isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {player.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Round rows — scroll after 10 */}
                <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: game.rounds <= 10 ? 'none' : '400px' }}>
                  {Array.from({ length: game.rounds }, (_, roundIdx) => (
                    <div key={roundIdx}
                      className={`flex border-b last:border-0 transition-colors
                        ${isDark ? 'border-casino-green-light/15 hover:bg-casino-green/20' : 'border-emerald-50 hover:bg-emerald-50/50'}`}>
                      <div className="w-12 flex-shrink-0 px-2 py-2.5 flex items-center">
                        <span className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0
                          ${isDark ? 'bg-casino-green-light/50 text-casino-gold' : 'bg-emerald-100 text-emerald-700'}`}>
                          {roundIdx + 1}
                        </span>
                      </div>
                      <div className="flex flex-1">
                        {sorted.map(player => {
                          const score = player.scores[roundIdx];
                          return (
                            <div key={player.id}
                              className={`flex-1 min-w-[72px] px-1 py-2.5 text-center text-sm
                                ${SCORE_BG(score, isDark)} ${SCORE_COLOR(score, isDark)}`}>
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
                    {sorted.map(player => (
                      <div key={player.id}
                        className={`flex-1 min-w-[72px] px-1 py-2.5 text-center text-sm font-black
                          ${player.isOut ? isDark ? 'text-red-400' : 'text-red-500'
                            : winner?.id === player.id ? isDark ? 'text-casino-gold' : 'text-amber-600'
                            : isDark ? 'text-white' : 'text-emerald-900'}`}>
                        {player.totalScore}
                        {winner?.id === player.id && !player.isOut && <span className="ml-0.5 text-xs">👑</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Split row */}
                {game.splitResults && (
                  <div className={`flex border-t ${isDark ? 'border-casino-green-light/30 bg-casino-gold/5' : 'border-amber-100 bg-amber-50'}`}>
                    <div className={`w-12 flex-shrink-0 px-2 py-2.5 text-xs font-black ${isDark ? 'text-casino-gold' : 'text-amber-600'}`}>💰</div>
                    <div className="flex flex-1">
                      {sorted.map(player => {
                        const amt = game.splitResults[player.id] ?? 0;
                        return (
                          <div key={player.id}
                            className={`flex-1 min-w-[72px] px-1 py-2.5 text-center text-xs font-black
                              ${amt > 0 ? isDark ? 'text-casino-gold' : 'text-amber-600' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                            ₹{amt}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-1.5 mt-3">
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
          </div>{/* end score table col */}

          {/* ── Prize Money Box ── */}
          {game.totalPool > 0 && (
            <div className="w-full lg:w-60 flex-shrink-0">
              <div className={`rounded-2xl overflow-hidden shadow-lg border
                ${isDark ? 'glass border-casino-gold/30' : 'bg-white border-amber-200'}`}>

                {/* Header */}
                <div className={`px-4 py-3 border-b ${isDark ? 'bg-casino-gold/10 border-casino-gold/20' : 'bg-amber-50 border-amber-100'}`}>
                  <div className={`text-sm font-black ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>💰 Prize Money</div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-emerald-400' : 'text-amber-600'}`}>
                    Total pool: ₹{game.totalPool}
                  </div>
                </div>

                {/* Player rows — only those who won money */}
                <div className={`divide-y ${isDark ? 'divide-casino-green-light/15' : 'divide-amber-50'}`}>
                  {sorted.map((player, idx) => {
                    const invested = game.buyInAmount ? (player.contributions || 1) * game.buyInAmount : 0;
                    const won = game.splitResults?.[player.id] ?? (winner?.id === player.id ? game.totalPool : 0);
                    const net = won - invested;
                    const isWinner = winner?.id === player.id;
                    if (won === 0) return null;
                    return (
                      <div key={player.id} className={`px-4 py-3 ${isWinner ? isDark ? 'bg-casino-gold/5' : 'bg-amber-50/60' : ''}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm">{RANK_EMOJIS[idx] || `#${idx+1}`}</span>
                          <span className={`text-sm font-bold truncate flex-1
                            ${isWinner ? isDark ? 'text-casino-gold' : 'text-amber-700' : isDark ? 'text-white' : 'text-emerald-900'}`}>
                            {player.name}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={isDark ? 'text-emerald-500' : 'text-gray-500'}>Invested</span>
                          <span className={`font-semibold ${isDark ? 'text-emerald-300' : 'text-gray-700'}`}>₹{invested}</span>
                        </div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={isDark ? 'text-emerald-500' : 'text-gray-500'}>Won</span>
                          <span className={`font-bold ${won > 0 ? isDark ? 'text-casino-gold' : 'text-amber-600' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>₹{won}</span>
                        </div>
                        <div className={`flex justify-between text-xs pt-1 border-t ${isDark ? 'border-casino-green-light/20' : 'border-amber-100'}`}>
                          <span className={isDark ? 'text-emerald-500' : 'text-gray-500'}>Profit</span>
                          <span className={`font-black ${net > 0 ? 'text-emerald-400' : net < 0 ? 'text-red-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {net > 0 ? `+₹${net}` : net < 0 ? `-₹${Math.abs(net)}` : '₹0'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

          </div>{/* end flex row */}
        </div>

      </div>
    </div>
  );
}

export default function GameSetup({ onStart, theme, pastGames = [], clearHistory, resumeGame, inProgressGames = [], voidGame }) {
  const [selectedNames, setSelectedNames] = useState([]); // ordered list of selected players
  const [savedPlayers, setSavedPlayers] = useState([]);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [outThreshold, setOutThreshold] = useState(80);
  const [customThreshold, setCustomThreshold] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [starting, setStarting] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [voidConfirmId, setVoidConfirmId] = useState(null);
  const addInputRef = useRef(null);

  const isDark = theme === 'dark';

  // Load saved players from Supabase
  useEffect(() => {
    supabase
      .from('players')
      .select('name')
      .order('name')
      .then(({ data }) => { if (data) setSavedPlayers(data.map(p => p.name)); });
  }, []);

  useEffect(() => {
    if (showAddPlayer && addInputRef.current) addInputRef.current.focus();
  }, [showAddPlayer]);

  const togglePlayer = (name) => {
    setSelectedNames(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : prev.length < 10 ? [...prev, name] : prev
    );
  };

  const handleAddPlayer = async () => {
    const name = newPlayerName.trim();
    if (!name || savedPlayers.includes(name)) return;
    setAddingPlayer(true);
    const { error } = await supabase.from('players').insert({ name });
    if (!error) {
      setSavedPlayers(prev => [...prev, name].sort());
      setSelectedNames(prev => prev.length < 10 ? [...prev, name] : prev);
    }
    setNewPlayerName('');
    setShowAddPlayer(false);
    setAddingPlayer(false);
  };

  const handlePresetThreshold = (val) => {
    setOutThreshold(val);
    setUseCustom(false);
    setCustomThreshold('');
  };

  const handleCustomThresholdChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomThreshold(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 40) {
      setOutThreshold(num);
    }
  };

  const effectiveThreshold = useCustom
    ? (parseInt(customThreshold, 10) >= 40 ? parseInt(customThreshold, 10) : null)
    : outThreshold;

  const canStart = effectiveThreshold !== null && effectiveThreshold >= 40 && selectedNames.length >= 2;

  const handleStart = () => {
    if (!canStart) return;
    setStarting(true);
    const amount = buyInAmount ? parseInt(buyInAmount, 10) : 0;
    setTimeout(() => onStart(selectedNames, effectiveThreshold, amount), 300);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden ${isDark ? 'bg-casino-felt' : 'bg-emerald-50'}`}>
      {/* Animated background suits */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {SUITS.map((suit, i) => (
          <div
            key={suit}
            className={`absolute text-8xl font-bold opacity-5 ${isDark ? 'text-casino-gold' : 'text-emerald-800'}`}
            style={{
              top: `${[10, 60, 20, 70][i]}%`,
              left: `${[5, 75, 50, 25][i]}%`,
              animation: `float ${3 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            {suit}
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className={`relative z-10 w-full max-w-md mx-4 my-6 animate-slideUp`}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3 animate-float" style={{ animationDuration: '3s' }}>🃏</div>
          <h1 className={`text-4xl font-bold mb-1 ${isDark ? 'text-casino-gold animate-glow' : 'text-emerald-800'}`}>
            Indian Rummy
          </h1>
          <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
            13 Card Game Scorekeeper
          </p>
        </div>

        {/* ── In-Progress Games List ── */}
        {inProgressGames.length > 0 && (
          <div className={`mb-4 rounded-2xl overflow-hidden border shadow-lg
            ${isDark ? 'border-casino-gold/30 bg-casino-gold/5' : 'border-amber-200 bg-amber-50'}`}>
            <div className={`px-4 py-2.5 flex items-center gap-2 border-b
              ${isDark ? 'border-casino-gold/20 bg-casino-green/60' : 'border-amber-200 bg-amber-100'}`}>
              <span>⏸️</span>
              <h3 className={`text-sm font-black ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>
                Games In Progress
              </h3>
            </div>
            <div className="divide-y divide-amber-200/30">
              {inProgressGames.map(game => (
                <div key={game.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-amber-900'}`}>
                      {game.players.filter(p => !p.isOut).map(p => p.name).join(', ')}
                    </div>
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-emerald-400' : 'text-amber-600'}`}>
                      {formatDate(game.date)} · R{game.rounds} · Out@{game.outThreshold}
                      {game.buyInAmount > 0 && ` · ₹${game.buyInAmount * game.players.length}`}
                    </div>
                  </div>
                  <button
                    onClick={() => resumeGame(game.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-black text-xs transition-all active:scale-95 shadow-sm
                      ${isDark ? 'bg-casino-gold text-casino-felt hover:bg-casino-gold-light' : 'bg-amber-500 text-white hover:bg-amber-400'}`}
                  >
                    ▶ Resume
                  </button>
                  {voidConfirmId === game.id ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { voidGame(game.id); setVoidConfirmId(null); }}
                        className="px-2 py-1.5 rounded-xl font-black text-xs bg-red-600 text-white active:scale-95 transition-all"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setVoidConfirmId(null)}
                        className={`px-2 py-1.5 rounded-xl font-black text-xs active:scale-95 transition-all
                          ${isDark ? 'bg-casino-green-light/60 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setVoidConfirmId(game.id)}
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-95
                        ${isDark ? 'bg-red-900/60 text-red-400 hover:bg-red-900' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
                      title="Void game"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Setup card */}
        <div className={`rounded-2xl p-6 shadow-2xl ${isDark ? 'glass' : 'glass-light bg-white/80'}`}>

          {/* ── Elimination Score ── */}
          <div className="mb-6">
            <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>
              Elimination Score
            </label>
            <p className={`text-xs mb-3 ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
              Player is OUT when their total reaches this score
            </p>

            {/* Preset buttons */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {THRESHOLD_PRESETS.map(({ label, value, desc }) => {
                const isSelected = !useCustom && outThreshold === value;
                return (
                  <button
                    key={value}
                    onClick={() => handlePresetThreshold(value)}
                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all duration-200 active:scale-95 flex flex-col items-center gap-0.5
                      ${isSelected
                        ? isDark
                          ? 'border-casino-gold bg-casino-gold/20 text-casino-gold scale-105 shadow-md'
                          : 'border-emerald-600 bg-emerald-100 text-emerald-800 scale-105 shadow-md'
                        : isDark
                          ? 'border-casino-green-light/50 bg-casino-green/30 text-white hover:border-casino-gold/50 hover:bg-casino-green/50'
                          : 'border-emerald-200 bg-white text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50'
                      }`}
                  >
                    <span className="text-lg font-black">{label}</span>
                    <span className={`text-xs font-normal ${isSelected ? '' : isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>{desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom threshold toggle + input */}
            <button
              onClick={() => { setUseCustom(v => !v); }}
              className={`text-xs font-semibold mb-2 flex items-center gap-1 transition-colors
                ${isDark ? 'text-emerald-400 hover:text-casino-gold' : 'text-emerald-600 hover:text-emerald-800'}`}
            >
              <span>{useCustom ? '▼' : '▶'}</span>
              <span>Custom score</span>
            </button>
            {useCustom && (
              <div className="relative animate-slideUp">
                <input
                  type="number"
                  min="40"
                  max="500"
                  placeholder="Enter score (min 40)"
                  value={customThreshold}
                  onChange={handleCustomThresholdChange}
                  autoFocus
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm font-medium outline-none transition-all duration-200
                    ${isDark
                      ? 'bg-casino-green/50 border-casino-green-light text-white placeholder-emerald-600 focus:border-casino-gold'
                      : 'bg-white border-emerald-200 text-emerald-900 placeholder-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-300'
                    }
                    ${customThreshold && parseInt(customThreshold) < 40 ? 'border-red-500' : ''}`}
                />
                {customThreshold && parseInt(customThreshold) < 40 && (
                  <p className="text-red-400 text-xs mt-1">Minimum score is 40</p>
                )}
              </div>
            )}
          </div>

          {/* ── Buy-in Amount ── */}
          <div className="mb-6">
            <label className={`block text-sm font-semibold mb-1 ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>
              Buy-in Amount per Player
            </label>
            <p className={`text-xs mb-2 ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
              Optional — used for pool tracking &amp; split calculations
            </p>
            <div className="relative">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>₹</span>
              <input
                type="number"
                min="0"
                placeholder="0 (no pool)"
                value={buyInAmount}
                onChange={e => setBuyInAmount(e.target.value.replace(/\D/g, ''))}
                className={`w-full pl-7 pr-3 py-2.5 rounded-lg border text-sm font-bold outline-none transition-all duration-200
                  ${isDark
                    ? 'bg-casino-green/50 border-casino-green-light text-white placeholder-emerald-600 focus:border-casino-gold'
                    : 'bg-white border-emerald-200 text-emerald-900 placeholder-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-300'
                  }`}
              />
            </div>
            {buyInAmount && parseInt(buyInAmount) > 0 && selectedNames.length > 0 && (
              <p className={`text-xs mt-1.5 font-semibold ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>
                💰 Total pool: ₹{parseInt(buyInAmount) * selectedNames.length} ({selectedNames.length} players)
              </p>
            )}
          </div>

          {/* ── Player Selection ── */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className={`text-sm font-semibold ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>
                Select Players
              </label>
              {selectedNames.length > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                  ${isDark ? 'bg-casino-gold/20 text-casino-gold' : 'bg-emerald-100 text-emerald-700'}`}>
                  {selectedNames.length} selected · tap to remove
                </span>
              )}
            </div>

            {/* Selected players row (ordered) */}
            {selectedNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedNames.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => togglePlayer(name)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-95
                      ${isDark ? 'bg-casino-gold text-casino-felt' : 'bg-emerald-600 text-white'}`}
                  >
                    <span className="opacity-60 text-[10px]">{i + 1}</span>
                    {name}
                    <span className="opacity-60">×</span>
                  </button>
                ))}
              </div>
            )}

            {/* All saved players grid */}
            {savedPlayers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {savedPlayers.map(name => {
                  const isSelected = selectedNames.includes(name);
                  return (
                    <button
                      key={name}
                      onClick={() => togglePlayer(name)}
                      disabled={!isSelected && selectedNames.length >= 10}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-150 active:scale-95
                        ${isSelected
                          ? isDark
                            ? 'border-casino-green-light bg-casino-green-light/20 text-emerald-300 opacity-40'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-400 opacity-40'
                          : selectedNames.length >= 10
                            ? 'opacity-30 cursor-not-allowed border-transparent'
                            : isDark
                              ? 'border-casino-green-light/40 bg-casino-green/40 text-white hover:border-casino-gold hover:bg-casino-green/60'
                              : 'border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50'
                        }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
                No saved players yet — add your first player below.
              </p>
            )}

            {/* Add new player */}
            <div className="mt-3">
              {!showAddPlayer ? (
                <button
                  onClick={() => setShowAddPlayer(true)}
                  className={`flex items-center gap-1.5 text-xs font-semibold transition-colors
                    ${isDark ? 'text-emerald-400 hover:text-casino-gold' : 'text-emerald-600 hover:text-emerald-800'}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-sm font-black
                    ${isDark ? 'bg-casino-green-light/40' : 'bg-emerald-100'}`}>+</span>
                  Add new player
                </button>
              ) : (
                <div className="flex gap-2 mt-1 animate-slideUp">
                  <input
                    ref={addInputRef}
                    type="text"
                    value={newPlayerName}
                    onChange={e => setNewPlayerName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddPlayer(); if (e.key === 'Escape') { setShowAddPlayer(false); setNewPlayerName(''); } }}
                    placeholder="Player name"
                    maxLength={20}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium outline-none border transition-all
                      ${isDark
                        ? 'bg-casino-green/50 border-casino-green-light text-white placeholder-emerald-600 focus:border-casino-gold'
                        : 'bg-white border-emerald-200 text-emerald-900 placeholder-emerald-300 focus:border-emerald-500'
                      }`}
                  />
                  <button
                    onClick={handleAddPlayer}
                    disabled={!newPlayerName.trim() || addingPlayer}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all active:scale-95
                      ${isDark ? 'bg-casino-gold text-casino-felt disabled:opacity-40' : 'bg-emerald-600 text-white disabled:opacity-40'}`}
                  >
                    {addingPlayer ? '...' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setShowAddPlayer(false); setNewPlayerName(''); }}
                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all active:scale-95
                      ${isDark ? 'bg-casino-green-light/30 text-white' : 'bg-emerald-100 text-emerald-700'}`}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {selectedNames.length < 2 && (
              <p className={`text-xs mt-2 ${isDark ? 'text-emerald-600' : 'text-emerald-400'}`}>
                Select at least 2 players to start
              </p>
            )}
          </div>

          {/* ── Start button ── */}
          <button
            onClick={handleStart}
            disabled={starting || !canStart}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 active:scale-95 shadow-lg
              ${starting || !canStart ? 'opacity-70 scale-95 cursor-not-allowed' : 'hover:scale-105 hover:shadow-xl'}
              ${isDark
                ? 'bg-casino-gold text-casino-felt hover:bg-casino-gold-light'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
          >
            {starting ? '🎲 Starting...' : `🎮 Start Game · Out at ${canStart ? effectiveThreshold : '?'} pts`}
          </button>
        </div>

        {/* Rules toggle */}
        <div className="mt-4">
          <button
            onClick={() => setShowRules(v => !v)}
            className={`w-full text-center py-2 text-sm font-medium transition-all duration-200 ${isDark ? 'text-emerald-400 hover:text-casino-gold' : 'text-emerald-600 hover:text-emerald-800'}`}
          >
            {showRules ? '▲ Hide Rules' : '▼ Show Game Rules'}
          </button>

          {showRules && (
            <div className={`mt-3 rounded-2xl p-4 animate-slideDown ${isDark ? 'glass' : 'glass-light bg-white/70'}`}>
              <h3 className={`text-base font-bold mb-3 text-center ${isDark ? 'text-casino-gold' : 'text-emerald-800'}`}>
                How to Play
              </h3>
              <div className="space-y-3">
                {RULES.map((rule, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-xl flex-shrink-0 mt-0.5">{rule.icon}</span>
                    <div>
                      <div className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-emerald-900'}`}>{rule.title}</div>
                      <div className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{rule.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Past Games ── */}
        {pastGames.length > 0 && (
          <div className="mt-4">
            <div className={`rounded-2xl overflow-hidden shadow-lg ${isDark ? 'glass border-casino-green-light/30' : 'bg-white border border-emerald-100'} border`}>
              <div className={`flex items-center justify-between px-4 py-3 border-b
                ${isDark ? 'border-casino-green-light/30 bg-casino-green/60' : 'border-emerald-100 bg-emerald-50'}`}>
                <h3 className={`text-sm font-black ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>
                  🕐 Recent Games
                </h3>
                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className={`text-xs font-medium transition-colors ${isDark ? 'text-emerald-500 hover:text-red-400' : 'text-emerald-400 hover:text-red-500'}`}
                  >
                    Clear all
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Sure?</span>
                    <button
                      onClick={() => { clearHistory(); setShowClearConfirm(false); }}
                      className="text-xs font-bold text-red-400 hover:text-red-300"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                    >
                      No
                    </button>
                  </div>
                )}
              </div>

              <div className={`divide-y ${isDark ? 'divide-casino-green-light/15' : 'divide-emerald-50'}`}>
                {pastGames.slice(0, 3).map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                      ${isDark ? 'hover:bg-casino-green/40 active:bg-casino-green/60' : 'hover:bg-emerald-50 active:bg-emerald-100'}`}
                  >
                    <div className="text-xl flex-shrink-0">🏆</div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-emerald-900'}`}>
                        {game.winner?.name}
                        {game.totalPool > 0 && (
                          <span className={`ml-2 text-xs font-semibold ${isDark ? 'text-casino-gold' : 'text-amber-600'}`}>
                            💰 ₹{game.totalPool}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
                        {formatDate(game.date)} · {game.players.length} players · {game.rounds} rounds
                      </div>
                    </div>
                    <div className={`text-xs flex-shrink-0 ${isDark ? 'text-emerald-600' : 'text-emerald-400'}`}>›</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Player Stats ── */}
        {(() => {
          const playersWithHistory = savedPlayers.filter(name =>
            pastGames.some(g => g.players?.some(p => p.name === name))
          );
          if (playersWithHistory.length === 0) return null;
          return (
            <div className="mt-4">
              <div className={`rounded-2xl overflow-hidden shadow-lg ${isDark ? 'glass border-casino-green-light/30' : 'bg-white border border-emerald-100'} border`}>
                <div className={`px-4 py-3 border-b ${isDark ? 'border-casino-green-light/30 bg-casino-green/60' : 'border-emerald-100 bg-emerald-50'}`}>
                  <h3 className={`text-sm font-black ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>
                    👤 Player Stats
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs font-bold border-b ${isDark ? 'text-emerald-500 border-casino-green-light/20' : 'text-emerald-600 border-emerald-100'}`}>
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-2 py-2">Player</th>
                      <th className="text-center px-1 py-2">Games</th>
                      <th className="text-center px-1 py-2">Won</th>
                      <th className="text-center px-1 py-2">Lost</th>
                      <th className="text-center px-1 py-2">Split</th>
                      <th className="text-center px-1 py-2">Invested</th>
                      <th className="text-center px-1 py-2">Win%</th>
                      <th className="text-right px-3 py-2">Profit</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-casino-green-light/10' : 'divide-emerald-50'}`}>
                    {[...playersWithHistory]
                      .map(name => ({ name, s: computePlayerStats(name, pastGames) }))
                      .sort((a, b) => b.s.winPct - a.s.winPct || b.s.profit - a.s.profit)
                      .map(({ name, s }, idx) => (
                        <tr
                          key={name}
                          onClick={() => setSelectedProfile(name)}
                          className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-casino-green/40 active:bg-casino-green/60' : 'hover:bg-emerald-50 active:bg-emerald-100'}`}
                        >
                          <td className={`px-3 py-2.5 text-xs font-bold ${isDark ? 'text-emerald-600' : 'text-emerald-400'}`}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                          </td>
                          <td className={`px-2 py-2.5 font-bold truncate max-w-[70px] ${isDark ? 'text-white' : 'text-emerald-900'}`}>{name}</td>
                          <td className={`px-1 py-2.5 text-center text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{s.played}</td>
                          <td className={`px-1 py-2.5 text-center text-xs font-bold ${isDark ? 'text-casino-gold' : 'text-amber-600'}`}>{s.wonSolo}</td>
                          <td className={`px-1 py-2.5 text-center text-xs font-bold ${isDark ? 'text-red-400' : 'text-red-500'}`}>{s.lost}</td>
                          <td className={`px-1 py-2.5 text-center text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{s.splitCount}</td>
                          <td className={`px-1 py-2.5 text-center text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
                            {s.invested > 0 ? `₹${s.invested}` : '—'}
                          </td>
                          <td className="px-1 py-2.5 text-center">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full
                              ${s.winPct >= 50
                                ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                : isDark ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                              {s.winPct}%
                            </span>
                          </td>
                          <td className={`px-3 py-2.5 text-right text-xs font-bold
                            ${s.profit > 0 ? 'text-emerald-400' : s.profit < 0 ? 'text-red-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {s.profit === 0 ? '—' : `${s.profit > 0 ? '+' : ''}₹${s.profit}`}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Past game detail modal */}
      {selectedGame && (
        <PastGameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          isDark={isDark}
        />
      )}

      {/* Player profile modal */}
      {selectedProfile && (
        <PlayerProfileModal
          name={selectedProfile}
          pastGames={pastGames}
          onClose={() => setSelectedProfile(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
