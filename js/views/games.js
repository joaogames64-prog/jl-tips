const GamesView = (() => {

  const TOP_FOOTBALL_LEAGUES = [39, 140, 135, 78, 61, 71, 72, 73, 2, 3, 13, 11];
  const TOP_BASKETBALL_LEAGUES = [12, 120, 117, 11, 76, 18, 2, 1, 40, 64];
  
  let currentGames = [];
  let isLoading = true;
  let activeTab = 'football'; // 'football' or 'basketball'

  const render = () => {
    return `
    <div class="view-container">
      <div class="page-header" style="justify-content:center;position:relative">
        <h2 style="text-align:center">Jogos de Hoje</h2>
        <button class="btn btn-ghost btn-sm" onclick="GamesView.loadGames()" title="Atualizar" style="position:absolute;right:0">🔄</button>
      </div>

      <div class="chip-group" style="justify-content:center;margin-bottom:16px;">
        <button type="button" class="chip ${activeTab === 'football' ? 'chip-active' : ''}" onclick="GamesView.setTab('football')">⚽ Futebol</button>
        <button type="button" class="chip ${activeTab === 'basketball' ? 'chip-active' : ''}" onclick="GamesView.setTab('basketball')">🏀 Basquete</button>
      </div>

      <div class="card">
        <p class="text-muted" style="font-size:13px;text-align:center">
          Principais partidas de hoje. Clique em "Apostar" para preencher a caderneta automaticamente.
        </p>
      </div>

      <div id="games-container" style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
        ${renderLoading()}
      </div>
    </div>`;
  };

  const setTab = (tab) => {
    if (activeTab === tab) return;
    activeTab = tab;
    App.navigate('games'); // Re-render whole view
  };

  const renderLoading = () => {
    const icon = activeTab === 'football' ? '⚽' : '🏀';
    return `
      <div style="padding: 40px 20px; text-align: center;">
        <div style="font-size: 24px; animation: spin 1s linear infinite; display: inline-block;">${icon}</div>
        <p class="text-muted" style="margin-top:12px">Buscando os jogos do dia...</p>
      </div>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    `;
  };

  const renderGamesList = () => {
    if (isLoading) return renderLoading();
    
    if (currentGames.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🏟️</div>
          <p>Nenhum jogo importante encontrado hoje para esta modalidade.</p>
        </div>`;
    }

    return currentGames.map(g => {
      // Diferenças entre as APIs (Futebol vs Basquete)
      const dateField = g.fixture ? g.fixture.date : g.date;
      const statusShort = g.fixture ? g.fixture.status.short : g.status.short;
      const statusElapsed = g.fixture ? g.fixture.status.elapsed : null;
      const leagueObj = g.league;
      const homeTeam = g.teams.home;
      const awayTeam = g.teams.away;

      // Placares
      let homeScore = '?';
      let awayScore = '?';
      if (activeTab === 'football') {
        homeScore = g.goals.home;
        awayScore = g.goals.away;
      } else {
        homeScore = g.scores.home.total;
        awayScore = g.scores.away.total;
      }

      const dateObj = new Date(dateField);
      const time = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      let statusBadge = '';
      if (['1H', '2H', 'HT', 'ET', 'P', 'BT', 'Q1', 'Q2', 'Q3', 'Q4'].includes(statusShort)) {
        statusBadge = `<span style="color:var(--danger);font-weight:bold;font-size:11px;background:rgba(255,59,48,0.1);padding:2px 6px;border-radius:4px;margin-left:8px;">AO VIVO ${statusElapsed ? statusElapsed+"'" : ""}</span>`;
      } else if (['FT', 'AET', 'PEN', 'AOT'].includes(statusShort)) {
        statusBadge = `<span style="color:var(--text-muted);font-weight:bold;font-size:11px;background:var(--surface);padding:2px 6px;border-radius:4px;margin-left:8px;">ENCERRADO</span>`;
      }

      const hasFinishedOrLive = ['FT', 'AET', 'PEN', 'AOT', '1H', '2H', 'HT', 'ET', 'P', 'BT', 'Q1', 'Q2', 'Q3', 'Q4'].includes(statusShort);
      
      const scoreHtml = hasFinishedOrLive
        ? `<div style="font-weight:700;font-size:18px">${homeScore !== null ? homeScore : '-'} - ${awayScore !== null ? awayScore : '-'}</div>` 
        : `<div style="font-size:14px;color:var(--text-muted);font-weight:600">${time}</div>`;

      // Payload for newBet
      const payloadStr = encodeURIComponent(JSON.stringify({
        sport: activeTab === 'football' ? '⚽ Futebol' : '🏀 Basquete',
        event: `${homeTeam.name} x ${awayTeam.name}`,
        competition: leagueObj.name
      }));

      return `
        <div class="card" style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <img src="${leagueObj.logo}" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 0 2px rgba(255,255,255,0.2))" onerror="this.style.display='none'">
              <span style="font-size:12px;font-weight:600;color:var(--text-muted)">${leagueObj.name}</span>
              ${statusBadge}
            </div>
          </div>
          
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;flex-direction:column;gap:8px;flex:1">
              <div style="display:flex;align-items:center;gap:8px">
                <img src="${homeTeam.logo}" style="width:20px;height:20px;object-fit:contain">
                <span style="font-weight:600;font-size:14px">${homeTeam.name}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <img src="${awayTeam.logo}" style="width:20px;height:20px;object-fit:contain">
                <span style="font-weight:600;font-size:14px">${awayTeam.name}</span>
              </div>
            </div>
            
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:12px;padding-left:12px;border-left:1px solid var(--surface)">
              ${scoreHtml}
              <button class="btn btn-primary btn-sm" onclick="App.navigate('new-bet', '${payloadStr}')" style="padding:6px 12px;font-size:12px">
                Apostar
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  const loadGames = async () => {
    const s = Storage.getSettings();
    const container = document.getElementById('games-container');
    if (!container) return;

    if (!s.apiFootballKey) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔑</div>
          <p>Configure a API Key nas Configurações para ver os jogos.</p>
          <button class="btn btn-primary" style="margin-top:12px" onclick="App.navigate('settings')">Ir para Config</button>
        </div>`;
      return;
    }

    isLoading = true;
    container.innerHTML = renderLoading();

    try {
      let allGames = [];
      if (activeTab === 'football') {
        allGames = await ApiSync.getTodayFixtures();
        currentGames = allGames
          .filter(g => TOP_FOOTBALL_LEAGUES.includes(g.league.id))
          .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
      } else {
        allGames = await ApiSync.getTodayBasketballGames();
        currentGames = allGames
          .filter(g => TOP_BASKETBALL_LEAGUES.includes(g.league.id))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      
      isLoading = false;
      container.innerHTML = renderGamesList();
    } catch (e) {
      console.error(e);
      isLoading = false;
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">❌</div>
          <p>Erro ao carregar os jogos. Verifique sua conexão ou API Key.</p>
        </div>`;
    }
  };

  const afterRender = () => {
    loadGames();
  };

  return { render, afterRender, loadGames, setTab };
})();
