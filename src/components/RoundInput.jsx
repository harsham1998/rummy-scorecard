import { useState } from 'react';

// Card value reference for manual counting
const CARD_VALUES = [
  { label: 'A', value: 10 },
  { label: 'K', value: 10 },
  { label: 'Q', value: 10 },
  { label: 'J', value: 10 },
  { label: '10', value: 10 },
  { label: '9', value: 9 },
  { label: '8', value: 8 },
  { label: '7', value: 7 },
  { label: '6', value: 6 },
  { label: '5', value: 5 },
  { label: '4', value: 4 },
  { label: '3', value: 3 },
  { label: '2', value: 2 },
];

function getScoreOptions(outThreshold) {
  const maxPenalty = Math.min(80, outThreshold - 1);
  return [
    {
      id: 'won',
      label: 'Won',
      sublabel: 'Declared!',
      value: 0,
      emoji: '🏆',
      colorClass: {
        selected: 'bg-emerald-500 border-emerald-400 text-white',
        default: 'bg-emerald-900/30 border-emerald-700/60 text-emerald-400 hover:bg-emerald-800/40',
        selectedLight: 'bg-emerald-500 border-emerald-500 text-white',
        defaultLight: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100',
      },
      fullWidth: true,
    },
    {
      id: 'drop',
      label: 'Drop',
      sublabel: 'First drop',
      value: 20,
      emoji: '🏃',
      colorClass: {
        selected: 'bg-blue-500 border-blue-400 text-white',
        default: 'bg-blue-900/30 border-blue-700/60 text-blue-400 hover:bg-blue-800/40',
        selectedLight: 'bg-blue-500 border-blue-500 text-white',
        defaultLight: 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100',
      },
    },
    {
      id: 'middrop',
      label: 'Mid Drop',
      sublabel: 'After pick',
      value: 40,
      emoji: '⚠️',
      colorClass: {
        selected: 'bg-yellow-500 border-yellow-400 text-white',
        default: 'bg-yellow-900/30 border-yellow-700/60 text-yellow-400 hover:bg-yellow-800/40',
        selectedLight: 'bg-yellow-500 border-yellow-500 text-white',
        defaultLight: 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100',
      },
    },
    {
      id: 'fullcount',
      label: 'Full Count',
      sublabel: `Max ${maxPenalty}`,
      value: maxPenalty,
      emoji: '💀',
      colorClass: {
        selected: 'bg-red-600 border-red-500 text-white',
        default: 'bg-red-900/30 border-red-700/60 text-red-400 hover:bg-red-900/40',
        selectedLight: 'bg-red-600 border-red-600 text-white',
        defaultLight: 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100',
      },
    },
    {
      id: 'wrongdecl',
      label: 'Wrong Decl.',
      sublabel: '80 pt penalty',
      value: 80,
      emoji: '❌',
      colorClass: {
        selected: 'bg-red-700 border-red-600 text-white',
        default: 'bg-red-900/20 border-red-800/60 text-red-500 hover:bg-red-900/30',
        selectedLight: 'bg-red-700 border-red-700 text-white',
        defaultLight: 'bg-red-100 border-red-400 text-red-800 hover:bg-red-200',
      },
    },
  ];
}

