const SettingsView = (() => {

  const render = () => {
    const s   = Storage.getSettings();
    const sym = s.currencySymbol || 'R$';
    const br  = Storage.getActiveBankroll();
    const totalBets = br ? Storage.getBets(br.id).length : 0;

    return `
    <div class="view-container">
      <div class="page-header"><h2>Configurações</h2></div>

      <div class="card">
        <div class="card-header"><span class="card-title">💱 Moeda</span></div>
        <div class="chip-group" id="currency-group">
          ${[{c:'BRL',s:'R$'},{c:'EUR',s:'€'},{c:'USD',s:'$'},{c:'GBP',s:'£'}].map(cur=>`
            <button type="button" class="chip ${s.currency===cur.c?'chip-active':''}"
              onclick="SettingsView.setCurrency('${cur.c}','${cur.s}',this)">${cur.s} ${cur.c}</button>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">📦 Stake Padrão</span></div>
        <div class="form-group">
          <label class="form-label">Valor padrão ao registrar aposta (${sym})</label>
          <input id="default-stake" class="form-input" type="number" step="0.01" min="1"
            value="${s.defaultStake||50}" onchange="SettingsView.saveStake()">
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">🔑 API de Resultados</span></div>
        <p class="text-muted" style="font-size:12px;margin-bottom:12px">Para sincronizar resultados automaticamente, insira sua API Key do <a href="https://www.api-football.com/" target="_blank" style="color:var(--primary-light);text-decoration:underline">API-Football</a>.</p>
        <div class="form-group">
          <label class="form-label">API Key</label>
          <input id="api-football-key" class="form-input" type="text" placeholder="Cole sua chave aqui..."
            value="${s.apiFootballKey||''}" onchange="SettingsView.saveApiKey()">
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">💾 Dados</span></div>
        <div class="settings-actions">
          <button class="btn btn-ghost btn-full" onclick="SettingsView.exportData()">
            📤 Exportar Dados (JSON)
          </button>
          <label class="btn btn-ghost btn-full" style="cursor:pointer;text-align:center">
            📥 Importar Dados (JSON)
            <input type="file" accept=".json" style="display:none" onchange="SettingsView.importData(event)">
          </label>
        </div>
      </div>

      <!-- CONTA -->
      <div class="card">
        <div class="card-header"><span class="card-title">☁️ Conta e Nuvem</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 4px 0;">
          <div>
            <div style="font-weight:600">${window.SupabaseClient && SupabaseClient.getUser() ? SupabaseClient.getUser().email : 'Modo Offline (Local)'}</div>
            <div style="font-size:12px; color:var(--text-muted)">${window.SupabaseClient && SupabaseClient.getUser() ? 'Sincronização ativa' : 'Faça login para salvar na nuvem'}</div>
          </div>
          ${window.SupabaseClient && SupabaseClient.getUser() 
            ? `<button class="btn btn-danger-soft btn-sm" onclick="SettingsView.logout()">Sair</button>`
            : `<button class="btn btn-primary btn-sm" onclick="App.navigate('auth')">Login</button>`
          }
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">ℹ️ Sobre</span></div>
        <div class="about-info">
          <div class="about-row"><span>App</span><span>BetTrack Pro</span></div>
          <div class="about-row"><span>Versão</span><span>1.1.0 (Cloud)</span></div>
          <div class="about-row"><span>Apostas registradas</span><span>${totalBets}</span></div>
          <div class="about-row"><span>Armazenamento</span><span>${window.SupabaseClient && SupabaseClient.getUser() ? 'Supabase (Nuvem)' : 'LocalStorage (offline)'}</span></div>
        </div>
      </div>

      <div class="card card-danger">
        <div class="card-header"><span class="card-title" style="color:var(--danger)">⚠️ Zona de Perigo</span></div>
        <p class="text-muted" style="font-size:13px;margin-bottom:12px">Estas ações são irreversíveis.</p>
        <button class="btn btn-danger btn-full" onclick="SettingsView.confirmReset()">
          🗑 Apagar Todos os Dados
        </button>
      </div>
    </div>`;
  };

  const setCurrency = (currency, symbol, el) => {
    Storage.updateSettings({ currency, currencySymbol: symbol });
    document.querySelectorAll('#currency-group .chip').forEach(c => c.classList.remove('chip-active'));
    el.classList.add('chip-active');
    App.toast(`Moeda alterada para ${symbol}`,'success');
  };

  const saveStake = () => {
    const v = parseFloat(document.getElementById('default-stake')?.value);
    if(v && v > 0) { Storage.updateSettings({ defaultStake: v }); App.toast('Stake padrão salvo ✅','success'); }
  };

  const saveApiKey = () => {
    const key = document.getElementById('api-football-key')?.value || '';
    Storage.updateSettings({ apiFootballKey: key });
    App.toast('API Key salva ✅', 'success');
  };

  const exportData = () => {
    const json = Storage.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `bettrack-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    App.toast('Dados exportados! 📤','success');
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = Storage.importData(ev.target.result);
      if(ok) { App.toast('Dados importados! ✅','success'); App.navigate('dashboard'); }
      else   { App.toast('Arquivo inválido ❌','error'); }
    };
    reader.readAsText(file);
  };

  const confirmReset = () => {
    App.confirm('Isso apagará TODOS os dados permanentemente. Tem certeza?', () => {
      Storage.resetAll();
      App.toast('Dados apagados','info');
      location.reload();
    });
  };

  const logout = async () => {
    App.confirm('Sair da conta vai apagar os dados deste aparelho por segurança. Tem certeza?', async () => {
      try {
        await SupabaseClient.signOut();
        Storage.resetAll();
        App.toast('Logout realizado', 'success');
        App.navigate('auth');
      } catch(e) {
        App.toast('Erro ao sair', 'error');
      }
    });
  };

  return { render, afterRender:()=>{}, setCurrency, saveStake, saveApiKey, exportData, importData, confirmReset, logout };
})();
