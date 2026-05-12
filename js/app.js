const App = (() => {
  const routes = {
    'dashboard':   { view: DashboardView,   title: 'Dashboard',    icon: '🏠' },
    'games':       { view: GamesView,       title: 'Jogos do Dia', icon: '⚽' },
    'new-bet':     { view: NewBetView,      title: 'Nova Aposta',  icon: '➕' },
    'bet-list':    { view: BetListView,     title: 'Apostas',      icon: '📋' },
    'analytics':   { view: AnalyticsView,   title: 'Analytics',    icon: '📊' },
    'bankroll':    { view: BankrollView,    title: 'Bancas',       icon: '💰' },
    'calculators': { view: CalculatorsView, title: 'Calculadoras', icon: '🧮' },
    'settings':    { view: SettingsView,    title: 'Config',       icon: '⚙️' },
  };

  let currentRoute = 'dashboard';
  let history = ['dashboard'];

  const navigate = (route, param = null) => {
    if (!routes[route]) return;
    Charts.destroyAll();
    currentRoute = route;
    history.push(route);

    const main  = document.getElementById('main-content');
    const title = document.getElementById('header-title');
    const view  = routes[route].view;

    main.classList.add('page-exit');
    setTimeout(() => {
      main.innerHTML = view.render(param);
      main.classList.remove('page-exit');
      main.classList.add('page-enter');
      setTimeout(() => main.classList.remove('page-enter'), 300);
      if (typeof view.afterRender === 'function') view.afterRender();
    }, 150);

    if (title) title.textContent = route === 'dashboard' ? 'JL Tips' : routes[route].title;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('nav-active', n.dataset.route === route));
    document.getElementById('header-back').style.display = (route === 'dashboard') ? 'none' : 'flex';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    if (history.length > 1) { history.pop(); navigate(history[history.length - 1]); }
    else navigate('dashboard');
  };

  const toast = (msg, type = 'info') => {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = msg;
    container.appendChild(t);
    setTimeout(() => t.classList.add('toast-show'), 10);
    setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 400); }, 3200);
  };

  const openModal = (html) => {
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('modal-open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    document.getElementById('modal-overlay').classList.remove('modal-open');
    document.body.style.overflow = '';
  };

  const confirm = (msg, onConfirm) => {
    openModal(`
      <div class="confirm-icon">⚠️</div>
      <h3 class="modal-title">Confirmar</h3>
      <p class="modal-message">${msg}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="App.closeModal(); (${onConfirm.toString()})()">Confirmar</button>
      </div>`);
  };

  const updateBankrollHeader = () => {
    const br  = Storage.getActiveBankroll();
    const sym = Storage.getSettings().currencySymbol || 'R$';
    const el  = document.getElementById('header-balance');
    if (el && br) el.textContent = `${sym} ${br.currentBalance.toFixed(2)}`;
    else if (el) el.textContent = `${sym} —`;
  };

  const init = async () => {
    // Wait for IndexedDB to load
    await Storage.init();

    // Auto-apply user's API key if missing
    const s = Storage.getSettings();
    if (!s.apiFootballKey || s.apiFootballKey === '') {
      Storage.updateSettings({ apiFootballKey: 'cc1c33cdad8cb2bba798b6fb4ae3bae4' });
    }

    const main = document.getElementById('main-content');
    main.innerHTML = DashboardView.render();
    DashboardView.afterRender();
    updateBankrollHeader();

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => navigate(item.dataset.route));
    });
    document.getElementById('header-back').addEventListener('click', back);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') closeModal();
    });
    document.getElementById('nav-dashboard').classList.add('nav-active');
  };

  return { navigate, back, toast, openModal, closeModal, confirm, updateBankrollHeader, init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
