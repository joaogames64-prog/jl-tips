const BetListView = (() => {
  let filters = { search:'', sport:'', result:'', bookmaker:'', sort:'date-desc' };
  let dateKey = 'all';

  const getDateBets = () => {
    const br  = Storage.getActiveBankroll();
    const all = br ? Storage.getBets(br.id) : [];
    const custom = DateFilter.getCustomDates('bl');
    return DateFilter.filterBets(all, dateKey, custom.from, custom.to);
  };

  const render = () => {
    const br   = Storage.getActiveBankroll();
    const sym  = Storage.getSettings().currencySymbol || 'R$';
    const bets = getDateBets();
    const sports     = [...new Set(bets.map(b=>b.sport).filter(Boolean))];
    const bookmakers = [...new Set(bets.map(b=>b.bookmaker).filter(Boolean))];

    return `
    <div class="view-container">
      <div class="page-header" style="gap:8px;justify-content:flex-start">
        <h2 style="flex:1">Apostas</h2>
        <button class="btn btn-ghost btn-sm" onclick="BetListView.syncResults()" title="Sincronizar Resultados" style="padding:6px 10px;font-size:16px">🔄</button>
        <button class="btn btn-primary btn-sm" onclick="App.navigate('new-bet')">＋ Nova</button>
      </div>

      ${DateFilter.render(dateKey, 'BetListView.setDate', 'bl')}

      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input" class="search-input" placeholder="Buscar evento, competição..." value="${filters.search}" oninput="BetListView.applyFilter('search',this.value)">
      </div>

      <div class="filter-row">
        <select class="filter-chip" onchange="BetListView.applyFilter('sport',this.value)">
          <option value="">⚽ Esporte</option>
          ${sports.map(s=>`<option ${filters.sport===s?'selected':''} value="${s}">${s}</option>`).join('')}
        </select>
        <select class="filter-chip" onchange="BetListView.applyFilter('result',this.value)">
          <option value="">🎯 Resultado</option>
          <option value="won"  ${filters.result==='won'?'selected':''}>✅ Ganhou</option>
          <option value="lost" ${filters.result==='lost'?'selected':''}>❌ Perdeu</option>
          <option value="pending" ${filters.result==='pending'?'selected':''}>⏳ Pendente</option>
          <option value="void" ${filters.result==='void'?'selected':''}>🔄 Void</option>
        </select>
        <select class="filter-chip" onchange="BetListView.applyFilter('bookmaker',this.value)">
          <option value="">🏠 Casa</option>
          ${bookmakers.map(b=>`<option ${filters.bookmaker===b?'selected':''} value="${b}">${b}</option>`).join('')}
        </select>
        <select class="filter-chip" onchange="BetListView.applyFilter('sort',this.value)">
          <option value="date-desc"   ${filters.sort==='date-desc'?'selected':''}>📅 Mais recente</option>
          <option value="date-asc"    ${filters.sort==='date-asc'?'selected':''}>📅 Mais antigo</option>
          <option value="profit-desc" ${filters.sort==='profit-desc'?'selected':''}>💰 Maior lucro</option>
          <option value="odd-desc"    ${filters.sort==='odd-desc'?'selected':''}>📊 Maior odd</option>
        </select>
      </div>

      ${filters.search||filters.sport||filters.result||filters.bookmaker
        ? `<button class="btn-link" style="font-size:12px;margin-bottom:8px" onclick="BetListView.clearFilters()">✕ Limpar filtros</button>` : ''}

      <div id="bet-list-container">
        ${renderList(bets, filters, sym)}
      </div>
    </div>`;
  };

  const renderList = (bets, f, sym) => {
    let list = [...bets];
    if(f.search)    list = list.filter(b => `${b.event} ${b.competition} ${b.market}`.toLowerCase().includes(f.search.toLowerCase()));
    if(f.sport)     list = list.filter(b => b.sport === f.sport);
    if(f.result)    list = list.filter(b => b.result === f.result);
    if(f.bookmaker) list = list.filter(b => b.bookmaker === f.bookmaker);

    if(f.sort==='date-desc')   list.sort((a,b)=>new Date(b.date)-new Date(a.date));
    if(f.sort==='date-asc')    list.sort((a,b)=>new Date(a.date)-new Date(b.date));
    if(f.sort==='profit-desc') list.sort((a,b)=>(b.profit||0)-(a.profit||0));
    if(f.sort==='odd-desc')    list.sort((a,b)=>b.odd-a.odd);

    if(list.length === 0) return `<div class="empty-state"><div class="empty-icon">🔍</div><p>Nenhuma aposta encontrada</p></div>`;

    const totalShown = Calc.settled(list).reduce((s,b)=>s+(b.profit||0),0);
    return `
      <div class="list-summary">
        <span>${list.length} aposta${list.length!==1?'s':''}</span>
        <span style="color:${totalShown>=0?'var(--success)':'var(--danger)'};font-weight:600">
          ${totalShown>=0?'+':''}${sym} ${totalShown.toFixed(2)}
        </span>
      </div>
      ${list.map(b => betCard(b, sym)).join('')}`;
  };

  const betCard = (b, sym) => {
    const d = new Date(b.date);
    const profitColor = (b.profit||0) >= 0 ? 'var(--success)' : 'var(--danger)';
    const badge = DashboardView.resultBadge(b.result);
    return `
    <div class="bet-card" onclick="App.navigate('new-bet','${b.id}')">
      <div class="bet-card-top">
        <div class="bet-card-sport">${DashboardView.sportIcon(b.sport)} ${b.sport}</div>
        ${badge}
      </div>
      <div class="bet-card-event">${b.event}</div>
      <div class="bet-card-meta">${b.competition||''} ${b.market?'· '+b.market:''}</div>
      <div class="bet-card-bottom">
        <div class="bet-card-info">
          <span class="bet-tag">@${parseFloat(b.odd).toFixed(2)}</span>
          <span class="bet-tag">${sym} ${b.stake}</span>
          ${b.bookmaker?`<span class="bet-tag">${b.bookmaker}</span>`:''}
          <span class="bet-tag-muted">${d.toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="bet-profit-big" style="color:${b.result==='pending'?'var(--text-muted)':profitColor}">
          ${b.result==='pending'?'Aguardando':`${(b.profit||0)>=0?'+':''}${sym} ${(b.profit||0).toFixed(2)}`}
        </div>
      </div>
    </div>`;
  };

  const applyFilter = (key, value) => {
    filters[key] = value;
    const sym = Storage.getSettings().currencySymbol || 'R$';
    const bets = getDateBets();
    const container = document.getElementById('bet-list-container');
    if(container) container.innerHTML = renderList(bets, filters, sym);
  };

  const setDate = (key) => {
    dateKey = key;
    DateFilter.showCustom(key, 'bl');
    if(key === 'custom') {
      const c = DateFilter.getCustomDates('bl');
      if(!c.from || !c.to) return;
    }
    document.querySelectorAll('#bl-chips .date-chip').forEach((c, i) => {
      c.classList.toggle('date-chip-active', DateFilter.presets[i].key === key);
    });
    const sym = Storage.getSettings().currencySymbol || 'R$';
    const container = document.getElementById('bet-list-container');
    if(container) container.innerHTML = renderList(getDateBets(), filters, sym);
  };

  const clearFilters = () => {
    filters = { search:'', sport:'', result:'', bookmaker:'', sort:'date-desc' };
    dateKey = 'all';
    App.navigate('bet-list');
  };

  const syncResults = async () => {
    const s = Storage.getSettings();
    if (!s.apiFootballKey) {
      App.toast('Configure sua API Key nas Configurações!', 'error');
      setTimeout(() => App.navigate('settings'), 1500);
      return;
    }

    const br = Storage.getActiveBankroll();
    if (!br) return;
    const bets = Storage.getBets(br.id);
    const pending = bets.filter(b => b.result === 'pending');
    if (pending.length === 0) {
      App.toast('Nenhuma aposta pendente para sincronizar', 'info');
      return;
    }

    App.toast('Sincronizando...', 'info');
    document.body.style.cursor = 'wait';
    try {
      const res = await ApiSync.syncPendingBets(bets);
      if (res.errors > 0) {
        App.toast('Alguns erros ocorreram na API', 'error');
      } else if (res.updated > 0) {
        App.toast(`${res.updated} aposta(s) resolvida(s)! ✅`, 'success');
        App.navigate('bet-list');
      } else {
        App.toast('Nenhum resultado finalizado encontrado', 'info');
      }
    } catch (e) {
      App.toast('Erro: ' + e.message, 'error');
    }
    document.body.style.cursor = 'default';
  };

  const afterRender = () => {
    const si = document.getElementById('search-input');
    if(si) si.focus();
  };

  return { render, afterRender, applyFilter, clearFilters, setDate, syncResults };
})();
