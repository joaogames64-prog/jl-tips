const ApiSync = (() => {

  const getHeaders = () => {
    const key = Storage.getSettings().apiFootballKey;
    if (!key) throw new Error('API Key não configurada');
    return {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': key
    };
  };

  const fetchFixturesByDate = async (dateStr) => {
    // dateStr in YYYY-MM-DD
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, {
      method: 'GET',
      headers: getHeaders()
    });
    const data = await res.json();
    if (data.errors && Object.keys(data.errors).length > 0) {
      throw new Error(Object.values(data.errors)[0]);
    }
    return data.response || [];
  };

  const normalizeString = (str) => {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  };

  const matchEventWithFixture = (eventStr, fixtures) => {
    const evNorm = normalizeString(eventStr);
    
    for (const f of fixtures) {
      const homeNorm = normalizeString(f.teams.home.name);
      const awayNorm = normalizeString(f.teams.away.name);
      
      // Checa se o texto do evento contém os nomes dos dois times
      // Ex: "Flamengo x Palmeiras" contém "flamengo" e "palmeiras"
      if (evNorm.includes(homeNorm) || evNorm.includes(awayNorm)) {
        // Se bater os dois times, é um match forte
        if (evNorm.includes(homeNorm) && evNorm.includes(awayNorm)) {
          return f;
        }
      }
    }
    
    // Fallback: match fraco (só um time e pelo menos 4 caracteres para não pegar siglas comuns)
    for (const f of fixtures) {
      const homeNorm = normalizeString(f.teams.home.name);
      const awayNorm = normalizeString(f.teams.away.name);
      if (homeNorm.length > 3 && evNorm.includes(homeNorm)) return f;
      if (awayNorm.length > 3 && evNorm.includes(awayNorm)) return f;
    }
    return null;
  };

  const resolveBet = (bet, fixture) => {
    // Só resolve se o jogo terminou
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

    // Regras de resolução
    if (mNorm.includes('resultado final') || mNorm.includes('vencedor')) {
      const evLow = bet.event.toLowerCase();
      // Heurística básica: checar quem está primeiro no texto (geralmente o time da casa)
      const homeName = fixture.teams.home.name.toLowerCase();
      const awayName = fixture.teams.away.name.toLowerCase();
      
      // Sem saber qual time o usuário escolheu (pois a engine original não salvava "pick" separado),
      // não podemos resolver Resultado Final com 100% de precisão se não tiver a pick salva.
      // Assumimos que o usuário escreve a "Pick" no evento, ou temos que pular se for ambíguo.
      return null; // Muito arriscado resolver sem uma pick clara na estrutura antiga.
    }

    if (mNorm.includes('mais de') || mNorm.includes('over')) {
      const match = mNorm.match(/([0-9.]+)/);
      if (match) {
        const line = parseFloat(match[1]);
        return totalG > line ? 'won' : 'lost';
      }
    }

    if (mNorm.includes('menos de') || mNorm.includes('under')) {
      const match = mNorm.match(/([0-9.]+)/);
      if (match) {
        const line = parseFloat(match[1]);
        return totalG < line ? 'won' : 'lost';
      }
    }

    if (mNorm.includes('ambas marcam')) {
      if (mNorm.includes('sim')) return btts ? 'won' : 'lost';
      if (mNorm.includes('não') || mNorm.includes('nao')) return !btts ? 'won' : 'lost';
    }

    return null; // Mercado não suportado automaticamente
  };

  const syncPendingBets = async (bets) => {
    const pending = bets.filter(b => b.result === 'pending');
    if (pending.length === 0) return { checked: 0, updated: 0, errors: 0 };

    // Agrupa por data (YYYY-MM-DD)
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
            const newResult = resolveBet(b, f);
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

  return { syncPendingBets };
})();
