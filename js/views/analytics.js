const AnalyticsView = (() => {
  let activeTab = 'overview';
  let dateKey = 'all';

  const getFilteredBets = () => {
    const br   = Storage.getActiveBankroll();
    const all  = br ? Storage.getBets(br.id) : [];
    const custom = DateFilter.getCustomDates('an');
    return DateFilter.filterBets(all, dateKey, custom.from, custom.to);
  };

  const render = () => {
    const br   = Storage.getActiveBankroll();
    const sym  = Storage.getSettings().currencySymbol || 'R$';
    const bets = getFilteredBets();
    const stats = Calc.fullStats(bets, br ? br.initialBalance : 0);
    const pc = v => v >= 0 ? 'var(--success)' : 'var(--danger)';
    const fmt = v => `${v>=0?'+':''}${sym} ${v.toFixed(2)}`;

    return `
    <div class="view-container">
      <div class="page-header"><h2>Analytics</h2></div>

      ${DateFilter.render(dateKey, 'AnalyticsView.setDate', 'an')}

      <div class="tab-bar">
        <button class="tab-btn ${activeTab==='overview'?'tab-active':''}" onclick="AnalyticsView.switchTab('overview')">Visão Geral</button>
        <button class="tab-btn ${activeTab==='charts'?'tab-active':''}" onclick="AnalyticsView.switchTab('charts')">Gráficos</button>
        <button class="tab-btn ${activeTab==='breakdown'?'tab-active':''}" onclick="AnalyticsView.switchTab('breakdown')">Categorias</button>
      </div>

      <div id="analytics-content">
        ${renderTab(activeTab, bets, stats, br, sym, pc, fmt)}
      </div>
    </div>`;
  };

  const setDate = (key) => {
    dateKey = key;
    DateFilter.showCustom(key, 'an');
    if(key === 'custom') {
      const c = DateFilter.getCustomDates('an');
      if(!c.from || !c.to) return;
    }
    const br   = Storage.getActiveBankroll();
    const sym  = Storage.getSettings().currencySymbol || 'R$';
    const bets = getFilteredBets();
    const stats = Calc.fullStats(bets, br ? br.initialBalance : 0);
    const pc = v => v >= 0 ? 'var(--success)' : 'var(--danger)';
    const fmt = v => `${v>=0?'+':''}${sym} ${v.toFixed(2)}`;

    // Update chips
    document.querySelectorAll('#an-chips .date-chip').forEach((c, i) => {
      c.classList.toggle('date-chip-active', DateFilter.presets[i].key === key);
    });

    const content = document.getElementById('analytics-content');
    if(content) { content.innerHTML = renderTab(activeTab, bets, stats, br, sym, pc, fmt); afterRender(); }
  };

  const renderTab = (tab, bets, stats, br, sym, pc, fmt) => {
    if(tab === 'overview') return renderOverview(stats, sym, pc, fmt);
    if(tab === 'charts')   return renderCharts();
    if(tab === 'breakdown') return renderBreakdown(bets, sym, pc, fmt);
    return '';
  };

  const renderOverview = (s, sym, pc, fmt) => {
    const metrics = [
      { label:'ROI',           val:`${s.roi>=0?'+':''}${s.roi.toFixed(2)}%`,    col:pc(s.roi),     icon:'📈' },
      { label:'Yield',         val:`${s.yield>=0?'+':''}${s.yield.toFixed(2)}%`, col:pc(s.yield),   icon:'📊' },
      { label:'Win Rate',      val:`${s.winRate.toFixed(1)}%`,                    col:'var(--text)',  icon:'🎯' },
      { label:'Lucro Total',   val:fmt(s.totalProfit),                            col:pc(s.totalProfit), icon:'💰' },
      { label:'Total Apostado',val:`${sym} ${s.totalStaked.toFixed(2)}`,         col:'var(--text)',  icon:'💵' },
      { label:'Odd Média',     val:s.avgOdd.toFixed(2),                           col:'var(--text)',  icon:'🎲' },
      { label:'Stake Médio',   val:`${sym} ${s.avgStake.toFixed(2)}`,            col:'var(--text)',  icon:'📦' },
      { label:'Max Drawdown',  val:`${sym} ${s.maxDrawdown.toFixed(2)}`,         col:'var(--danger)',icon:'📉' },
      { label:'Série Vitórias',val:s.streaks.maxWin,                             col:'var(--success)',icon:'🔥' },
      { label:'Série Derrotas',val:s.streaks.maxLoss,                            col:'var(--danger)', icon:'❄️' },
      { label:'Apostas Total', val:s.total,                                       col:'var(--text)',  icon:'📋' },
      { label:'Encerradas',    val:s.settled,                                     col:'var(--text)',  icon:'✅' },
    ];
    const bestBet  = s.bestBet?.event  ? s.bestBet  : null;
    const worstBet = s.worstBet?.event ? s.worstBet : null;
    return `
      <div class="metrics-grid">
        ${metrics.map(m=>`
          <div class="metric-card">
            <div class="metric-icon">${m.icon}</div>
            <div class="metric-value" style="color:${m.col}">${m.val}</div>
            <div class="metric-label">${m.label}</div>
          </div>`).join('')}
      </div>
      <div class="results-row">
        <div class="result-box won-box"><span class="result-num">${s.won}</span><span class="result-lbl">Vitórias</span></div>
        <div class="result-box lost-box"><span class="result-num">${s.lost}</span><span class="result-lbl">Derrotas</span></div>
        <div class="result-box void-box"><span class="result-num">${s.void}</span><span class="result-lbl">Void</span></div>
        <div class="result-box pending-box"><span class="result-num">${s.pending}</span><span class="result-lbl">Pendentes</span></div>
      </div>
      ${bestBet ? `<div class="card"><div class="card-header"><span class="card-title">🏆 Melhor Aposta</span><span class="badge badge-success">+${sym} ${bestBet.profit?.toFixed(2)}</span></div><div class="bet-detail-row"><span>${bestBet.event}</span><span>@${parseFloat(bestBet.odd).toFixed(2)}</span></div></div>` : ''}
      ${worstBet ? `<div class="card"><div class="card-header"><span class="card-title">📉 Pior Aposta</span><span class="badge badge-danger">${sym} ${worstBet.profit?.toFixed(2)}</span></div><div class="bet-detail-row"><span>${worstBet.event}</span><span>@${parseFloat(worstBet.odd).toFixed(2)}</span></div></div>` : ''}`;
  };

  const renderCharts = () => `
    <div class="card"><div class="card-header"><span class="card-title">Evolução da Banca</span></div><div class="chart-wrap" style="height:200px"><canvas id="an-curve"></canvas></div></div>
    <div class="card"><div class="card-header"><span class="card-title">Lucro por Mês</span></div><div class="chart-wrap" style="height:180px"><canvas id="an-monthly"></canvas></div></div>
    <div class="card"><div class="card-header"><span class="card-title">Distribuição de Odds</span></div><div class="chart-wrap" style="height:160px"><canvas id="an-odds"></canvas></div></div>
    <div class="card"><div class="card-header"><span class="card-title">Resultado (V/D/E)</span></div><div class="chart-wrap" style="height:200px"><canvas id="an-winlose"></canvas></div></div>`;

  const renderBreakdown = (bets, sym, pc, fmt) => {
    const table = (grouped, title) => {
      const rows = Object.entries(grouped).sort((a,b)=>b[1].profit-a[1].profit);
      return `<div class="card">
        <div class="card-header"><span class="card-title">${title}</span></div>
        <div class="chart-wrap" style="height:${Math.max(160,rows.length*40)}px"><canvas id="chart-${title.replace(/\s/g,'')}"></canvas></div>
        <div class="breakdown-table">
          <div class="breakdown-header"><span>Nome</span><span>Apostas</span><span>Win%</span><span>Lucro</span></div>
          ${rows.map(([k,v])=>`<div class="breakdown-row"><span class="breakdown-name">${k}</span><span>${v.count}</span><span>${v.winRate.toFixed(0)}%</span><span style="color:${pc(v.profit)};font-weight:600">${fmt(v.profit)}</span></div>`).join('')}
        </div>
      </div>`;
    };
    return table(Calc.groupBy(bets,'sport'),'Por Esporte') + table(Calc.groupBy(bets,'bookmaker'),'Por Casa de Apostas') + table(Calc.groupBy(bets,'competition'),'Por Competição');
  };

  const switchTab = (tab) => {
    activeTab = tab;
    const br   = Storage.getActiveBankroll();
    const sym  = Storage.getSettings().currencySymbol || 'R$';
    const bets = getFilteredBets();
    const stats = Calc.fullStats(bets, br ? br.initialBalance : 0);
    const pc = v => v >= 0 ? 'var(--success)' : 'var(--danger)';
    const fmt = v => `${v>=0?'+':''}${sym} ${v.toFixed(2)}`;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    document.querySelectorAll('.tab-btn')[['overview','charts','breakdown'].indexOf(tab)]?.classList.add('tab-active');
    const content = document.getElementById('analytics-content');
    if(content) { content.innerHTML = renderTab(tab, bets, stats, br, sym, pc, fmt); afterRender(); }
  };

  const afterRender = () => {
    if(activeTab !== 'charts' && activeTab !== 'breakdown') return;
    const br   = Storage.getActiveBankroll();
    const bets = getFilteredBets();
    const stats = Calc.fullStats(bets, br ? br.initialBalance : 0);

    if(activeTab === 'charts') {
      const curve = Calc.bankrollCurve(bets, br ? br.initialBalance : 0);
      const monthly = Calc.monthlyStats(bets);
      const oddDist = Calc.oddDistribution(bets);
      if(curve.length>1)   Charts.bankrollCurve('an-curve', curve);
      if(monthly.length>0) Charts.monthlyBar('an-monthly', monthly);
      Charts.oddDistBar('an-odds', oddDist);
      Charts.winLosePie('an-winlose', stats.won, stats.lost, stats.void);
    }
    if(activeTab === 'breakdown') {
      Charts.profitByKey('chartPorEsporte', Calc.groupBy(bets,'sport'), 'Lucro');
      Charts.profitByKey('chartPorCasadeApostas', Calc.groupBy(bets,'bookmaker'), 'Lucro');
      Charts.profitByKey('chartPorCompetição', Calc.groupBy(bets,'competition'), 'Lucro');
    }
  };

  return { render, afterRender, switchTab, setDate };
})();
