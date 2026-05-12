const ApiSync = (() => {

  const cache = {
    fixturesByDate: {},
    stats: {},
    events: {}
  };

  const getHeaders = () => {
    const key = Storage.getSettings().apiFootballKey;
    if (!key) throw new Error('API Key não configurada');
    return {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': key
    };
  };

  const fetchWithCache = async (url, cacheDict, cacheKey) => {
    if (cacheDict[cacheKey]) return cacheDict[cacheKey];
    const res = await fetch(url, { method: 'GET', headers: getHeaders() });
    const data = await res.json();
    if (data.errors && Object.keys(data.errors).length > 0) {
      throw new Error(Object.values(data.errors)[0]);
    }
    cacheDict[cacheKey] = data.response || [];
    return cacheDict[cacheKey];
  };

  const fetchFixturesByDate = (dateStr) => {
    return fetchWithCache(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, cache.fixturesByDate, dateStr);
  };

  const fetchStatistics = (fixtureId) => {
    return fetchWithCache(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`, cache.stats, fixtureId);
  };

  const fetchEvents = (fixtureId) => {
    return fetchWithCache(`https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`, cache.events, fixtureId);
  };

  const normalizeString = (str) => {
    return str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") : '';
  };

  const matchEventWithFixture = (eventStr, fixtures) => {
    const evNorm = normalizeString(eventStr);
    
    for (const f of fixtures) {
      const homeNorm = normalizeString(f.teams.home.name);
      const awayNorm = normalizeString(f.teams.away.name);
      
      if (evNorm.includes(homeNorm) || evNorm.includes(awayNorm)) {
        if (evNorm.includes(homeNorm) && evNorm.includes(awayNorm)) {
          return f;
        }
      }
    }
    
    for (const f of fixtures) {
      const homeNorm = normalizeString(f.teams.home.name);
      const awayNorm = normalizeString(f.teams.away.name);
      if (homeNorm.length > 3 && evNorm.includes(homeNorm)) return f;
      if (awayNorm.length > 3 && evNorm.includes(awayNorm)) return f;
    }
    return null;
  };

  const resolveBet = async (bet, fixture) => {
    const status = fixture.fixture.status.short;
    if (!['FT', 'AET', 'PEN'].includes(status)) return null;

    const homeG = fixture.goals.home;
    const awayG = fixture.goals.away;
    if (homeG === null || awayG === null) return null;

    const totalG = homeG + awayG;
    const isHomeWin = homeG > awayG;
    const isAwayWin = awayG > homeG;
    const isDraw = homeG === awayG;
    const btts = homeG > 0 && awayG > 0;

    const m = bet.market || '';
    const mNorm = m.toLowerCase();
    const pickNorm = normalizeString(bet.pick);
    const homeNorm = normalizeString(fixture.teams.home.name);
    const awayNorm = normalizeString(fixture.teams.away.name);

    // 1. RESULTADO FINAL / VENCEDOR
    if (mNorm.includes('resultado final') || mNorm.includes('vencedor')) {
      if (!bet.pick) return null; 
      
      if (pickNorm.includes('empate') || pickNorm === 'x' || pickNorm === 'draw') {
        return isDraw ? 'won' : 'lost';
      }
      if (isHomeWin) {
        if (homeNorm.includes(pickNorm) || pickNorm.includes(homeNorm)) return 'won';
        return 'lost';
      }
      if (isAwayWin) {
        if (awayNorm.includes(pickNorm) || pickNorm.includes(awayNorm)) return 'won';
        return 'lost';
      }
      if (isDraw) return 'lost';
    }

    // 2. GOLS (MAIS DE / MENOS DE)
    if (mNorm.includes('mais de') || mNorm.includes('over')) {
      const match = mNorm.match(/([0-9.]+)/);
      if (match && !mNorm.includes('escanteio') && !mNorm.includes('cartão')) {
        return totalG > parseFloat(match[1]) ? 'won' : 'lost';
      }
    }
    if (mNorm.includes('menos de') || mNorm.includes('under')) {
      const match = mNorm.match(/([0-9.]+)/);
      if (match && !mNorm.includes('escanteio') && !mNorm.includes('cartão')) {
        return totalG < parseFloat(match[1]) ? 'won' : 'lost';
      }
    }

    // 3. AMBAS MARCAM
    if (mNorm.includes('ambas marcam')) {
      if (mNorm.includes('sim')) return btts ? 'won' : 'lost';
      if (mNorm.includes('não') || mNorm.includes('nao')) return !btts ? 'won' : 'lost';
    }

    // --- MERCADOS AVANÇADOS (Requerem chamadas extras) ---
    
    // 4. ESCANTEIOS
    if (mNorm.includes('escanteio') || mNorm.includes('canto')) {
      const stats = await fetchStatistics(fixture.fixture.id);
      if (!stats || stats.length === 0) return null; // Sem dados

      let homeCorners = 0;
      let awayCorners = 0;

      // Extract corner values
      stats.forEach(teamStat => {
        const cornerItem = teamStat.statistics.find(s => s.type === 'Corner Kicks');
        const val = cornerItem && cornerItem.value !== null ? parseInt(cornerItem.value) : 0;
        if (teamStat.team.id === fixture.teams.home.id) homeCorners = val;
        else awayCorners = val;
      });

      const match = mNorm.match(/([0-9.]+)/);
      if (!match) return null;
      const line = parseFloat(match[1]);

      let targetCorners = homeCorners + awayCorners; // Padrão: Total

      // Se apostou em escanteio específico pro time (ex: "Casa mais de 4.5 escanteios")
      if (bet.pick) {
        if (homeNorm.includes(pickNorm) || pickNorm.includes(homeNorm) || pickNorm.includes('casa') || pickNorm.includes('home')) {
          targetCorners = homeCorners;
        } else if (awayNorm.includes(pickNorm) || pickNorm.includes(awayNorm) || pickNorm.includes('fora') || pickNorm.includes('away')) {
          targetCorners = awayCorners;
        }
      }

      if (mNorm.includes('mais de') || mNorm.includes('over')) return targetCorners > line ? 'won' : 'lost';
      if (mNorm.includes('menos de') || mNorm.includes('under')) return targetCorners < line ? 'won' : 'lost';
    }

    // 5. MARCADOR DE GOL (JOGADOR)
    if (mNorm.includes('marcar') || mNorm.includes('jogador') || mNorm.includes('anytime goalscorer')) {
      if (!bet.pick) return null; // Precisa saber qual jogador
      
      const events = await fetchEvents(fixture.fixture.id);
      if (!events || events.length === 0) return null;

      // Filtra apenas gols normais ou pênaltis marcados (exclui gol contra "own goal" ou pênaltis perdidos "missed penalty")
      const goalEvents = events.filter(e => e.type === 'Goal' && (e.detail === 'Normal Goal' || e.detail === 'Penalty'));
      
      const playerScored = goalEvents.some(e => {
        if (!e.player || !e.player.name) return false;
        const playerNorm = normalizeString(e.player.name);
        return playerNorm.includes(pickNorm) || pickNorm.includes(playerNorm);
      });

      return playerScored ? 'won' : 'lost';
    }

    return null; // Mercado não suportado automaticamente
  };

  const syncPendingBets = async (bets) => {
    const pending = bets.filter(b => b.result === 'pending');
    if (pending.length === 0) return { checked: 0, updated: 0, errors: 0 };

    const dates = [...new Set(pending.map(b => b.date.substring(0,10)))];
    let updatedCount = 0;
    let errorCount = 0;

    for (const d of dates) {
      try {
        const fixtures = await fetchFixturesByDate(d);
        const betsForDate = pending.filter(b => b.date.substring(0,10) === d);

        for (const b of betsForDate) {
          const f = matchEventWithFixture(b.event, fixtures);
          if (f) {
            const newResult = await resolveBet(b, f);
            if (newResult) {
              Storage.updateBet(b.id, { result: newResult });
              updatedCount++;
            }
          }
        }
      } catch (e) {
        console.error('Erro na API:', e);
        errorCount++;
      }
    }
    
    return { checked: pending.length, updated: updatedCount, errors: errorCount };
  };

  const getTodayFixtures = async () => {
    const today = new Date().toISOString().substring(0, 10);
    return fetchFixturesByDate(today);
  };

  const getTodayBasketballGames = async () => {
    const today = new Date().toISOString().substring(0, 10);
    const url = `https://v1.basketball.api-sports.io/games?date=${today}`;
    // Using a different cache key prefix so it doesn't conflict
    return fetchWithCache(url, cache.fixturesByDate, `basket_${today}`);
  };

  return { syncPendingBets, getTodayFixtures, getTodayBasketballGames };
})();
