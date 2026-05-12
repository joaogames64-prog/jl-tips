/* DateFilter — reusable date range picker component */
const DateFilter = (() => {
  const presets = [
    { key:'today',   label:'Hoje' },
    { key:'yesterday', label:'Ontem' },
    { key:'7d',      label:'7 dias' },
    { key:'30d',     label:'30 dias' },
    { key:'90d',     label:'90 dias' },
    { key:'all',     label:'Tudo' },
    { key:'custom',  label:'📅 Período' },
  ];

  const getRange = (key) => {
    const now  = new Date();
    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay   = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    switch(key) {
      case 'today': return { from: startOfDay(now), to: endOfDay(now) };
      case 'yesterday': {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        return { from: startOfDay(y), to: endOfDay(y) };
      }
      case '7d':  { const d=new Date(now); d.setDate(d.getDate()-7);  return { from:startOfDay(d), to:endOfDay(now) }; }
      case '30d': { const d=new Date(now); d.setDate(d.getDate()-30); return { from:startOfDay(d), to:endOfDay(now) }; }
      case '90d': { const d=new Date(now); d.setDate(d.getDate()-90); return { from:startOfDay(d), to:endOfDay(now) }; }
      case 'all':  return { from: new Date(2000,0,1), to: endOfDay(now) };
      default:     return { from: new Date(2000,0,1), to: endOfDay(now) };
    }
  };

  const filterBets = (bets, key, customFrom, customTo) => {
    let range;
    if(key === 'custom' && customFrom && customTo) {
      range = { from: new Date(customFrom), to: new Date(customTo + 'T23:59:59') };
    } else {
      range = getRange(key);
    }
    return bets.filter(b => {
      const d = new Date(b.date);
      return d >= range.from && d <= range.to;
    });
  };

  const render = (activeKey, onChangeCallback, prefix = 'df') => {
    return `
      <div class="date-filter">
        <div class="date-chips" id="${prefix}-chips">
          ${presets.map(p => `
            <button type="button" class="date-chip ${activeKey===p.key?'date-chip-active':''}"
              onclick="${onChangeCallback}('${p.key}')">${p.label}</button>
          `).join('')}
        </div>
        <div id="${prefix}-custom" class="date-custom" style="display:${activeKey==='custom'?'flex':'none'}">
          <input type="date" id="${prefix}-from" class="form-input date-input" onchange="${onChangeCallback}('custom')">
          <span class="date-sep">até</span>
          <input type="date" id="${prefix}-to" class="form-input date-input" onchange="${onChangeCallback}('custom')">
        </div>
      </div>`;
  };

  const getCustomDates = (prefix = 'df') => {
    return {
      from: document.getElementById(`${prefix}-from`)?.value || '',
      to:   document.getElementById(`${prefix}-to`)?.value || ''
    };
  };

  const showCustom = (key, prefix = 'df') => {
    const el = document.getElementById(`${prefix}-custom`);
    if(el) el.style.display = key === 'custom' ? 'flex' : 'none';
  };

  return { presets, getRange, filterBets, render, getCustomDates, showCustom };
})();
