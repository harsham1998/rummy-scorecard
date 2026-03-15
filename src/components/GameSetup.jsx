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

function PastGameModal({ game, onClose, isDark }) {
  const [showRounds, setShowRounds] = useState(false);
  const sorted = [...game.players].sort((a, b) => a.totalScore - b.totalScore);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slideUp
        ${isDark ? 'bg-casino-felt border border-casino-green-light/30' : 'bg-white border border-emerald-100'}`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b
          ${isDark ? 'border-casino-green-light/30 bg-casino-green/60' : 'border-emerald-100 bg-emerald-50'}`}>
          <div>
            <div className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {formatDate(game.date)}
            </div>
            <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-emerald-900'}`}>
              {game.rounds} rounds · Out at {game.outThreshold} pts
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all active:scale-90
              ${isDark ? 'bg-casino-green-light/40 text-white hover:bg-casino-green-light/60' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
          >
            ×
          </button>
        </div>

        {/* Winner */}
        <div className={`px-4 py-3 flex items-center gap-3 border-b
          ${isDark ? 'bg-casino-gold/10 border-casino-green-light/20' : 'bg-amber-50 border-amber-100'}`}>
          <span className="text-2xl">🏆</span>
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-semibold ${isDark ? 'text-casino-gold/70' : 'text-amber-600'}`}>WINNER</div>
            <div className={`text-lg font-black truncate ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>
              {game.winner?.name}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-xl font-black ${isDark ? 'text-casino-gold' : 'text-amber-600'}`}>
              {game.winner?.totalScore} pts
            </div>
            {game.totalPool > 0 && (
              <div className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                💰 ₹{game.totalPool}
              </div>
            )}
          </div>
        </div>

        {/* Rankings */}
        <div className={`max-h-64 overflow-y-auto divide-y ${isDark ? 'divide-casino-green-light/15' : 'divide-emerald-50'}`}>
          {sorted.map((player, idx) => (
            <div key={player.id} className={`flex items-center gap-3 px-4 py-2.5
              ${idx === 0 ? (isDark ? 'bg-casino-gold/5' : 'bg-amber-50/50') : ''}`}>
              <span className="text-lg w-7 text-center flex-shrink-0">{RANK_EMOJIS[idx] || `#${idx+1}`}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold truncate
                  ${player.isOut
                    ? isDark ? 'text-red-400 line-through' : 'text-red-500 line-through'
                    : idx === 0 ? (isDark ? 'text-casino-gold' : 'text-amber-700')
                    : isDark ? 'text-white' : 'text-emerald-900'
                  }`}>
                  {player.name}
                  {player.isOut && <span className="ml-1 text-xs no-underline" style={{textDecoration:'none'}}> OUT</span>}
                </div>
                {game.buyInAmount > 0 && (
                  <div className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
                    ₹{(player.contributions || 1) * game.buyInAmount} invested
                    {(player.contributions || 1) > 1 && ` · ${(player.contributions||1)-1} rejoin`}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-base font-black
                  ${player.isOut ? (isDark ? 'text-red-400' : 'text-red-500')
                  : idx === 0 ? (isDark ? 'text-casino-gold' : 'text-amber-600')
                  : isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  {player.totalScore}
                </div>
                {game.splitResults && game.splitResults[player.id] != null && (
                  <div className={`text-xs font-bold ${game.splitResults[player.id] > 0 ? (isDark ? 'text-casino-gold' : 'text-amber-600') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                    ₹{game.splitResults[player.id]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Round details toggle */}
        {game.rounds > 0 && (
          <div className={`border-t ${isDark ? 'border-casino-green-light/20' : 'border-emerald-100'}`}>
            <button
              onClick={() => setShowRounds(v => !v)}
              className={`w-full py-2 text-xs font-semibold transition-colors
                ${isDark ? 'text-emerald-400 hover:text-casino-gold' : 'text-emerald-600 hover:text-emerald-800'}`}
            >
              {showRounds ? '▲ Hide round scores' : '▼ Show round scores'}
            </button>
            {showRounds && (
              <div className={`overflow-x-auto border-t ${isDark ? 'border-casino-green-light/20' : 'border-emerald-100'}`}>
                <table className="w-full text-xs" style={{ minWidth: `${(sorted.length + 1) * 55}px` }}>
                  <thead>
                    <tr className={isDark ? 'bg-casino-green/60' : 'bg-emerald-50'}>
                      <th className={`px-3 py-1.5 text-left font-bold ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>Rnd</th>
                      {sorted.map(p => (
                        <th key={p.id} className={`px-2 py-1.5 text-center font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                          {p.name.slice(0, 5)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: game.rounds }, (_, i) => (
                      <tr key={i} className={`border-t ${isDark ? 'border-casino-green-light/15' : 'border-emerald-50'}`}>
                        <td className={`px-3 py-1 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{i + 1}</td>
                        {sorted.map(p => {
                          const s = p.scores[i];
                          return (
                            <td key={p.id} className={`px-2 py-1 text-center font-medium
                              ${s == null ? isDark ? 'text-gray-600' : 'text-gray-300'
                              : s >= 80 ? 'text-red-400'
                              : s >= 40 ? 'text-yellow-400'
                              : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              {s ?? '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GameSetup({ onStart, theme, pastGames = [], clearHistory, resumeGame, pausedPlayers = [], pausedRounds = 0 }) {
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

        {/* ── In-Progress Game Resume Card ── */}
        {pausedPlayers.length >= 2 && pausedRounds > 0 && (
          <div className={`mb-4 rounded-2xl p-4 border-2 animate-slideDown flex items-center gap-4
            ${isDark ? 'bg-casino-gold/10 border-casino-gold/40' : 'bg-amber-50 border-amber-300'}`}>
            <div className="text-3xl flex-shrink-0">⏸️</div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-black ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>
                Game In Progress
              </div>
              <div className={`text-xs mt-0.5 truncate ${isDark ? 'text-emerald-400' : 'text-amber-600'}`}>
                Round {pausedRounds} · {pausedPlayers.map(p => p.name).join(', ')}
              </div>
            </div>
            <button
              onClick={resumeGame}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-black text-sm transition-all active:scale-95 shadow-md
                ${isDark ? 'bg-casino-gold text-casino-felt hover:bg-casino-gold-light' : 'bg-amber-500 text-white hover:bg-amber-400'}`}
            >
              ▶ Resume
            </button>
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
                {pastGames.map((game) => (
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
      </div>

      {/* Past game detail modal */}
      {selectedGame && (
        <PastGameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
}
