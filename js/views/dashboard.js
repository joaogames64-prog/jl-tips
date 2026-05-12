const DashboardView = (() => {
  let dateKey = 'all';

  const render = () => {
    const br    = Storage.getActiveBankroll();
    const sym   = Storage.getSettings().currencySymbol || 'R$';
    const allBets = br ? Storage.getBets(br.id) : [];
    const custom = DateFilter.getCustomDates('dash');
    const bets  = DateFilter.filterBets(allBets, dateKey, custom.from, custom.to);
    const stats = br ? Calc.fullStats(bets, br.initialBalance) : null;
    const last5 = [...bets].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
    const profitColor = v => v >= 0 ? 'var(--success)' : 'var(--danger)';
    const fmtMoney = v => `${sym} ${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
    const fmtPct   = v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

    if (!br) {
      return `<div class="view-container"><div class="empty-state">
        <div class="empty-icon">💰</div>
        <h3>Nenhuma banca criada</h3>
        <p>Crie sua primeira banca para começar a registrar apostas.</p>
        <button class="btn btn-primary" onclick="App.navigate('bankroll')">Criar Banca</button>
      </div></div>`;
    }

    const pendingCount = bets.filter(b=>b.result==='pending').length;

    return `
    <div class="view-container">
      <!-- DATE FILTER -->
      ${DateFilter.render(dateKey, 'DashboardView.setDate', 'dash')}

      <!-- HEADER BANKROLL CARD -->
      <div class="hero-card">
        <div class="hero-card-label">Saldo Atual</div>
        <div class="hero-card-balance">${sym} ${br.currentBalance.toFixed(2)}</div>
        <div class="hero-card-sub" style="color:${profitColor(stats.totalProfit)}">
          ${fmtMoney(stats.totalProfit)} no período &nbsp;·&nbsp; ${fmtPct(stats.roi)} ROI
        </div>
        <div class="hero-card-name">${br.name}</div>
      </div>

      <!-- KPI GRID -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(27,158,62,0.15)">🎯</div>
          <div class="kpi-value">${stats.winRate.toFixed(1)}%</div>
          <div class="kpi-label">Win Rate</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(201,160,48,0.15)">📈</div>
          <div class="kpi-value" style="color:${profitColor(stats.roi)}">${fmtPct(stats.roi)}</div>
          <div class="kpi-label">Yield / ROI</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(255,165,2,0.15)">⏳</div>
          <div class="kpi-value">${pendingCount}</div>
          <div class="kpi-label">Pendentes</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon" style="background:rgba(46,213,115,0.15)">✅</div>
          <div class="kpi-value">${stats.settled}</div>
          <div class="kpi-label">Encerradas</div>
        </div>
      </div>

      <!-- SCORE ROW -->
      <div class="score-row">
        <div class="score-item won"><span>${stats.won}</span><small>V</small></div>
        <div class="score-sep">—</div>
        <div class="score-item void"><span>${stats.void}</span><small>E</small></div>
        <div class="score-sep">—</div>
        <div class="score-item lost"><span>${stats.lost}</span><small>D</small></div>
      </div>

      <!-- CHART -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Evolução da Banca</span>
          <span class="badge ${stats.totalProfit>=0?'badge-success':'badge-danger'}">${fmtPct(stats.roi)}</span>
        </div>
        <div class="chart-wrap" style="height:180px"><canvas id="dash-curve"></canvas></div>
      </div>

      <!-- ÚLTIMAS APOSTAS -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Últimas Apostas</span>
          <button class="btn-link" onclick="App.navigate('bet-list')">Ver todas →</button>
        </div>
        ${last5.length===0
          ? `<p class="text-muted" style="text-align:center;padding:16px 0">Nenhuma aposta no período</p>`
          : last5.map(b => betRow(b, sym)).join('')}
      </div>

      <button class="fab" onclick="App.navigate('new-bet')" title="Nova Aposta">＋</button>
    </div>`;
  };

  const setDate = (key) => {
    dateKey = key;
    DateFilter.showCustom(key, 'dash');
    if(key === 'custom') {
      const c = DateFilter.getCustomDates('dash');
      if(!c.from || !c.to) return; // wait for both dates
    }
    const main = document.getElementById('main-content');
    main.innerHTML = render();
    afterRender();
  };

  const betRow = (bet, sym) => {
    const profitColor = bet.profit >= 0 ? 'var(--success)' : 'var(--danger)';
    const badge = resultBadge(bet.result);
    const d = new Date(bet.date);
    return `
    <div class="bet-row" onclick="App.navigate('new-bet','${bet.id}')">
      <div class="bet-row-left">
        <span class="sport-icon">${sportIcon(bet.sport)}</span>
        <div>
          <div class="bet-event">${bet.event}</div>
          <div class="bet-meta">${d.toLocaleDateString('pt-BR')} · @${parseFloat(bet.odd).toFixed(2)}</div>
        </div>
      </div>
      <div class="bet-row-right">
        ${badge}
        ${bet.result !== 'pending' ? `<div class="bet-profit" style="color:${profitColor}">${bet.profit>=0?'+':''}${sym} ${bet.profit.toFixed(2)}</div>` : `<div class="bet-profit text-muted">${sym} ${bet.stake}</div>`}
      </div>
    </div>`;
  };

  const resultBadge = (r) => {
    const map = { won:'badge-success', lost:'badge-danger', void:'badge-warn', pending:'badge-muted', half_won:'badge-success', half_lost:'badge-danger' };
    const label = { won:'Ganhou', lost:'Perdeu', void:'Void', pending:'Pendente', half_won:'½ Ganhou', half_lost:'½ Perdeu' };
    return `<span class="badge ${map[r]||'badge-muted'}">${label[r]||r}</span>`;
  };

  const sportIcon = s => ({'Futebol':'⚽','Basquete':'🏀','Tênis':'🎾','F1':'🏎️','Vôlei':'🏐','Boxe':'🥊','MMA':'🥋','Baseball':'⚾','Hóquei':'🏒','Golfe':'⛳','E-Sports':'🎮','Futebol Americano':'🏈'}[s]||'🎲');

  const afterRender = () => {
    const br   = Storage.getActiveBankroll();
    const allBets = br ? Storage.getBets(br.id) : [];
    const custom = DateFilter.getCustomDates('dash');
    const bets = DateFilter.filterBets(allBets, dateKey, custom.from, custom.to);
    const curve = Calc.bankrollCurve(bets, br ? br.initialBalance : 1000);
    if(curve.length > 1) Charts.bankrollCurve('dash-curve', curve);
  };

  return { render, afterRender, resultBadge, sportIcon, betRow, setDate };
})();
