import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const createInitialState = () => ({
  gameStarted: false,
  players: [],
  rounds: 0,
  gameOver: false,
  winner: null,
  theme: 'dark',
  outThreshold: 80,
  buyInAmount: 0,
  splitResults: null,
  roundHistory: [],
  playerSequence: [],
  currentTurnPlayerId: null,
});

const computeRankings = (players) => {
  const activePlayers = players.filter(p => !p.isOut);
  const sorted = [...activePlayers].sort((a, b) => a.totalScore - b.totalScore);
  return players.map(player => {
    if (player.isOut) return { ...player, rank: null };
    const rank = sorted.findIndex(p => p.id === player.id) + 1;
    return { ...player, rank };
  });
};

const computePool = (s) =>
  (s.buyInAmount || 0) * s.players.reduce((sum, p) => sum + (p.contributions || 1), 0);

const rowToEntry = (row) => ({
  id: row.id,
  date: row.created_at,
  winner: row.state?.winner,
  players: row.state?.players || [],
  rounds: row.rounds,
  outThreshold: row.out_threshold,
  buyInAmount: row.buy_in_amount,
  totalPool: row.total_pool,
  splitResults: row.split_results,
});

const rowToInProgress = (row) => ({
  id: row.id,
  date: row.updated_at || row.created_at,
  players: row.state?.players || [],
  rounds: row.rounds || 0,
  outThreshold: row.out_threshold,
  buyInAmount: row.buy_in_amount,
  state: row.state,
});

