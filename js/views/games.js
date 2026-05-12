const GamesView = (() => {

  const TOP_LEAGUES = [39, 140, 135, 78, 61, 71, 72, 73, 2, 3, 13, 11];
  let currentGames = [];
  let isLoading = true;

  const render = () => {
    return `
    <div class="view-container">
      <div class="page-header">
        <h2>Jogos de Hoje</h2>
        <button class="btn btn-ghost btn-sm" onclick="GamesView.loadGames()" title="Atualizar">🔄</button>
      </div>

      <div class="card">
        <p class="text-muted" style="font-size:13px">
          Principais partidas de hoje ao redor do mundo. Clique em "Apostar" para preencher a caderneta automaticamente.
        </p>
      </div>

      <div id="games-container" style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
        ${renderLoading()}
      </div>
    </div>`;
  };

  const renderLoading = () => {
    return `
      <div style="padding: 40px 20px; text-align: center;">
        <div style="font-size: 24px; animation: spin 1s linear infinite; display: inline-block;">⚽</div>
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
          <p>Nenhum jogo importante encontrado hoje.</p>
        </div>`;
    }

    return currentGames.map(g => {
      const dateObj = new Date(g.fixture.date);
      const time = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const status = g.fixture.status.short;
      
      let statusBadge = '';
      if (['1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(status)) {
        statusBadge = `<span style="color:var(--danger);font-weight:bold;font-size:11px;background:rgba(255,59,48,0.1);padding:2px 6px;border-radius:4px;margin-left:8px;">AO VIVO ${g.fixture.status.elapsed}'</span>`;
      } else if (['FT', 'AET', 'PEN'].includes(status)) {
        statusBadge = `<span style="color:var(--text-muted);font-weight:bold;font-size:11px;background:var(--surface);padding:2px 6px;border-radius:4px;margin-left:8px;">ENCERRADO</span>`;
      }

      const score = (['FT', 'AET', 'PEN', '1H', '2H', 'HT', 'ET', 'P', 'BT'].includes(status)) 
        ? `<div style="font-weight:700;font-size:18px">${g.goals.home} - ${g.goals.away}</div>` 
        : `<div style="font-size:14px;color:var(--text-muted);font-weight:600">${time}</div>`;

      // Payload for newBet
      const payloadStr = encodeURIComponent(JSON.stringify({
        event: \`\${g.teams.home.name} x \${g.teams.away.name}\`,
        competition: g.league.name
      }));

      return `
        <div class="card" style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px">
              <img src="${g.league.logo}" style="width:16px;height:16px;object-fit:contain;filter:drop-shadow(0 0 2px rgba(255,255,255,0.2))" onerror="this.style.display='none'">
              <span style="font-size:12px;font-weight:600;color:var(--text-muted)">${g.league.name}</span>
              ${statusBadge}
            </div>
          </div>
          
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;flex-direction:column;gap:8px;flex:1">
              <div style="display:flex;align-items:center;gap:8px">
                <img src="${g.teams.home.logo}" style="width:20px;height:20px;object-fit:contain">
                <span style="font-weight:600;font-size:14px">${g.teams.home.name}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <img src="${g.teams.away.logo}" style="width:20px;height:20px;object-fit:contain">
                <span style="font-weight:600;font-size:14px">${g.teams.away.name}</span>
              </div>
            </div>
            
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:12px;padding-left:12px;border-left:1px solid var(--surface)">
              ${score}
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
      const allGames = await ApiSync.getTodayFixtures();
      // Filtrar ligas principais e ordernar por horário
      currentGames = allGames
        .filter(g => TOP_LEAGUES.includes(g.league.id))
        .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
      
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

  return { render, afterRender, loadGames };
})();
