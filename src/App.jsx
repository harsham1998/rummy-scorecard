import { useEffect } from 'react';
import GameSetup from './components/GameSetup';
import ScoreBoard from './components/ScoreBoard';
import GameSummary from './components/GameSummary';
import { useGameStore } from './hooks/useGameStore';

export default function App() {
  const {
    gameStarted,
    players,
    rounds,
    gameOver,
    winner,
    theme,
    outThreshold,
    splitResults,
    startGame,
    addRound,
    undoLastRound,
    editPlayerName,
    resetGame,
    toggleTheme,
    getLeader,
    clearEliminated,
    rejoinPlayer,
    endGameWithSplit,
    computeSplit,
    updateBuyIn,
    totalPool,
    buyInAmount,
    pastGames,
    inProgressGames,
    clearHistory,
    loading,
    pauseGame,
    resumeGame,
    voidGame,
    currentTurnPlayerId,
  } = useGameStore();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.style.backgroundColor = theme === 'dark' ? '#07111f' : '#f0f9ff';
  }, [theme]);

  // Loading screen while fetching from Supabase
  if (loading) {
    const isDark = theme === 'dark';
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? 'bg-casino-felt' : 'bg-emerald-50'}`}>
        <div className="text-5xl animate-bounce">🃏</div>
        <div className={`text-lg font-bold ${isDark ? 'text-casino-gold' : 'text-emerald-700'}`}>
          Loading...
        </div>
        <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? 'border-casino-gold' : 'border-emerald-600'}`} />
      </div>
    );
  }

  // Play again with same players, same threshold, same buy-in
  const handlePlayAgain = () => {
    const names = players.map(p => p.name);
    startGame(names, outThreshold, buyInAmount);
  };

  if (!gameStarted) {
    return <GameSetup onStart={startGame} theme={theme} pastGames={pastGames} clearHistory={clearHistory} resumeGame={resumeGame} inProgressGames={inProgressGames} voidGame={voidGame} />;
  }

  if (gameOver && winner) {
    return (
      <GameSummary
        players={players}
        rounds={rounds}
        winner={winner}
        theme={theme}
        onPlayAgain={handlePlayAgain}
        onNewGame={resetGame}
        splitResults={splitResults}
        totalPool={totalPool}
        buyInAmount={buyInAmount}
      />
    );
  }

  return (
    <ScoreBoard
      players={players}
      rounds={rounds}
      theme={theme}
      outThreshold={outThreshold}
      onAddRound={addRound}
      onUndoRound={undoLastRound}
      onResetGame={resetGame}
      onPauseGame={pauseGame}
      onEditName={editPlayerName}
      onToggleTheme={toggleTheme}
      onRejoinPlayer={rejoinPlayer}
      onEndWithSplit={endGameWithSplit}
      computeSplit={computeSplit}
      onUpdateBuyIn={updateBuyIn}
      totalPool={totalPool}
      buyInAmount={buyInAmount}
      getLeader={getLeader}
      clearEliminated={clearEliminated}
      currentTurnPlayerId={currentTurnPlayerId}
    />
  );
}