export const useGameStore = () => {
  const [state, setState] = useState(createInitialState());
  const [pastGames, setPastGames] = useState([]);
  const [inProgressGames, setInProgressGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Refs to avoid stale closures and skip saves triggered by remote loads
  const sessionIdRef = useRef(null);
  const pendingSave = useRef(null);

  // ── On mount: load active game + history, subscribe to realtime ──
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch all in-progress (incomplete) sessions
        const { data: inProgress } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('is_completed', false)
          .order('updated_at', { ascending: false });

        if (inProgress?.length) {
          setInProgressGames(inProgress.map(rowToInProgress));
          // Restore theme from most recent session
          const savedTheme = inProgress[0].state?.theme;
          if (savedTheme) setState(prev => ({ ...prev, theme: savedTheme }));
        }

        // Fetch completed game history
        const { data: history } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('is_completed', true)
          .order('created_at', { ascending: false })
          .limit(30);

        if (history) setPastGames(history.map(rowToEntry));
      } catch (e) {
        console.error('Failed to load from Supabase:', e);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Realtime: keep history list in sync across devices
    const channel = supabase
      .channel('game_sessions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setPastGames(prev => prev.filter(g => g.id !== payload.old.id));
          setInProgressGames(prev => prev.filter(g => g.id !== payload.old.id));
          return;
        }
        const row = payload.new;
        if (row.is_completed) {
          const entry = rowToEntry(row);
          setPastGames(prev => {
            const idx = prev.findIndex(g => g.id === entry.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = entry;
              return updated;
            }
            return [entry, ...prev].slice(0, 30);
          });
          setInProgressGames(prev => prev.filter(g => g.id !== row.id));
        } else {
          const inProg = rowToInProgress(row);
          setInProgressGames(prev => {
            const idx = prev.findIndex(g => g.id === inProg.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = inProg;
              return updated;
            }
            return [inProg, ...prev];
          });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ── Save to Supabase after every state change from a user action ──
  useEffect(() => {
    if (!pendingSave.current || !sessionIdRef.current) return;
    const toSave = pendingSave.current;
    pendingSave.current = null;

    const pool = computePool(toSave);
    supabase
      .from('game_sessions')
      .update({
        state: toSave,
        updated_at: new Date().toISOString(),
        rounds: toSave.rounds,
        is_completed: toSave.gameOver,
        winner_name: toSave.winner?.name || null,
        total_pool: pool,
        split_results: toSave.splitResults || null,
      })
      .eq('id', sessionIdRef.current)
      .then(({ error }) => {
        if (error) console.error('Supabase save failed:', error);
      });
  }, [state]);

  // updateState: all in-game mutations go through here → triggers save
  const updateState = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      pendingSave.current = next;
      return next;
    });
  }, []);

  // ── Actions ──

  const startGame = useCallback((playerNames, outThreshold = 80, buyInAmount = 0) => {
    const players = playerNames.map((name, idx) => ({
      id: idx + 1,
      name: name.trim() || `Player ${idx + 1}`,
      scores: [],
      totalScore: 0,
      isOut: false,
      rank: idx + 1,
      justEliminated: false,
      scoreAdjustment: 0,
      rejoinedAtRounds: [],
      contributions: 1,
    }));

    const sequence = players.map(p => p.id);
    const newState = {
      gameStarted: true,
      players: computeRankings(players),
      rounds: 0,
      gameOver: false,
      winner: null,
      theme: state.theme,
      outThreshold: Number(outThreshold) || 80,
      buyInAmount: Number(buyInAmount) || 0,
      splitResults: null,
      roundHistory: [],
      playerSequence: sequence,
      currentTurnPlayerId: sequence[0] || null,
    };

    setState(newState); // direct setState — does NOT trigger pendingSave

    supabase
      .from('game_sessions')
      .insert({
        state: newState,
        is_completed: false,
        rounds: 0,
        out_threshold: Number(outThreshold) || 80,
        buy_in_amount: Number(buyInAmount) || 0,
        total_pool: 0,
      })
      .select('id')
      .single()
      .then(({ data, error }) => {
        if (data) sessionIdRef.current = data.id;
        if (error) console.error('Failed to create game session:', error);
      });

    // Upsert player names into players table
    players.forEach(p => {
      supabase
        .from('players')
        .upsert({ name: p.name }, { onConflict: 'name', ignoreDuplicates: true })
        .then();
    });
  }, [state.theme]);

  const addRound = useCallback((roundScores) => {
    updateState(prev => {
      if (prev.gameOver) return prev;
      const threshold = prev.outThreshold || 80;

      const newPlayers = prev.players.map(player => {
        const score = roundScores[player.id] ?? 0;
        const newTotal = player.totalScore + (player.isOut ? 0 : score);
        const newScores = [...player.scores, player.isOut ? null : score];
        const wasOut = player.isOut;
        const nowOut = newTotal >= threshold;
        return {
          ...player,
          scores: newScores,
          totalScore: wasOut ? player.totalScore : newTotal,
          isOut: wasOut || nowOut,
          justEliminated: !wasOut && nowOut,
        };
      });

      const ranked = computeRankings(newPlayers);
      const activePlayers = ranked.filter(p => !p.isOut);
      const gameOver = activePlayers.length <= 1;
      const winner = gameOver
        ? (activePlayers.length === 1
          ? activePlayers[0]
          : [...ranked].sort((a, b) => a.totalScore - b.totalScore)[0])
        : null;

      // Advance turn to next active player in sequence
      const seq = prev.playerSequence?.length ? prev.playerSequence : ranked.map(p => p.id);
      const activeIds = new Set(activePlayers.map(p => p.id));
      const curIdx = seq.indexOf(prev.currentTurnPlayerId);
      let nextTurnId = prev.currentTurnPlayerId;
      for (let i = 1; i <= seq.length; i++) {
        const cand = seq[(curIdx + i) % seq.length];
        if (activeIds.has(cand)) { nextTurnId = cand; break; }
      }

      return {
        ...prev,
        players: ranked,
        rounds: prev.rounds + 1,
        gameOver,
        winner,
        roundHistory: [...prev.roundHistory, roundScores],
        playerSequence: seq,
        currentTurnPlayerId: gameOver ? prev.currentTurnPlayerId : nextTurnId,
      };
    });
  }, [updateState]);

  const undoLastRound = useCallback(() => {
    updateState(prev => {
      if (prev.rounds === 0 || prev.roundHistory.length === 0) return prev;
      const threshold = prev.outThreshold || 80;
      const newPlayers = prev.players.map(player => {
        const newScores = player.scores.slice(0, -1);
        const newTotal = newScores.reduce((sum, s) => sum + (s ?? 0), 0) + (player.scoreAdjustment || 0);
        return { ...player, scores: newScores, totalScore: newTotal, isOut: newTotal >= threshold, justEliminated: false };
      });
      return {
        ...prev,
        players: computeRankings(newPlayers),
        rounds: prev.rounds - 1,
        gameOver: false,
        winner: null,
        roundHistory: prev.roundHistory.slice(0, -1),
      };
    });
  }, [updateState]);

  const editPlayerName = useCallback((playerId, newName) => {
    updateState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === playerId ? { ...p, name: newName.trim() || p.name } : p),
    }));
  }, [updateState]);

  const resetGame = useCallback(() => {
    if (sessionIdRef.current && !state.gameOver) {
      // Only delete if game is still in progress (not completed — completed games stay in history)
      supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionIdRef.current)
        .then(({ error }) => { if (error) console.error('Failed to delete session:', error); });
    }
    sessionIdRef.current = null;
    setState(prev => ({ ...createInitialState(), theme: prev.theme }));
  }, [state.gameOver]);

  const voidGame = useCallback(async (sessionId) => {
    const { error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('id', sessionId);
    if (!error) {
      setInProgressGames(prev => prev.filter(g => g.id !== sessionId));
    }
  }, []);

  const rejoinPlayer = useCallback((playerId) => {
    updateState(prev => {
      const player = prev.players.find(p => p.id === playerId);
      if (!player || !player.isOut) return prev;
      const activePlayers = prev.players.filter(p => !p.isOut);
      const maxScore = activePlayers.length > 0
        ? Math.max(...activePlayers.map(p => p.totalScore))
        : Math.max(...prev.players.map(p => p.totalScore));
      const newTotal = maxScore + 1;
      const adjustment = newTotal - player.totalScore;
      const newPlayers = prev.players.map(p => p.id !== playerId ? p : {
        ...p,
        isOut: false,
        totalScore: newTotal,
        scoreAdjustment: (p.scoreAdjustment || 0) + adjustment,
        rejoinedAtRounds: [...(p.rejoinedAtRounds || []), prev.rounds],
        justEliminated: false,
        contributions: (p.contributions || 1) + 1,
      });
      return { ...prev, players: computeRankings(newPlayers), gameOver: false, winner: null };
    });
  }, [updateState]);

  const updateBuyIn = useCallback((amount) => {
    updateState(prev => ({ ...prev, buyInAmount: Number(amount) || 0 }));
  }, [updateState]);

  const endGameWithSplit = useCallback((splitAmounts) => {
    updateState(prev => {
      const active = prev.players.filter(p => !p.isOut);
      const winner = active.length > 0
        ? active.reduce((min, p) => p.totalScore < min.totalScore ? p : min, active[0])
        : [...prev.players].sort((a, b) => a.totalScore - b.totalScore)[0];
      return { ...prev, gameOver: true, winner, splitResults: splitAmounts };
    });
  }, [updateState]);

  const toggleTheme = useCallback(() => {
    updateState(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  }, [updateState]);

  const getLeader = useCallback(() => {
    const active = state.players.filter(p => !p.isOut);
    if (active.length === 0) return null;
    return active.reduce((min, p) => p.totalScore < min.totalScore ? p : min, active[0]);
  }, [state.players]);

  const clearEliminated = useCallback((playerId) => {
    updateState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === playerId ? { ...p, justEliminated: false } : p),
    }));
  }, [updateState]);

  const pauseGame = useCallback(() => {
    updateState(prev => ({ ...prev, gameStarted: false }));
    // Refresh in-progress list after Supabase save settles
    setTimeout(async () => {
      const { data } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('is_completed', false)
        .order('updated_at', { ascending: false });
      if (data) setInProgressGames(data.map(rowToInProgress));
    }, 600);
  }, [updateState]);

  const resumeGame = useCallback(async (sessionId) => {
    const { data } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (!data?.state) return;
    sessionIdRef.current = data.id;
    setState({ ...data.state, gameStarted: true });
  }, []);

  const clearHistory = useCallback(async () => {
    const { error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('is_completed', true);
    if (!error) setPastGames([]);
    else console.error('Failed to clear history:', error);
  }, []);

  const computeSplit = useCallback(() => {
    const threshold = state.outThreshold || 80;
    const buyIn = state.buyInAmount || 0;
    const pool = buyIn * state.players.reduce((sum, p) => sum + (p.contributions || 1), 0);
    const active = state.players.filter(p => !p.isOut);
    const splits = {};
    state.players.forEach(p => { splits[p.id] = 0; });
    if (active.length === 0) return splits;

    const dropChancesMap = {};
    active.forEach(p => {
      dropChancesMap[p.id] = Math.floor(Math.max(0, threshold - p.totalScore) / 20);
    });
    if (pool === 0) return splits;

    const maxDrops = Math.max(...active.map(p => dropChancesMap[p.id]));
    const topGroup = active.filter(p => dropChancesMap[p.id] === maxDrops);
    const totalPremium = Math.min(pool, maxDrops * buyIn * topGroup.length);
    const premiumPerTopPlayer = Math.floor(totalPremium / topGroup.length);
    const remaining = pool - totalPremium;
    const equalBase = Math.floor(remaining / active.length);

    active.forEach(p => { splits[p.id] = equalBase; });
    topGroup.forEach((p, i) => {
      splits[p.id] += i === topGroup.length - 1
        ? totalPremium - premiumPerTopPlayer * (topGroup.length - 1)
        : premiumPerTopPlayer;
    });

    const baseRemainder = remaining - equalBase * active.length;
    if (baseRemainder > 0) {
      const leader = active.reduce((min, p) => p.totalScore < min.totalScore ? p : min, active[0]);
      splits[leader.id] += baseRemainder;
    }
    return splits;
  }, [state.players, state.outThreshold, state.buyInAmount]);

  const totalPool = computePool(state);

  return {
    ...state,
    outThreshold: state.outThreshold || 80,
    buyInAmount: state.buyInAmount || 0,
    totalPool,
    loading,
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
    pastGames,
    inProgressGames,
    clearHistory,
    pauseGame,
    resumeGame,
    voidGame,
  };
};
