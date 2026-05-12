/* =============================================
   JL Tips — IndexedDB Storage Layer
   Reads from memory cache, writes to IDB + cache
   ============================================= */
const Storage = (() => {
  let db = null;
  let cache = { bets: [], bankrolls: [], settings: null };

  const defaultSettings = () => ({
    currency:'BRL', currencySymbol:'R$', activeBankrollId:null,
    theme:'dark', stakeMethod:'fixed', defaultStake:50, unit:50,
    apiFootballKey: ''
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
    syncBetToSupabase(nb).catch(console.error);
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
    syncBetToSupabase(m).catch(console.error);
    return m;
  };

  const deleteBet = id => {
    const bet = cache.bets.find(b => b.id === id);
    cache.bets = cache.bets.filter(b => b.id !== id);
    dbDelete('bets', id);
    if(bet) recalcBankroll(bet.bankrollId);
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.getUser()) {
      SupabaseClient.supabase.from('bets').delete().eq('id', id).catch(console.error);
    }
    return true;
  };

  // ── BANKROLLS ─────────────────────────────
  const getBankrolls = () => [...cache.bankrolls];
  const getBankroll  = id => cache.bankrolls.find(b => b.id === id) || null;

  const addBankroll = data => {
    const nb = { ...data, id: uuid(), transactions: [], createdAt: new Date().toISOString() };
    cache.bankrolls.push(nb);
    dbPut('bankrolls', nb);
    syncBankrollToSupabase(nb).catch(console.error);
    return nb;
  };

  const updateBankroll = (id, upd) => {
    const idx = cache.bankrolls.findIndex(b => b.id === id);
    if(idx === -1) return null;
    cache.bankrolls[idx] = { ...cache.bankrolls[idx], ...upd };
    dbPut('bankrolls', cache.bankrolls[idx]);
    syncBankrollToSupabase(cache.bankrolls[idx]).catch(console.error);
    return cache.bankrolls[idx];
  };

  const deleteBankroll = id => {
    cache.bankrolls = cache.bankrolls.filter(b => b.id !== id);
    dbDelete('bankrolls', id);
    cache.bets = cache.bets.filter(b => b.bankrollId !== id);
    dbSaveAll('bets', cache.bets);
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.getUser()) {
      SupabaseClient.supabase.from('bankrolls').delete().eq('id', id).catch(console.error);
    }
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
    syncBankrollToSupabase(br).catch(console.error);
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
  const updateSettings = upd => { 
    cache.settings = { ...getSettings(), ...upd }; 
    dbSaveSettings(); 
    if (typeof SupabaseClient !== 'undefined' && SupabaseClient.getUser()) {
      SupabaseClient.supabase.from('user_settings').upsert({ user_id: SupabaseClient.getUser().id, settings: cache.settings }).catch(console.error);
    }
    return cache.settings; 
  };

  const getActiveBankroll = () => {
    const s = getSettings();
    if(s.activeBankrollId) { const b = getBankroll(s.activeBankrollId); if(b) return b; }
    if(cache.bankrolls.length > 0) { updateSettings({ activeBankrollId: cache.bankrolls[0].id }); return cache.bankrolls[0]; }
    return null;
  };

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

  // --- SUPABASE SYNC ---
  const pullFromSupabase = async () => {
    if (typeof SupabaseClient === 'undefined') return;
    const user = SupabaseClient.getUser();
    if (!user) return;

    const { supabase } = SupabaseClient;
    
    // Pull Bets
    const { data: betsData } = await supabase.from('bets').select('*');
    if (betsData) {
      // Convert db snake_case to app camelCase
      const mappedBets = betsData.map(b => ({
        id: b.id, event: b.event, sport: b.sport, betType: b.bet_type, market: b.market,
        pick: b.pick, odd: parseFloat(b.odd), stake: parseFloat(b.stake), result: b.result,
        date: b.date, returnAmount: b.return_amount ? parseFloat(b.return_amount) : null,
        competition: b.competition
      }));
      cache.bets = mappedBets;
      dbSaveAll('bets', mappedBets);
    }

    // Pull Bankrolls
    const { data: brData } = await supabase.from('bankrolls').select('*');
    if (brData) {
      const mappedBR = brData.map(br => ({
        id: br.id, name: br.name, initialBalance: parseFloat(br.initial_amount),
        currentBalance: parseFloat(br.current_amount), currency: br.currency
      }));
      cache.bankrolls = mappedBR;
      dbSaveAll('bankrolls', mappedBR);
    }

    // Pull Settings
    const { data: settingsData } = await supabase.from('user_settings').select('*').single();
    if (settingsData && settingsData.settings) {
      cache.settings = { ...defaultSettings(), ...settingsData.settings };
      dbSaveSettings();
    }
  };

  const pushAllToSupabase = async () => {
    if (typeof SupabaseClient === 'undefined') return;
    const user = SupabaseClient.getUser();
    if (!user) return;

    const { supabase } = SupabaseClient;

    if (cache.bets.length > 0) {
      const mappedBets = cache.bets.map(b => ({
        id: b.id, user_id: user.id, event: b.event, sport: b.sport, bet_type: b.betType,
        market: b.market, pick: b.pick, odd: b.odd, stake: b.stake, result: b.result,
        date: new Date(b.date).toISOString(), return_amount: b.returnAmount, competition: b.competition
      }));
      await supabase.from('bets').upsert(mappedBets);
    }

    if (cache.bankrolls.length > 0) {
      const mappedBR = cache.bankrolls.map(br => ({
        id: br.id, user_id: user.id, name: br.name, initial_amount: br.initialBalance,
        current_amount: br.currentBalance, currency: br.currency
      }));
      await supabase.from('bankrolls').upsert(mappedBR);
    }

    await supabase.from('user_settings').upsert({
      user_id: user.id,
      settings: cache.settings
    });
  };

  const syncBetToSupabase = async (bet) => {
    if (typeof SupabaseClient === 'undefined') return;
    const user = SupabaseClient.getUser();
    if (!user) return;
    await SupabaseClient.supabase.from('bets').upsert({
      id: bet.id, user_id: user.id, event: bet.event, sport: bet.sport, bet_type: bet.betType,
      market: bet.market, pick: bet.pick, odd: bet.odd, stake: bet.stake, result: bet.result,
      date: new Date(bet.date).toISOString(), return_amount: bet.returnAmount, competition: bet.competition
    });
  };

  const syncBankrollToSupabase = async (br) => {
    if (typeof SupabaseClient === 'undefined') return;
    const user = SupabaseClient.getUser();
    if (!user) return;
    await SupabaseClient.supabase.from('bankrolls').upsert({
      id: br.id, user_id: user.id, name: br.name, initial_amount: br.initialBalance,
      current_amount: br.currentBalance, currency: br.currency
    });
  };

  // No seed — app starts empty
  const seed = () => {};

  return { init, uuid, calcProfit, getBets, getBet, addBet, updateBet, deleteBet,
    getBankrolls, getBankroll, addBankroll, updateBankroll, deleteBankroll,
    addTransaction, recalcBankroll, getSettings, updateSettings, getActiveBankroll,
    exportData, importData, resetAll, seed, pullFromSupabase, pushAllToSupabase,
    syncBetToSupabase, syncBankrollToSupabase };
})();
