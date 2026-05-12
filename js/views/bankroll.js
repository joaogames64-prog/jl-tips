const BankrollView = (() => {

  const render = () => {
    const bankrolls = Storage.getBankrolls();
    const active    = Storage.getActiveBankroll();
    const sym       = Storage.getSettings().currencySymbol || 'R$';

    return `
    <div class="view-container">
      <div class="page-header">
        <h2>Bancas</h2>
        <button class="btn btn-primary btn-sm" onclick="BankrollView.showNewBankrollModal()">＋ Nova</button>
      </div>

      ${bankrolls.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">💰</div>
          <h3>Nenhuma banca</h3>
          <p>Crie sua primeira banca para começar a rastrear apostas.</p>
          <button class="btn btn-primary" onclick="BankrollView.showNewBankrollModal()">Criar Banca</button>
        </div>` : bankrolls.map(br => bankrollCard(br, active, sym)).join('')}
    </div>`;
  };

  const bankrollCard = (br, active, sym) => {
    const bets    = Storage.getBets(br.id);
    const stats   = Calc.fullStats(bets, br.initialBalance);
    const isActive = active && active.id === br.id;
    const pc = br.currentBalance >= br.initialBalance ? 'var(--success)' : 'var(--danger)';
    const diff = br.currentBalance - br.initialBalance;
    const txs = (br.transactions || []).slice(0,3);

    return `
    <div class="bankroll-card ${isActive?'bankroll-card-active':''}">
      <div class="bankroll-card-top">
        <div>
          <div class="bankroll-name">${br.name} ${isActive?'<span class="badge badge-primary">Ativa</span>':''}</div>
          <div class="bankroll-balance">${sym} ${br.currentBalance.toFixed(2)}</div>
          <div class="bankroll-diff" style="color:${pc}">${diff>=0?'+':''}${sym} ${diff.toFixed(2)} · ${stats.roi.toFixed(1)}% ROI</div>
        </div>
        <div class="bankroll-menu">
          ${!isActive ? `<button class="btn btn-ghost btn-sm" onclick="BankrollView.setActive('${br.id}')">Ativar</button>` : ''}
          <button class="btn-icon" onclick="BankrollView.showEditModal('${br.id}')">✏️</button>
          ${!isActive ? `<button class="btn-icon btn-danger-soft" onclick="BankrollView.confirmDelete('${br.id}')">🗑</button>` : ''}
        </div>
      </div>

      <div class="bankroll-stats-row">
        <div class="bk-stat"><span>${bets.length}</span><small>Apostas</small></div>
        <div class="bk-stat"><span>${stats.winRate.toFixed(0)}%</span><small>Win Rate</small></div>
        <div class="bk-stat"><span>${stats.won}</span><small>Vitórias</small></div>
        <div class="bk-stat"><span>${stats.lost}</span><small>Derrotas</small></div>
      </div>

      <div class="bankroll-actions">
        <button class="btn btn-success-soft btn-sm" onclick="BankrollView.showTxModal('${br.id}','deposit')">⬆️ Depósito</button>
        <button class="btn btn-danger-soft  btn-sm" onclick="BankrollView.showTxModal('${br.id}','withdraw')">⬇️ Saque</button>
        <button class="btn btn-ghost        btn-sm" onclick="BankrollView.toggleHistory('${br.id}')">📋 Histórico</button>
      </div>

      <div id="history-${br.id}" class="tx-history" style="display:none">
        ${(br.transactions||[]).length===0
          ? `<p class="text-muted" style="text-align:center;padding:12px">Sem transações</p>`
          : (br.transactions||[]).map(tx=>`
            <div class="tx-row">
              <span>${tx.type==='deposit'?'⬆️':'⬇️'} ${tx.note||tx.type}</span>
              <span style="color:${tx.type==='deposit'?'var(--success)':'var(--danger)'}">
                ${tx.type==='deposit'?'+':'−'}${sym} ${parseFloat(tx.amount).toFixed(2)}
              </span>
              <span class="text-muted" style="font-size:11px">${new Date(tx.date).toLocaleDateString('pt-BR')}</span>
            </div>`).join('')}
      </div>
    </div>`;
  };

  const setActive = (id) => {
    Storage.updateSettings({ activeBankrollId: id });
    App.toast('Banca ativada ✅','success');
    App.navigate('bankroll');
  };

  const showNewBankrollModal = () => {
    App.openModal(`
      <h3 class="modal-title">Nova Banca</h3>
      <div class="form-group"><label class="form-label">Nome</label>
        <input id="br-name" class="form-input" placeholder="Ex: Banca Principal" /></div>
      <div class="form-group"><label class="form-label">Saldo Inicial (R$)</label>
        <input id="br-balance" class="form-input" type="number" min="0" step="0.01" placeholder="1000" /></div>
      <div class="form-group"><label class="form-label">Unidade de Aposta (R$)</label>
        <input id="br-unit" class="form-input" type="number" min="1" step="1" placeholder="50" /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="BankrollView.createBankroll()">Criar</button>
      </div>`);
  };

  const createBankroll = () => {
    const name    = document.getElementById('br-name')?.value?.trim();
    const balance = parseFloat(document.getElementById('br-balance')?.value) || 0;
    const unit    = parseFloat(document.getElementById('br-unit')?.value) || 50;
    if(!name) { App.toast('Digite um nome','error'); return; }
    const br = Storage.addBankroll({ name, initialBalance:balance, currentBalance:balance, currency:'BRL', unit });
    Storage.updateSettings({ activeBankrollId: br.id });
    App.closeModal();
    App.toast('Banca criada! 🎉','success');
    App.navigate('bankroll');
  };

  const showEditModal = (id) => {
    const br = Storage.getBankroll(id);
    if(!br) return;
    App.openModal(`
      <h3 class="modal-title">Editar Banca</h3>
      <div class="form-group"><label class="form-label">Nome</label>
        <input id="br-edit-name" class="form-input" value="${br.name}" /></div>
      <div class="form-group"><label class="form-label">Unidade de Aposta (R$)</label>
        <input id="br-edit-unit" class="form-input" type="number" value="${br.unit||50}" /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="BankrollView.saveBankroll('${id}')">Salvar</button>
      </div>`);
  };

  const saveBankroll = (id) => {
    const name = document.getElementById('br-edit-name')?.value?.trim();
    const unit = parseFloat(document.getElementById('br-edit-unit')?.value) || 50;
    if(!name) { App.toast('Digite um nome','error'); return; }
    Storage.updateBankroll(id, { name, unit });
    App.closeModal(); App.toast('Atualizado ✅','success'); App.navigate('bankroll');
  };

  const showTxModal = (id, type) => {
    const label = type === 'deposit' ? 'Depósito' : 'Saque';
    App.openModal(`
      <h3 class="modal-title">${label}</h3>
      <div class="form-group"><label class="form-label">Valor (R$)</label>
        <input id="tx-amount" class="form-input" type="number" min="0.01" step="0.01" placeholder="0,00" /></div>
      <div class="form-group"><label class="form-label">Descrição (opcional)</label>
        <input id="tx-note" class="form-input" placeholder="${label}..." /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button class="btn ${type==='deposit'?'btn-success':'btn-danger'}" onclick="BankrollView.addTx('${id}','${type}')">${label}</button>
      </div>`);
  };

  const addTx = (id, type) => {
    const amount = parseFloat(document.getElementById('tx-amount')?.value);
    const note   = document.getElementById('tx-note')?.value?.trim();
    if(!amount || amount <= 0) { App.toast('Valor inválido','error'); return; }
    Storage.addTransaction(id, { type, amount, note });
    App.closeModal(); App.toast(`${type==='deposit'?'Depósito':'Saque'} registrado ✅`,'success');
    App.navigate('bankroll');
  };

  const toggleHistory = (id) => {
    const el = document.getElementById(`history-${id}`);
    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  const confirmDelete = (id) => {
    App.confirm('Excluir esta banca e todas as apostas?', () => {
      Storage.deleteBankroll(id);
      App.toast('Banca excluída','info');
      App.navigate('bankroll');
    });
  };

  return { render, afterRender:()=>{}, setActive, showNewBankrollModal, createBankroll, showEditModal, saveBankroll, showTxModal, addTx, toggleHistory, confirmDelete };
})();
