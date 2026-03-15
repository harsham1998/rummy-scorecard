import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';

const RANK_EMOJIS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const RANK_LABELS = ['1st Place', '2nd Place', '3rd Place', '4th Place', '5th Place', '6th Place', '7th Place', '8th Place', '9th Place', '10th Place'];

function useConfetti() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Initial burst
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.4 },
      colors: ['#d4af37', '#f0d060', '#ffffff', '#4ade80', '#fbbf24'],
    });

    // Follow-up blasts
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.5 },
        colors: ['#d4af37', '#f0d060', '#ffffff'],
      });
    }, 400);

    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.5 },
        colors: ['#d4af37', '#f0d060', '#ffffff'],
      });
    }, 600);

    // Final shower
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 120,
        origin: { y: 0.2 },
        colors: ['#d4af37', '#f0d060', '#ff6b6b', '#4ade80'],
        gravity: 0.8,
      });
    }, 1200);
  }, []);
}

function PrintableScores({ players, rounds }) {
  return (
    <div id="printable-scores" className="hidden print:block p-8 bg-white">
      <h1 className="text-2xl font-bold text-center mb-2">Indian Rummy - Game Results</h1>
      <p className="text-center text-gray-500 mb-6">{rounds} rounds played</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 px-3 py-2 text-left">Player</th>
            {Array.from({ length: rounds }, (_, i) => (
              <th key={i} className="border border-gray-300 px-3 py-2 text-center">R{i+1}</th>
            ))}
            <th className="border border-gray-300 px-3 py-2 text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id}>
              <td className="border border-gray-300 px-3 py-2 font-medium">{player.name}</td>
              {player.scores.map((s, i) => (
                <td key={i} className="border border-gray-300 px-3 py-2 text-center">{s ?? '—'}</td>
              ))}
              <td className="border border-gray-300 px-3 py-2 text-center font-bold">{player.totalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GameSummary({ players, rounds, winner, theme, onPlayAgain, onNewGame, splitResults, totalPool, buyInAmount }) {
  const isDark = theme === 'dark';
  const [showDetails, setShowDetails] = useState(false);
  useConfetti();

  // Sort players by total score ascending
  const sortedPlayers = [...players].sort((a, b) => a.totalScore - b.totalScore);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const date = new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    const splitLine = (p) => splitResults ? ` → ₹${splitResults[p.id] || 0}` : '';
    const rankings = sortedPlayers
      .map((p, i) => {
        const medal = ['🥇','🥈','🥉'][i] || `${i+1}.`;
        const status = p.isOut ? ' (OUT)' : '';
        return `${medal} ${p.name} – ${p.totalScore} pts${status}${splitLine(p)}`;
      })
      .join('\n');
    const poolLine = totalPool > 0 ? `\n💰 Pool: ₹${totalPool}` : '';
    const splitNote = splitResults ? ' (split agreed)' : '';
    const text = `🃏 Indian Rummy Results – ${date}\n\n🏆 Winner: ${winner?.name} (${winner?.totalScore} pts)\n📊 ${rounds} rounds · Out at ${sortedPlayers.length > 0 ? (sortedPlayers[sortedPlayers.length-1]?.totalScore ?? '') : ''}${poolLine}${splitNote}\n\n${rankings}\n\n🎴 Tracked with Indian Rummy Scorekeeper`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden
      ${isDark ? 'bg-casino-felt' : 'bg-emerald-50'}`}>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {['♠', '♥', '♦', '♣', '🃏', '♠', '♥'].map((suit, i) => (
          <div
            key={i}
            className={`absolute text-6xl opacity-5 ${isDark ? 'text-casino-gold' : 'text-emerald-800'}`}
            style={{
              top: `${Math.random() * 90}%`,
              left: `${Math.random() * 90}%`,
              animation: `float ${3 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            {suit}
          </div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md animate-slideUp">
        {/* Winner announcement */}
        <div className={`text-center mb-6 p-6 rounded-3xl shadow-2xl
          ${isDark ? 'glass-gold animate-winner-pulse' : 'bg-amber-50/90 border-2 border-amber-300 shadow-amber-200'}`}>
          <div className="text-6xl mb-3 animate-bounce">🏆</div>
          <div className={`text-sm font-semibold mb-1 ${isDark ? 'text-casino-gold/70' : 'text-amber-600'}`}>
            WINNER
          </div>
          <h1 className={`text-4xl font-black mb-2 animate-glow ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>
            {winner?.name || 'Unknown'}
          </h1>
          <div className={`text-lg font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
            {winner?.totalScore ?? 0} points
          </div>
          <div className={`text-xs mt-2 ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
            in {rounds} round{rounds !== 1 ? 's' : ''}
          </div>
          {totalPool > 0 && (
            <div className={`mt-3 text-sm font-bold ${isDark ? 'text-casino-gold' : 'text-amber-700'}`}>
              💰 Total Pool: ₹{totalPool}
              {splitResults && <span className="ml-1 text-xs font-normal opacity-70">(split agreed)</span>}
            </div>
          )}
        </div>

        {/* Rankings */}
        <div className={`rounded-2xl overflow-hidden shadow-lg mb-4 ${isDark ? 'glass border-casino-green-light/30' : 'bg-white border border-emerald-100'} border`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-casino-green-light/30 bg-casino-green/60' : 'border-emerald-100 bg-emerald-50'}`}>
            <h2 className={`font-black text-sm ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>
              Final Rankings
            </h2>
            <button
              onClick={() => setShowDetails(v => !v)}
              className={`text-xs font-medium ${isDark ? 'text-emerald-400 hover:text-casino-gold' : 'text-emerald-600 hover:text-emerald-800'}`}
            >
              {showDetails ? 'Hide Details' : 'Show All Rounds'}
            </button>
          </div>

          <div className="divide-y divide-casino-green-light/15">
            {sortedPlayers.map((player, idx) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors animate-fadeIn
                  ${idx === 0
                    ? isDark ? 'bg-casino-gold/10' : 'bg-amber-50'
                    : player.isOut
                      ? isDark ? 'bg-red-900/10' : 'bg-red-50/50'
                      : ''
                  }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Rank */}
                <div className="w-8 text-xl text-center flex-shrink-0">
                  {RANK_EMOJIS[idx]}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm truncate ${
                    idx === 0
                      ? isDark ? 'text-casino-gold' : 'text-amber-700'
                      : player.isOut
                        ? isDark ? 'text-red-400' : 'text-red-500'
                        : isDark ? 'text-white' : 'text-emerald-900'
                  }`}>
                    {player.name}
                    {player.isOut && <span className="ml-2 text-xs">OUT</span>}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>
                    {RANK_LABELS[idx]}
                  </div>
                </div>

                {/* Score + split */}
                <div className="text-right flex-shrink-0">
                  <div className={`text-xl font-black ${
                    idx === 0
                      ? isDark ? 'text-casino-gold' : 'text-amber-600'
                      : player.isOut
                        ? isDark ? 'text-red-400' : 'text-red-500'
                        : isDark ? 'text-emerald-300' : 'text-emerald-700'
                  }`}>
                    {player.totalScore}
                  </div>
                  {splitResults && (
                    <div className={`text-xs font-bold ${splitResults[player.id] > 0 ? (isDark ? 'text-casino-gold' : 'text-amber-600') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                      ₹{splitResults[player.id] || 0}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detailed scores */}
          {showDetails && rounds > 0 && (
            <div className={`border-t overflow-x-auto scrollbar-thin ${isDark ? 'border-casino-green-light/30' : 'border-emerald-100'}`}>
              <table className="w-full text-xs" style={{ minWidth: `${(sortedPlayers.length + 1) * 60}px` }}>
                <thead>
                  <tr className={isDark ? 'bg-casino-green/60' : 'bg-emerald-50'}>
                    <th className={`px-3 py-2 text-left font-bold ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>Round</th>
                    {sortedPlayers.map(p => (
                      <th key={p.id} className={`px-2 py-2 text-center font-bold truncate max-w-[60px] ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                        {p.name.slice(0, 6)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: rounds }, (_, i) => (
                    <tr key={i} className={`border-t ${isDark ? 'border-casino-green-light/15' : 'border-emerald-50'}`}>
                      <td className={`px-3 py-2 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{i + 1}</td>
                      {sortedPlayers.map(p => {
                        const s = p.scores[i];
                        return (
                          <td key={p.id} className={`px-2 py-2 text-center font-medium
                            ${s === null || s === undefined ? isDark ? 'text-gray-600' : 'text-gray-300' :
                              s >= 80 ? 'text-red-400' :
                              s >= 40 ? 'text-yellow-400' :
                              isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
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

        {/* Action buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={onPlayAgain}
            className={`flex-1 py-4 rounded-xl font-black text-base transition-all duration-300 active:scale-95 hover:scale-105 shadow-lg
              ${isDark
                ? 'bg-casino-gold text-casino-felt hover:bg-casino-gold-light shadow-yellow-500/25'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
              }`}
          >
            🔁 Play Again
          </button>
          <button
            onClick={onNewGame}
            className={`flex-1 py-4 rounded-xl font-bold text-base transition-all duration-300 active:scale-95
              ${isDark
                ? 'bg-casino-green-light/60 text-white hover:bg-casino-green-light'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}
          >
            ✨ New Game
          </button>
        </div>

        {/* Print/Export */}
        <button
          onClick={handlePrint}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95
            ${isDark ? 'bg-casino-green/60 text-emerald-300 hover:bg-casino-green border border-casino-green-light/30' : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200'}`}
        >
          🖨️ Print / Export Scores
        </button>

        {/* WhatsApp Share */}
        <button
          onClick={handleShareWhatsApp}
          className="w-full mt-3 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md"
        >
          <span className="flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share on WhatsApp
          </span>
        </button>
      </div>

      {/* Printable version (hidden, shown on print) */}
      <PrintableScores players={sortedPlayers} rounds={rounds} />
    </div>
  );
}
