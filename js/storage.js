/* =============================================
   JL Tips — IndexedDB Storage Layer
   Reads from memory cache, writes to IDB + cache
   ============================================= */
const Storage = (() => {
  let db = null;
  let cache = { bets: [], bankrolls: [], settings: null };

  const defaultSettings = () => ({
    currency:'BRL', currencySymbol:'R$', activeBankrollId:null,
    theme:'dark', stakeMethod:'fixed', defaultStake:50, unit:50
  });

  const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16);
  });

  // ── IndexedDB Init ────────────────────────
  const init = () => new Promise((resolve) => {
    const req = indexedDB.open('JLTipsDB', 1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains('bets'))      d.createObjectStore('bets', {keyPath:'id'});
      if(!d.objectStoreNames.contains('bankrolls'))  d.createObjectStore('bankrolls', {keyPath:'id'});
      if(!d.objectStoreNames.contains('settings'))   d.createObjectStore('settings', {keyPath:'key'});
    };
    req.onsuccess = e => {
      db = e.target.result;
      const tx = db.transaction(['bets','bankrolls','settings'],'readonly');
      const load = name => new Promise(r => {
        const items = [];
        tx.objectStore(name).openCursor().onsuccess = ev => {
          const c = ev.target.result;
          if(c) { items.push(c.value); c.continue(); } else r(items);
        };
      });
      Promise.all([load('bets'), load('bankrolls'), load('settings')]).then(([b,br,s]) => {
        cache.bets = b;
        cache.bankrolls = br;
        cache.settings = (s.length > 0 && s[0].data) ? s[0].data : defaultSettings();
        resolve();
      });
    };
    req.onerror = () => { cache.settings = defaultSettings(); resolve(); };
  });

  // ── DB write helpers ──────────────────────
  const dbPut     = (store, item) => { if(!db) return; try { db.transaction(store,'readwrite').objectStore(store).put(item); } catch(e){} };
  const dbDelete  = (store, id)   => { if(!db) return; try { db.transaction(store,'readwrite').objectStore(store).delete(id); } catch(e){} };
  const dbSaveAll = (store, items) => {
    if(!db) return;
    try {
      const tx = db.transaction(store,'readwrite');
      const s = tx.objectStore(store);
      s.clear();
      items.forEach(i => s.put(i));
    } catch(e){}
  };
  const dbSaveSettings = () => { dbPut('settings', { key:'main', data: cache.settings }); };

  // ── BET PROFIT CALC ───────────────────────
  const calcProfit = bet => {
    const s = parseFloat(bet.stake)||0, o = parseFloat(bet.odd)||1;
    switch(bet.result) {
      case 'won':       return +((o-1)*s).toFixed(2);
      case 'lost':      return -s;
      case 'void':      return 0;
      case 'half_won':  return +((o-1)*(s/2)).toFixed(2);
      case 'half_lost': return +(-(s/2)).toFixed(2);
      default:          return 0;
    }
  };

  // ── BETS ──────────────────────────────────
  const getBets = bid => bid ? cache.bets.filter(b => b.bankrollId === bid) : [...cache.bets];
  const getBet  = id  => cache.bets.find(b => b.id === id) || null;

  const addBet = bet => {
    const nb = { ...bet, id: uuid(), profit: calcProfit(bet), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    cache.bets.push(nb);
    dbPut('bets', nb);
    if(bet.result !== 'pending') recalcBankroll(bet.bankrollId);
    return nb;
  };

  const updateBet = (id, upd) => {
    const idx = cache.bets.findIndex(b => b.id === id);
    if(idx === -1) return null;
    const m = { ...cache.bets[idx], ...upd, updatedAt: new Date().toISOString() };
    m.profit = calcProfit(m);
    cache.bets[idx] = m;
    dbPut('bets', m);
    recalcBankroll(m.bankrollId);
    return m;
  };

  const deleteBet = id => {
    const bet = cache.bets.find(b => b.id === id);
    cache.bets = cache.bets.filter(b => b.id !== id);
    dbDelete('bets', id);
    if(bet) recalcBankroll(bet.bankrollId);
    return true;
  };

  // ── BANKROLLS ─────────────────────────────
  const getBankrolls = () => [...cache.bankrolls];
  const getBankroll  = id => cache.bankrolls.find(b => b.id === id) || null;

  const addBankroll = data => {
    const nb = { ...data, id: uuid(), transactions: [], createdAt: new Date().toISOString() };
    cache.bankrolls.push(nb);
    dbPut('bankrolls', nb);
    return nb;
  };

  const updateBankroll = (id, upd) => {
    const idx = cache.bankrolls.findIndex(b => b.id === id);
    if(idx === -1) return null;
    cache.bankrolls[idx] = { ...cache.bankrolls[idx], ...upd };
    dbPut('bankrolls', cache.bankrolls[idx]);
    return cache.bankrolls[idx];
  };

  const deleteBankroll = id => {
    cache.bankrolls = cache.bankrolls.filter(b => b.id !== id);
    dbDelete('bankrolls', id);
    cache.bets = cache.bets.filter(b => b.bankrollId !== id);
    dbSaveAll('bets', cache.bets);
  };

  const addTransaction = (bankrollId, tx) => {
    const idx = cache.bankrolls.findIndex(b => b.id === bankrollId);
    if(idx === -1) return null;
    const ntx = { ...tx, id: uuid(), date: new Date().toISOString() };
    const br = cache.bankrolls[idx];
    if(!br.transactions) br.transactions = [];
    br.transactions.unshift(ntx);
    const amt = parseFloat(tx.amount);
    if(tx.type === 'deposit') {
      br.initialBalance = +((br.initialBalance + amt).toFixed(2));
      br.currentBalance = +((br.currentBalance + amt).toFixed(2));
    } else {
      br.currentBalance = +((br.currentBalance - amt).toFixed(2));
    }
    dbPut('bankrolls', br);
    return ntx;
  };

  const recalcBankroll = bankrollId => {
    const br = getBankroll(bankrollId);
    if(!br) return;
    const profit = getBets(bankrollId).filter(b => b.result !== 'pending').reduce((s,b) => s + (b.profit||0), 0);
    updateBankroll(bankrollId, { currentBalance: +((br.initialBalance + profit).toFixed(2)) });
  };

  // ── SETTINGS ──────────────────────────────
  const getSettings = () => cache.settings || defaultSettings();
  const updateSettings = upd => { cache.settings = { ...getSettings(), ...upd }; dbSaveSettings(); return cache.settings; };

  const getActiveBankroll = () => {
    const s = getSettings();
    if(s.activeBankrollId) { const b = getBankroll(s.activeBankrollId); if(b) return b; }
    if(cache.bankrolls.length > 0) { updateSettings({ activeBankrollId: cache.bankrolls[0].id }); return cache.bankrolls[0]; }
    return null;
  };

  // ── IMPORT / EXPORT ───────────────────────
  const exportData = () => JSON.stringify({
    bets: cache.bets, bankrolls: cache.bankrolls, settings: cache.settings, exportedAt: new Date().toISOString()
  }, null, 2);

  const importData = str => {
    try {
      const d = JSON.parse(str);
      if(d.bets)      { cache.bets = d.bets;           dbSaveAll('bets', d.bets); }
      if(d.bankrolls) { cache.bankrolls = d.bankrolls;  dbSaveAll('bankrolls', d.bankrolls); }
      if(d.settings)  { cache.settings = d.settings;    dbSaveSettings(); }
      return true;
    } catch { return false; }
  };

  const resetAll = () => {
    cache = { bets: [], bankrolls: [], settings: defaultSettings() };
    if(db) {
      try {
        const tx = db.transaction(['bets','bankrolls','settings'],'readwrite');
        tx.objectStore('bets').clear();
        tx.objectStore('bankrolls').clear();
        tx.objectStore('settings').clear();
      } catch(e){}
    }
  };

  // No seed — app starts empty
  const seed = () => {};

  return { init, uuid, calcProfit, getBets, getBet, addBet, updateBet, deleteBet,
    getBankrolls, getBankroll, addBankroll, updateBankroll, deleteBankroll,
    addTransaction, recalcBankroll, getSettings, updateSettings, getActiveBankroll,
    exportData, importData, resetAll, seed };
})();
