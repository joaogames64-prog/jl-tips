const NewBetView = (() => {
  let editingId = null;

  const sports     = ['Futebol','Basquete','Tênis','Futebol Americano','Vôlei','Boxe','MMA','Baseball','Hóquei','Golfe','E-Sports','Outro'];
  const betTypes   = [{v:'single',l:'Simples'},{v:'multiple',l:'Múltipla'},{v:'back',l:'Back'},{v:'lay',l:'Lay'},{v:'system',l:'Sistema'}];
  const results    = [{v:'pending',l:'⏳ Pendente'},{v:'won',l:'✅ Ganhou'},{v:'lost',l:'❌ Perdeu'},{v:'void',l:'🔄 Void'},{v:'half_won',l:'½ Ganhou'},{v:'half_lost',l:'½ Perdeu'}];
  const bookmakers = ['Bet365','Betano','KTO','Sportingbet','Pinnacle','Novibet','Betcris','1xBet','Betfair','Outro'];
  // ── MARKETS — organized by category ────────
  const marketsByCategory = {
    '⚽ Futebol': [
      'Resultado Final (1X2)','Dupla Hipótese (1X/X2/12)','Empate Anula Aposta',
      'Mais de 0.5 Gols','Mais de 1.5 Gols','Mais de 2.5 Gols','Mais de 3.5 Gols','Mais de 4.5 Gols',
      'Menos de 0.5 Gols','Menos de 1.5 Gols','Menos de 2.5 Gols','Menos de 3.5 Gols',
      'Ambas Marcam (BTTS)','Ambas Marcam + Over 2.5','Ambas Marcam + Under 3.5',
      'Handicap Asiático','Handicap Europeu',
      'Placar Exato','Placar ao Intervalo','Resultado ao Intervalo',
      'Resultado Intervalo/Final','Chance Dupla + Over 1.5',
      'Próximo Gol','Último Gol','Primeiro Gol',
      'Gols Over/Under 1º Tempo','Gols Over/Under 2º Tempo',
      'Total de Gols (Exato)','Total de Gols Ímpar/Par',
      'Total de Cantos','Total de Cartões','Total de Faltas',
      'Jogador Marca a Qualquer Momento','Jogador Marca Primeiro',
      'Jogador Marca 2+','Jogador Marca Hat-Trick',
      'Time Marca Primeiro','Time Marca Último',
      'Gol no 1º Tempo','Gol no 2º Tempo',
      'Clean Sheet (Sem Sofrer Gol)','Margem de Vitória',
      'Vencedor sem Empate','Draw No Bet (DNB)',
    ],
    '🏀 Basquete': [
      'Vencedor (Moneyline)','Handicap (Spread)',
      'Total de Pontos (Over/Under)','Total de Pontos 1º Quarto',
      'Total de Pontos 1º Tempo','Vencedor 1º Quarto','Vencedor 1º Tempo',
      'Margem de Vitória','Par/Ímpar Pontos',
      'Jogador Over/Under Pontos','Jogador Over/Under Assistências',
      'Jogador Over/Under Rebotes','Jogador Double-Double',
      'Jogador Triple-Double','Primeiro Cesta',
    ],
    '🎾 Tênis': [
      'Vencedor da Partida','Handicap de Games','Handicap de Sets',
      'Total de Games (Over/Under)','Resultado em Sets',
      'Vencedor do 1º Set','Placar Exato em Sets',
      'Total de Tie-Breaks','Jogador Vence um Set',
    ],
    '🏈 Futebol Americano': [
      'Vencedor (Moneyline)','Handicap (Spread)',
      'Total de Pontos (Over/Under)','Vencedor 1º Tempo',
      'Total de Pontos 1º Tempo','Margem de Vitória',
      'Primeiro Touchdown','Jogador Over/Under Jardas',
    ],
    '🎲 Geral': [
      'Vencedor','Handicap','Over/Under','1X2',
      'Par/Ímpar','Margem de Vitória','Classificação',
    ],
  };

  // Flatten all markets for datalist
  const getAllMarkets = () => {
    const custom = Storage.getSettings().customMarkets || [];
    const all = [];
    Object.values(marketsByCategory).forEach(arr => all.push(...arr));
    all.push(...custom);
    return [...new Set(all)];
  };

  const render = (betId = null) => {
    editingId = betId || null;
    const bet = betId ? Storage.getBet(betId) : null;
    const sym = Storage.getSettings().currencySymbol || 'R$';
    const ds  = Storage.getSettings().defaultStake || 50;
    const now = new Date();
    const defaultDate = now.toISOString().slice(0,16);
    const v = f => bet ? (bet[f]??'') : '';
    const allMarkets = getAllMarkets();

    return `
    <div class="view-container">
      <div class="page-header">
        <button class="btn-icon" onclick="App.back()">←</button>
        <h2>${bet ? 'Editar Aposta' : 'Nova Aposta'}</h2>
        ${bet ? `<button class="btn-icon btn-danger-soft" onclick="NewBetView.confirmDelete('${bet.id}')">🗑</button>` : '<div></div>'}
      </div>

      <form id="bet-form" onsubmit="NewBetView.saveBet(event)">

        <!-- TIPO -->
        <div class="form-section">
          <label class="form-label">Tipo de Aposta</label>
          <div class="chip-group" id="betType-group">
            ${betTypes.map(t=>`<button type="button" class="chip ${(!bet&&t.v==='single')||(bet&&bet.betType===t.v)?'chip-active':''}" data-field="betType" data-value="${t.v}" onclick="NewBetView.selectChip(this,'betType-group')">${t.l}</button>`).join('')}
          </div>
          <input type="hidden" id="betType" value="${v('betType')||'single'}">
        </div>

        <!-- ESPORTE -->
        <div class="form-section">
          <label class="form-label">Esporte</label>
          <div class="chip-group" id="sport-group">
            ${sports.map(s=>`<button type="button" class="chip ${bet&&bet.sport===s?'chip-active':''}" data-field="sport" data-value="${s}" onclick="NewBetView.selectChip(this,'sport-group')">${DashboardView.sportIcon(s)} ${s}</button>`).join('')}
          </div>
          <input type="hidden" id="sport" value="${v('sport')||''}">
        </div>

        <!-- EVENTO / COMPETIÇÃO -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Competição</label>
            <input type="text" id="competition" class="form-input" placeholder="Ex: Brasileirão" value="${v('competition')}" list="competition-list">
            <datalist id="competition-list">
              <option value="Brasileirão Série A"><option value="Brasileirão Série B">
              <option value="Champions League"><option value="Europa League"><option value="Conference League">
              <option value="Premier League"><option value="La Liga"><option value="Serie A (ITA)"><option value="Bundesliga"><option value="Ligue 1">
              <option value="Copa do Brasil"><option value="Libertadores"><option value="Sul-Americana">
              <option value="Copa América"><option value="Eliminatórias">
              <option value="NBA"><option value="NBB"><option value="Euroleague">
              <option value="Grand Slam"><option value="ATP Masters 1000"><option value="ATP 500"><option value="WTA 1000">
              <option value="NFL"><option value="UFC"><option value="CS:GO Major">
            </datalist>
          </div>
          <div class="form-group">
            <label class="form-label">Casa de Apostas</label>
            <select id="bookmaker" class="form-input">
              <option value="">Selecione...</option>
              ${bookmakers.map(b=>`<option ${v('bookmaker')===b?'selected':''}>${b}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Evento / Partida</label>
          <input type="text" id="event" class="form-input" placeholder="Ex: Flamengo x Palmeiras" value="${v('event')}" required>
        </div>

        <!-- MERCADO E PICK -->
        <div class="form-row">
          <div class="form-group" style="position:relative">
            <label class="form-label">Mercado</label>
            <input type="text" id="market" class="form-input" placeholder="Busque ou digite..." value="${v('market')}" list="market-list" onfocus="NewBetView.showMarketPicker()" autocomplete="off">
            <datalist id="market-list">${allMarkets.map(m=>`<option value="${m}">`).join('')}</datalist>
          </div>
          <div class="form-group">
            <label class="form-label">Sua Escolha (Pick)</label>
            <input type="text" id="pick" class="form-input" placeholder="Ex: Flamengo, Empate" value="${v('pick')||''}">
          </div>
        </div>

        <!-- MARKET PICKER ACCORDION -->
        <div id="market-picker" class="market-picker" style="display:none">
          ${Object.entries(marketsByCategory).map(([cat, items]) => `
            <div class="market-cat">
              <button type="button" class="market-cat-btn" onclick="NewBetView.toggleCat(this)">
                <span>${cat}</span><span class="market-cat-arrow">▸</span>
              </button>
              <div class="market-cat-items" style="display:none">
                ${items.map(m => `<button type="button" class="market-item ${v('market')===m?'market-item-active':''}" onclick="NewBetView.selectMarket('${m.replace(/'/g,"\\'")}')">${m}</button>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- ODD / STAKE -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Odd (Decimal)</label>
            <input type="number" id="odd" class="form-input" step="0.01" min="1.01" placeholder="2.00" value="${v('odd')||''}" required oninput="NewBetView.updatePotential()">
          </div>
          <div class="form-group">
            <label class="form-label">Stake (${sym})</label>
            <input type="number" id="stake" class="form-input" step="0.01" min="0.01" placeholder="${ds}" value="${v('stake')||ds}" required oninput="NewBetView.updatePotential()">
          </div>
        </div>

        <!-- POTENTIAL -->
        <div class="potential-card" id="potential-card">
          <div class="potential-item"><span>Retorno Potencial</span><strong id="pot-return">—</strong></div>
          <div class="potential-item"><span>Lucro Potencial</span><strong id="pot-profit" style="color:var(--success)">—</strong></div>
        </div>

        <!-- DATA -->
        <div class="form-group">
          <label class="form-label">Data / Hora</label>
          <input type="datetime-local" id="date" class="form-input" value="${bet ? new Date(bet.date).toISOString().slice(0,16) : defaultDate}">
        </div>

        <!-- RESULTADO -->
        <div class="form-section">
          <label class="form-label">Resultado</label>
          <div class="chip-group" id="result-group">
            ${results.map(r=>`<button type="button" class="chip ${(!bet&&r.v==='pending')||(bet&&bet.result===r.v)?'chip-active':''} chip-result-${r.v}" data-field="result" data-value="${r.v}" onclick="NewBetView.selectChip(this,'result-group')">${r.l}</button>`).join('')}
          </div>
          <input type="hidden" id="result" value="${v('result')||'pending'}">
        </div>

        <!-- NOTAS -->
        <div class="form-group">
          <label class="form-label">Notas (opcional)</label>
          <textarea id="notes" class="form-input" rows="2" placeholder="Análise, motivo da aposta...">${v('notes')}</textarea>
        </div>

        <button type="submit" class="btn btn-primary btn-full">${bet ? '💾 Salvar Alterações' : '➕ Registrar Aposta'}</button>
        ${bet ? '' : '<button type="button" class="btn btn-ghost btn-full" onclick="App.back()" style="margin-top:8px">Cancelar</button>'}
      </form>
    </div>`;
  };

  const afterRender = () => { updatePotential(); };

  const selectChip = (el, groupId) => {
    document.querySelectorAll(`#${groupId} .chip`).forEach(c => c.classList.remove('chip-active'));
    el.classList.add('chip-active');
    document.getElementById(el.dataset.field).value = el.dataset.value;
    if(el.dataset.field === 'result') updatePotential();
  };

  const updatePotential = () => {
    const odd   = parseFloat(document.getElementById('odd')?.value) || 0;
    const stake = parseFloat(document.getElementById('stake')?.value) || 0;
    const sym   = Storage.getSettings().currencySymbol || 'R$';
    const ret   = document.getElementById('pot-return');
    const prof  = document.getElementById('pot-profit');
    if(!ret || !prof) return;
    if(odd > 1 && stake > 0) {
      ret.textContent  = `${sym} ${(odd * stake).toFixed(2)}`;
      prof.textContent = `${sym} +${((odd-1)*stake).toFixed(2)}`;
    } else { ret.textContent = prof.textContent = '—'; }
  };

  const saveBet = (e) => {
    e.preventDefault();
    const br = Storage.getActiveBankroll();
    if(!br) { App.toast('Crie uma banca primeiro!','error'); return; }

    const get = id => document.getElementById(id)?.value?.trim();
    const sport = get('sport');
    if(!sport) { App.toast('Selecione um esporte','error'); return; }

    const data = {
      bankrollId:   br.id,
      betType:      get('betType') || 'single',
      sport,
      competition:  get('competition'),
      event:        get('event'),
      market:       get('market'),
      pick:         get('pick') || '',
      bookmaker:    get('bookmaker'),
      odd:          parseFloat(get('odd')),
      stake:        parseFloat(get('stake')),
      date:         new Date(get('date') || Date.now()).toISOString(),
      result:       get('result') || 'pending',
      notes:        get('notes'),
      tags:         []
    };

    if(editingId) {
      Storage.updateBet(editingId, data);
      App.toast('Aposta atualizada! ✅','success');
    } else {
      Storage.addBet(data);
      App.toast('Aposta registrada! 🎯','success');
    }
    App.navigate('dashboard');
  };

  const showMarketPicker = () => {
    const el = document.getElementById('market-picker');
    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  const toggleCat = (btn) => {
    const items = btn.nextElementSibling;
    const arrow = btn.querySelector('.market-cat-arrow');
    if(items.style.display === 'none') {
      items.style.display = 'flex';
      arrow.textContent = '▾';
    } else {
      items.style.display = 'none';
      arrow.textContent = '▸';
    }
  };

  const selectMarket = (name) => {
    const input = document.getElementById('market');
    if(input) input.value = name;
    document.querySelectorAll('.market-item').forEach(el => el.classList.remove('market-item-active'));
    const el = document.getElementById('market-picker');
    if(el) el.style.display = 'none';
    // Save custom market if not in default list
    const allDefaults = [];
    Object.values(marketsByCategory).forEach(arr => allDefaults.push(...arr));
    if(!allDefaults.includes(name)) {
      const s = Storage.getSettings();
      const custom = s.customMarkets || [];
      if(!custom.includes(name)) {
        custom.push(name);
        Storage.updateSettings({ customMarkets: custom });
      }
    }
  };

  const confirmDelete = (id) => {
    App.confirm('Excluir esta aposta?', () => {
      Storage.deleteBet(id);
      App.toast('Aposta excluída','info');
      App.navigate('bet-list');
    });
  };

  return { render, afterRender, selectChip, updatePotential, saveBet, confirmDelete, showMarketPicker, toggleCat, selectMarket };
})();
