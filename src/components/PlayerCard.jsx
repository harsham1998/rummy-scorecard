import { useEffect, useRef, useState } from 'react';

const RANK_BADGES = ['🥇', '🥈', '🥉'];

function AnimatedScore({ score }) {
  const [displayed, setDisplayed] = useState(score);
  const prevScore = useRef(score);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    if (score !== prevScore.current) {
      setPopping(true);
      const timer = setTimeout(() => {
        setDisplayed(score);
        setPopping(false);
        prevScore.current = score;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [score]);

  return (
    <span className={`transition-transform duration-200 inline-block ${popping ? 'animate-score-pop' : ''}`}>
      {displayed}
    </span>
  );
}

export default function PlayerCard({ player, isLeader, theme, onEditName, onRejoin, maxScore, buyInAmount }) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(player.name);
  const inputRef = useRef(null);
  const [shaking, setShaking] = useState(false);

  const isDark = theme === 'dark';
  const invested = buyInAmount ? (player.contributions || 1) * buyInAmount : 0;
  const rejoins = (player.contributions || 1) - 1;

  useEffect(() => {
    if (player.justEliminated) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 700);
      return () => clearTimeout(t);
    }
  }, [player.justEliminated]);

  const handleEditSubmit = () => {
    if (nameInput.trim()) onEditName(player.id, nameInput);
    else setNameInput(player.name);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleEditSubmit();
    if (e.key === 'Escape') { setNameInput(player.name); setEditing(false); }
  };

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const scoreColor = () => {
    if (player.isOut) return isDark ? 'text-red-400' : 'text-red-500';
    if (player.totalScore >= 150) return isDark ? 'text-red-400' : 'text-red-600';
    if (player.totalScore >= 100) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-emerald-300' : 'text-emerald-600';
  };

  const cardBg = () => {
    if (player.isOut) return isDark ? 'bg-gray-800/50 border-gray-600/30' : 'bg-gray-100/80 border-gray-300';
    if (isLeader) return isDark ? 'glass-gold border-casino-gold/40' : 'bg-amber-50/90 border-amber-400';
    return isDark ? 'glass border-white/10' : 'bg-white/90 border-emerald-200';
  };

  const lastScore = player.scores.length > 0 ? player.scores[player.scores.length - 1] : null;

  return (
    <div
      className={`relative rounded-xl border transition-all duration-500 w-full overflow-hidden
        ${cardBg()}
        ${shaking ? 'animate-shake' : ''}
        ${isLeader && !player.isOut ? 'animate-pulse-gold shadow-md shadow-yellow-500/20' : 'shadow-sm'}
        `}
    >
      {/* Leader crown */}
      {isLeader && !player.isOut && (
        <div className="absolute top-1 right-1 text-base leading-none">👑</div>
      )}

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Rank badge */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
          ${player.isOut
            ? isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
            : isDark ? 'bg-casino-green-light text-casino-gold' : 'bg-emerald-100 text-emerald-700'
          }`}>
          {player.isOut ? '💀' : player.rank <= 3 ? RANK_BADGES[player.rank - 1] : `#${player.rank}`}
        </div>

        {/* Name + invested */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={handleKeyDown}
              maxLength={20}
              className={`w-full text-sm font-bold px-1.5 py-0.5 rounded outline-none border
                ${isDark ? 'bg-casino-green text-white border-casino-gold' : 'bg-white text-emerald-900 border-emerald-400'}`}
            />
          ) : (
            <button
              onClick={() => { setEditing(true); setNameInput(player.name); }}
              className={`text-sm font-bold truncate block w-full text-left transition-opacity
                ${player.isOut
                  ? isDark ? 'text-gray-400 line-through' : 'text-gray-500 line-through'
                  : isDark ? 'text-white hover:opacity-80' : 'text-emerald-900 hover:opacity-80'
                }`}
              title="Tap to edit name"
            >
              {player.name}
            </button>
          )}

          {/* Invested amount row */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {invested > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full
                ${isDark ? 'bg-casino-gold/15 text-casino-gold' : 'bg-amber-100 text-amber-700'}`}>
                ₹{invested}
                {rejoins > 0 && <span className="opacity-70 ml-0.5">({rejoins}↩)</span>}
              </span>
            )}
            {lastScore !== null && !player.isOut && (
              <span className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
                +{lastScore === 0 ? '🏆' : lastScore} last
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-xl font-black leading-none ${scoreColor()}`}>
            <AnimatedScore score={player.totalScore} />
          </div>
          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-emerald-600' : 'text-emerald-400'}`}>pts</div>
        </div>
      </div>

      {/* OUT overlay with Rejoin */}
      {player.isOut && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-end pr-2 gap-2 bg-black/50 backdrop-blur-[1px]">
          <span className="bg-red-600 text-white font-black text-xs px-2 py-0.5 rounded-full shadow rotate-[-6deg]">OUT</span>
          {onRejoin && (
            <button
              onClick={(e) => { e.stopPropagation(); onRejoin(player.id); }}
              className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white text-xs font-black px-2.5 py-1 rounded-full shadow transition-all flex items-center gap-1"
              title={`Rejoin at ${maxScore + 1} pts`}
            >
              ↩ Rejoin <span className="opacity-70 font-normal">({maxScore + 1})</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