function PlayerScoreInput({ player, score, scoreOptionId, onChange, isDark, outThreshold }) {
  const [showCalc, setShowCalc] = useState(false);
  const [calcTotal, setCalcTotal] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [activeOptionId, setActiveOptionId] = useState(scoreOptionId);

  const maxManual = Math.min(79, outThreshold - 1);
  const options = getScoreOptions(outThreshold);
  const ptsRemaining = outThreshold - player.totalScore;
  const noDropAllowed = ptsRemaining < 20;  // drop (20pts) would eliminate them
  const isInDanger = ptsRemaining <= 20;
  const isVeryCritical = ptsRemaining <= 10;

  const handleOptionClick = (opt) => {
    setActiveOptionId(opt.id);
    setManualInput('');
    setCalcTotal(0);
    setShowCalc(false);
    onChange(opt.value, opt.id);
  };

  const handleManualChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    // Hard cap at 79 — don't accept anything higher
    if (raw !== '' && parseInt(raw, 10) > 79) return;
    setManualInput(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      const clamped = Math.min(79, Math.max(1, num));
      setActiveOptionId('manual');
      onChange(clamped, 'manual');
    } else {
      setActiveOptionId(null);
      onChange(null, null);
    }
  };

  const handleCalcAdd = (cardValue) => {
    const newTotal = Math.min(maxManual, calcTotal + cardValue);
    setCalcTotal(newTotal);
    setManualInput(String(newTotal));
    setActiveOptionId('manual');
    onChange(newTotal, 'manual');
  };

  const handleCalcReset = () => {
    setCalcTotal(0);
    setManualInput('');
    setActiveOptionId(null);
    onChange(null, null);
  };

  const scoreDisplayColor = () => {
    if (score === null) return isDark ? 'text-gray-500' : 'text-gray-400';
    if (score === 0) return isDark ? 'text-emerald-400 font-black' : 'text-emerald-600 font-black';
    if (score >= 80) return isDark ? 'text-red-400 font-black' : 'text-red-600 font-black';
    if (score >= 40) return isDark ? 'text-yellow-400 font-bold' : 'text-yellow-600 font-bold';
    if (score >= 20) return isDark ? 'text-blue-400' : 'text-blue-600';
    return isDark ? 'text-emerald-300' : 'text-emerald-700';
  };

  return (
    <div className={`rounded-xl border-2 transition-all duration-200 overflow-hidden
      ${score !== null
        ? isDark ? 'border-casino-green-light/60 bg-casino-green/30' : 'border-emerald-300 bg-white'
        : isDark ? 'border-casino-green-light/30 bg-casino-green/20' : 'border-emerald-100 bg-white'
      }`}
    >
      {/* Player header + score — single compact row */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
          ${isDark ? 'bg-casino-green-light text-casino-gold' : 'bg-emerald-100 text-emerald-700'}`}>
          {player.name[0].toUpperCase()}
        </div>
        <span className={`font-black text-sm truncate flex-1 min-w-0 ${isDark ? 'text-white' : 'text-emerald-900'}`}>
          {player.name}
        </span>
        <span className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-500'} flex-shrink-0`}>
          <span className={`font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{player.totalScore}</span>
          <span className={`ml-1 ${isVeryCritical ? 'text-red-400 animate-pulse' : isInDanger ? 'text-orange-400' : ''}`}>
            ({ptsRemaining} left)
          </span>
        </span>
        {score !== null && (
          <span className={`text-sm font-black flex-shrink-0 ${scoreDisplayColor()}`}>
            {score === 0 ? '🏆 0' : `+${score}`}
          </span>
        )}
      </div>

      {/* No Drop warning */}
      {noDropAllowed && (
        <div className={`mx-2 mb-1.5 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold
          ${isDark ? 'bg-orange-900/40 border border-orange-700/60 text-orange-300' : 'bg-orange-50 border border-orange-300 text-orange-700'}`}>
          <span>⛔</span>
          <span>No Drop — only {ptsRemaining} pts left, drop would eliminate!</span>
        </div>
      )}

      {/* All 5 options in one row */}
      <div className="flex gap-1 px-2 pb-2">
        {options.map(opt => {
          const isSelected = activeOptionId === opt.id;
          const isDropDisabled = noDropAllowed && opt.id === 'drop';
          return (
            <button
              key={opt.id}
              onClick={() => { if (!isDropDisabled) handleOptionClick(opt); }}
              disabled={isDropDisabled}
              title={isDropDisabled ? `No Drop — only ${ptsRemaining} pts remaining` : undefined}
              className={`flex-1 py-1.5 rounded-lg border-2 font-bold transition-all duration-150 flex flex-col items-center leading-tight
                ${isDropDisabled
                  ? 'opacity-30 cursor-not-allowed border-gray-600/40 ' + (isDark ? 'bg-gray-800/40 text-gray-600' : 'bg-gray-100 text-gray-400')
                  : isSelected
                    ? isDark ? opt.colorClass.selected : opt.colorClass.selectedLight
                    : isDark ? opt.colorClass.default : opt.colorClass.defaultLight
                }
                ${isSelected && !isDropDisabled ? 'shadow-md scale-[1.04] active:scale-95' : !isDropDisabled ? 'active:scale-95' : ''}`}
            >
              <span className="text-xs">{isDropDisabled ? '🚫' : opt.emoji}</span>
              <span className="text-[10px] font-semibold leading-none mt-0.5 truncate w-full text-center px-0.5">
                {isDropDisabled ? 'No Drop' : opt.label}
              </span>
              <span className="text-xs font-black">{opt.value}</span>
            </button>
          );
        })}
      </div>

      {/* Manual count + card calc — collapsible */}
      <div className={`px-2 pb-2`}>
        <div className={`rounded-lg border flex items-center gap-1.5 px-2 py-1
          ${isDark ? 'border-casino-green-light/40 bg-casino-felt/60' : 'border-emerald-200 bg-gray-50'}`}>
          <span className={`text-xs font-semibold flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
            Count:
          </span>
          <input
            type="number"
            min="1"
            max="79"
            placeholder="1–79"
            value={manualInput}
            onChange={handleManualChange}
            onWheel={e => e.target.blur()}
            onTouchMove={e => e.stopPropagation()}
            className={`flex-1 min-w-0 px-1.5 py-1 rounded text-sm font-bold outline-none bg-transparent transition-all
              ${isDark ? 'text-white placeholder-emerald-700' : 'text-emerald-900 placeholder-emerald-300'}
              ${activeOptionId === 'manual' ? (isDark ? 'text-casino-gold' : 'text-emerald-700') : ''}`}
          />
          {activeOptionId === 'manual' && manualInput && (
            <button
              onClick={() => { setActiveOptionId(null); setManualInput(''); setCalcTotal(0); onChange(null, null); }}
              className={`text-base leading-none flex-shrink-0 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >×</button>
          )}
          <button
            onClick={() => setShowCalc(v => !v)}
            className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded transition-all active:scale-95
              ${showCalc
                ? isDark ? 'bg-casino-gold/20 text-casino-gold' : 'bg-emerald-200 text-emerald-800'
                : isDark ? 'bg-casino-green-light/40 text-emerald-300' : 'bg-emerald-100 text-emerald-600'
              }`}
          >
            🃏
          </button>
        </div>

        {/* Card calculator */}
        {showCalc && (
          <div className={`mt-1.5 rounded-lg border p-2 animate-slideUp
            ${isDark ? 'border-casino-green-light/30 bg-casino-felt/40' : 'border-emerald-100 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Tap to add (A/J/Q/K=10)
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black ${calcTotal > 0 ? (isDark ? 'text-casino-gold' : 'text-emerald-700') : (isDark ? 'text-gray-600' : 'text-gray-400')}`}>
                  = {calcTotal}
                </span>
                {calcTotal > 0 && (
                  <button onClick={handleCalcReset} className="text-xs text-red-400 hover:text-red-500 font-semibold">
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {CARD_VALUES.map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => handleCalcAdd(value)}
                  className={`w-9 h-8 rounded border font-bold text-xs transition-all active:scale-90
                    ${isDark
                      ? 'bg-casino-green/60 border-casino-green-light/50 text-white hover:bg-casino-gold/20 hover:text-casino-gold'
                      : 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoundInput({ players, roundNumber, onSubmit, onCancel, theme, outThreshold = 80 }) {
  const isDark = theme === 'dark';
  const activePlayers = players.filter(p => !p.isOut);
  const [scores, setScores] = useState(() =>
    Object.fromEntries(activePlayers.map(p => [p.id, null]))
  );
  const [scoreOptionIds, setScoreOptionIds] = useState(() =>
    Object.fromEntries(activePlayers.map(p => [p.id, null]))
  );

  const handleScoreChange = (playerId, value, optionId) => {
    setScores(prev => ({ ...prev, [playerId]: value }));
    setScoreOptionIds(prev => ({ ...prev, [playerId]: optionId }));
  };

  const allFilled = activePlayers.every(p => scores[p.id] !== null && scores[p.id] !== undefined);
  const filledCount = activePlayers.filter(p => scores[p.id] !== null && scores[p.id] !== undefined).length;

  const handleSubmit = () => {
    if (!allFilled) return;
    onSubmit(scores);
  };

  const handleSetAll = (value, optionId) => {
    const newScores = {};
    const newOptionIds = {};
    activePlayers.forEach(p => {
      newScores[p.id] = value;
      newOptionIds[p.id] = optionId;
    });
    setScores(prev => ({ ...prev, ...newScores }));
    setScoreOptionIds(prev => ({ ...prev, ...newOptionIds }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-lg mx-2 md:mx-4 rounded-t-3xl md:rounded-3xl shadow-2xl animate-slideUp max-h-[92vh] flex flex-col
        ${isDark ? 'bg-casino-felt border border-casino-green-light/50' : 'bg-gray-50 border border-emerald-200'}`}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-casino-green-light/60' : 'bg-gray-300'}`} />
        </div>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 pt-3 pb-4 border-b flex-shrink-0
          ${isDark ? 'border-casino-green-light/40' : 'border-emerald-200'}`}>
          <div>
            <h2 className={`text-lg font-black ${isDark ? 'text-casino-gold' : 'text-emerald-800'}`}>
              Round {roundNumber}
            </h2>
            <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>
              {filledCount}/{activePlayers.length} players scored
              {allFilled && <span className="ml-1 text-emerald-400">✓ Ready</span>}
            </p>
          </div>
          {/* Quick actions */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handleSetAll(20, 'drop')}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all active:scale-95 border
                ${isDark
                  ? 'bg-blue-900/40 text-blue-400 border-blue-800/60 hover:bg-blue-800/50'
                  : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}
            >
              All Drop
            </button>
            <button
              onClick={onCancel}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all active:scale-90
                ${isDark ? 'bg-casino-green-light/60 text-white hover:bg-casino-green-light' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            >
              ×
            </button>
          </div>
        </div>

        {/* Player score inputs - scrollable */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          {activePlayers.map(player => (
            <PlayerScoreInput
              key={player.id}
              player={player}
              score={scores[player.id]}
              scoreOptionId={scoreOptionIds[player.id]}
              onChange={(val, optId) => handleScoreChange(player.id, val, optId)}
              isDark={isDark}
              outThreshold={outThreshold}
            />
          ))}
          {/* Bottom padding for submit button */}
          <div className="h-2" />
        </div>

        {/* Footer */}
        <div className={`px-4 pb-5 pt-3 border-t flex-shrink-0 safe-bottom
          ${isDark ? 'border-casino-green-light/40' : 'border-emerald-200'}`}>

          {/* Progress bar */}
          <div className={`w-full h-1.5 rounded-full mb-3 overflow-hidden ${isDark ? 'bg-casino-green-light/30' : 'bg-emerald-100'}`}>
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(filledCount / activePlayers.length) * 100}%` }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!allFilled}
            className={`w-full py-4 rounded-xl font-black text-base transition-all duration-300 active:scale-95
              ${allFilled
                ? isDark
                  ? 'bg-casino-gold text-casino-felt hover:bg-casino-gold-light hover:scale-105 shadow-lg shadow-yellow-500/25'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 shadow-lg shadow-emerald-200'
                : isDark
                  ? 'bg-casino-green-light/30 text-emerald-600 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            {allFilled
              ? `✅ Submit Round ${roundNumber}`
              : `${activePlayers.length - filledCount} player${activePlayers.length - filledCount !== 1 ? 's' : ''} remaining…`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
