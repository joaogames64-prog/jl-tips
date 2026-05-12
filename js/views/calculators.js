const CalculatorsView = (() => {
  let activeCalc = 'kelly';

  const render = () => `
    <div class="view-container">
      <div class="page-header"><h2>Calculadoras</h2></div>
      <div class="calc-tabs">
        <button class="calc-tab ${activeCalc==='kelly'?'calc-tab-active':''}"    onclick="CalculatorsView.switchCalc('kelly')">Kelly</button>
        <button class="calc-tab ${activeCalc==='odds'?'calc-tab-active':''}"     onclick="CalculatorsView.switchCalc('odds')">Odds</button>
        <button class="calc-tab ${activeCalc==='surebet'?'calc-tab-active':''}"  onclick="CalculatorsView.switchCalc('surebet')">Surebet</button>
        <button class="calc-tab ${activeCalc==='dutching'?'calc-tab-active':''}" onclick="CalculatorsView.switchCalc('dutching')">Dutching</button>
      </div>
      <div id="calc-content">${renderCalc(activeCalc)}</div>
    </div>`;

  const renderCalc = (c) => {
    if(c==='kelly')    return renderKelly();
    if(c==='odds')     return renderOdds();
    if(c==='surebet')  return renderSurebet();
    if(c==='dutching') return renderDutching();
    return '';
  };

  const renderKelly = () => {
    const br  = Storage.getActiveBankroll();
    const sym = Storage.getSettings().currencySymbol || 'R$';
    const bal = br ? br.currentBalance : 0;
    return `
    <div class="calc-card">
      <div class="calc-desc">O <strong>Critério de Kelly</strong> calcula o stake ideal com base na sua probabilidade estimada de vitória e na odd oferecida.</div>
      <div class="form-group"><label class="form-label">Saldo da Banca (${sym})</label>
        <input id="k-bankroll" class="form-input" type="number" value="${bal}" oninput="CalculatorsView.calcKelly()"></div>
      <div class="form-group"><label class="form-label">Odd Decimal</label>
        <input id="k-odd" class="form-input" type="number" step="0.01" placeholder="2.00" oninput="CalculatorsView.calcKelly()"></div>
      <div class="form-group">
        <label class="form-label">Sua Probabilidade Estimada (%)</label>
        <input id="k-prob" class="form-input" type="number" step="0.1" min="1" max="99" placeholder="55" oninput="CalculatorsView.calcKelly()">
        <small class="form-hint">Odd implícita: <span id="k-implied">—</span></small>
      </div>
      <div class="calc-fraction-row">
        <label class="form-label">Fração de Kelly</label>
        <div class="fraction-btns">
          ${[1,0.5,0.25].map(f=>`<button class="chip ${f===1?'chip-active':''}" onclick="CalculatorsView.setKellyFrac(${f},this)">${f===1?'Full':f===0.5?'½':'¼'} Kelly</button>`).join('')}
        </div>
      </div>
      <div class="calc-result" id="kelly-result">
        <div class="result-row"><span>Stake Recomendado</span><strong id="k-stake">—</strong></div>
        <div class="result-row"><span>% da Banca</span><strong id="k-pct">—</strong></div>
        <div class="result-row"><span>Lucro Potencial</span><strong id="k-profit" style="color:var(--success)">—</strong></div>
        <div class="result-row"><span>Vantagem (Edge)</span><strong id="k-edge">—</strong></div>
      </div>
    </div>`;
  };

  const renderOdds = () => `
    <div class="calc-card">
      <div class="calc-desc">Converta odds entre os formatos <strong>Decimal, Fracionário, Americano</strong> e veja a probabilidade implícita.</div>
      <div class="form-group"><label class="form-label">Formato de Entrada</label>
        <select id="o-from" class="form-input" onchange="CalculatorsView.calcOdds()">
          <option value="decimal">Decimal (ex: 2.50)</option>
          <option value="fractional">Fracionário (ex: 3/2)</option>
          <option value="american">Americano (ex: +150)</option>
        </select></div>
      <div class="form-group"><label class="form-label">Valor</label>
        <input id="o-value" class="form-input" placeholder="2.50" oninput="CalculatorsView.calcOdds()"></div>
      <div class="calc-result" id="odds-result">
        <div class="result-row"><span>🔢 Decimal</span><strong id="o-dec">—</strong></div>
        <div class="result-row"><span>📐 Fracionário</span><strong id="o-frac">—</strong></div>
        <div class="result-row"><span>🇺🇸 Americano</span><strong id="o-amer">—</strong></div>
        <div class="result-row"><span>📊 Prob. Implícita</span><strong id="o-impl">—</strong></div>
      </div>
    </div>`;

  const renderSurebet = () => `
    <div class="calc-card">
      <div class="calc-desc">Uma <strong>Surebet (Arbitragem)</strong> garante lucro independente do resultado, aproveitando diferenças de odds entre casas.</div>
      <div class="form-group"><label class="form-label">Stake Total (R$)</label>
        <input id="sb-total" class="form-input" type="number" value="1000" oninput="CalculatorsView.calcSurebet()"></div>
      <div class="form-group"><label class="form-label">Número de Resultados</label>
        <select id="sb-count" class="form-input" onchange="CalculatorsView.updateSurebetInputs()">
          <option value="2">2 resultados (1X2 / Over-Under)</option>
          <option value="3">3 resultados (Casa/Empate/Fora)</option>
        </select></div>
      <div id="sb-odds-inputs">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Odd 1</label><input id="sb-odd-0" class="form-input" type="number" step="0.01" placeholder="2.10" oninput="CalculatorsView.calcSurebet()"></div>
          <div class="form-group"><label class="form-label">Odd 2</label><input id="sb-odd-1" class="form-input" type="number" step="0.01" placeholder="1.95" oninput="CalculatorsView.calcSurebet()"></div>
        </div>
      </div>
      <div class="calc-result" id="surebet-result"><p class="text-muted" style="text-align:center">Preencha as odds acima</p></div>
    </div>`;

  const renderDutching = () => `
    <div class="calc-card">
      <div class="calc-desc"><strong>Dutching</strong>: distribua seu stake entre múltiplas seleções do mesmo mercado para ter lucro igual em qualquer resultado.</div>
      <div class="form-group"><label class="form-label">Stake Total (R$)</label>
        <input id="dt-total" class="form-input" type="number" value="100" oninput="CalculatorsView.calcDutching()"></div>
      <div class="form-group"><label class="form-label">Odds (separadas por vírgula)</label>
        <input id="dt-odds" class="form-input" placeholder="ex: 3.50, 2.80, 4.20" oninput="CalculatorsView.calcDutching()"></div>
      <div class="calc-result" id="dutching-result"><p class="text-muted" style="text-align:center">Preencha as odds acima</p></div>
    </div>`;

  let kellyFrac = 1;
  const setKellyFrac = (f, el) => {
    kellyFrac = f;
    document.querySelectorAll('.fraction-btns .chip').forEach(c=>c.classList.remove('chip-active'));
    el.classList.add('chip-active');
    calcKelly();
  };

  const calcKelly = () => {
    const bankroll = parseFloat(document.getElementById('k-bankroll')?.value) || 0;
    const odd      = parseFloat(document.getElementById('k-odd')?.value) || 0;
    const probPct  = parseFloat(document.getElementById('k-prob')?.value) || 0;
    const sym      = Storage.getSettings().currencySymbol || 'R$';

    const impl = document.getElementById('k-implied');
    if(impl && odd > 1) impl.textContent = `${(1/odd*100).toFixed(1)}%`;

    if(!bankroll || odd <= 1 || !probPct) return;
    const prob = probPct / 100;
    const b    = odd - 1;
    const edge = prob * b - (1 - prob);
    const fstar = Math.max(0, edge / b) * kellyFrac;
    const stake = +(fstar * bankroll).toFixed(2);

    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('k-stake',  `${sym} ${stake.toFixed(2)}`);
    set('k-pct',    `${(fstar*100).toFixed(2)}%`);
    set('k-profit', stake > 0 ? `${sym} +${(b*stake).toFixed(2)}` : '—');
    set('k-edge',   `${(edge*100).toFixed(2)}%`);

    const res = document.getElementById('kelly-result');
    if(res) res.style.borderColor = edge > 0 ? 'var(--success)' : 'var(--danger)';
  };

  const calcOdds = () => {
    const from  = document.getElementById('o-from')?.value;
    const rawV  = document.getElementById('o-value')?.value;
    if(!rawV || !from) return;
    const value = from === 'fractional' ? rawV : parseFloat(rawV);
    if(!value) return;
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    try {
      const dec  = Calc.convertOdd(value, from, 'decimal');
      const frac = Calc.convertOdd(value, from, 'fractional');
      const amer = Calc.convertOdd(value, from, 'american');
      const impl = Calc.convertOdd(value, from, 'implied');
      set('o-dec',  dec); set('o-frac', `${frac}/1`);
      set('o-amer', amer > 0 ? `+${amer}` : amer); set('o-impl', `${impl}%`);
    } catch(e) { console.warn(e); }
  };

  const updateSurebetInputs = () => {
    const count = parseInt(document.getElementById('sb-count')?.value) || 2;
    const cont  = document.getElementById('sb-odds-inputs');
    if(!cont) return;
    const labels = ['Odd 1 (Casa)','Odd 2 (Empate)','Odd 3 (Fora)'];
    let html = '<div class="form-row">';
    for(let i=0;i<count;i++) html += `<div class="form-group"><label class="form-label">${labels[i]||`Odd ${i+1}`}</label><input id="sb-odd-${i}" class="form-input" type="number" step="0.01" placeholder="${(2+i*0.3).toFixed(2)}" oninput="CalculatorsView.calcSurebet()"></div>`;
    html += '</div>';
    cont.innerHTML = html;
    document.getElementById('surebet-result').innerHTML = '<p class="text-muted" style="text-align:center">Preencha as odds acima</p>';
  };

  const calcSurebet = () => {
    const total = parseFloat(document.getElementById('sb-total')?.value) || 0;
    const count = parseInt(document.getElementById('sb-count')?.value) || 2;
    const sym   = Storage.getSettings().currencySymbol || 'R$';
    const odds  = [];
    for(let i=0;i<count;i++) { const v=parseFloat(document.getElementById(`sb-odd-${i}`)?.value)||0; odds.push(v); }
    if(odds.some(o=>o<=1)||!total) return;
    const res = Calc.surebet(odds);
    const el  = document.getElementById('surebet-result');
    if(!el) return;
    const returnAmt = +(total / odds.reduce((s,o)=>s+1/o,0)).toFixed(2);
    el.innerHTML = `
      <div class="surebet-badge ${res.isArbitrage?'surebet-yes':'surebet-no'}">
        ${res.isArbitrage ? '✅ SUREBET ENCONTRADA!' : '❌ Sem Arbitragem'}
        <span>${res.isArbitrage?`Margem: ${Math.abs(res.margin).toFixed(2)}%`:`Margem da casa: ${res.margin.toFixed(2)}%`}</span>
      </div>
      ${odds.map((o,i)=>`
        <div class="result-row"><span>Stake ${i+1} (@${o})</span><strong>${sym} ${res.stakes[i]?((res.stakes[i]/100)*total).toFixed(2):'—'}</strong></div>`).join('')}
      <div class="result-row"><span>Retorno Garantido</span><strong>${sym} ${returnAmt}</strong></div>
      ${res.isArbitrage?`<div class="result-row"><span>Lucro Garantido</span><strong style="color:var(--success)">${sym} +${(returnAmt-total).toFixed(2)}</strong></div>`:''}`;
  };

  const calcDutching = () => {
    const total   = parseFloat(document.getElementById('dt-total')?.value) || 0;
    const rawOdds = document.getElementById('dt-odds')?.value || '';
    const sym     = Storage.getSettings().currencySymbol || 'R$';
    const odds    = rawOdds.split(',').map(v=>parseFloat(v.trim())).filter(v=>v>1);
    const el      = document.getElementById('dutching-result');
    if(!el) return;
    if(odds.length < 2 || !total) { el.innerHTML = '<p class="text-muted" style="text-align:center">Preencha as odds acima</p>'; return; }
    const res = Calc.dutching(total, odds);
    el.innerHTML = `
      ${odds.map((o,i)=>`
        <div class="result-row"><span>Stake ${i+1} (@${o.toFixed(2)})</span><strong>${sym} ${res.stakes[i]}</strong></div>`).join('')}
      <div class="result-row" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px">
        <span>Retorno Garantido</span><strong>${sym} ${res.return}</strong>
      </div>
      <div class="result-row"><span>Lucro</span><strong style="color:${res.profit>=0?'var(--success)':'var(--danger)'}">${res.profit>=0?'+':''}${sym} ${res.profit}</strong></div>`;
  };

  const switchCalc = (c) => {
    activeCalc = c;
    document.querySelectorAll('.calc-tab').forEach(b=>b.classList.remove('calc-tab-active'));
    document.querySelectorAll('.calc-tab')[['kelly','odds','surebet','dutching'].indexOf(c)]?.classList.add('calc-tab-active');
    const el = document.getElementById('calc-content');
    if(el) el.innerHTML = renderCalc(c);
  };

  return { render, afterRender:()=>{}, switchCalc, setKellyFrac, calcKelly, calcOdds, updateSurebetInputs, calcSurebet, calcDutching };
})();
