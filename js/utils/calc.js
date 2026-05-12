const Calc = (() => {

  const settled = bets => bets.filter(b => b.result !== 'pending');
  const won     = bets => bets.filter(b => b.result === 'won' || b.result === 'half_won');
  const lost    = bets => bets.filter(b => b.result === 'lost' || b.result === 'half_lost');

  const totalStaked  = bets => settled(bets).reduce((s,b)=>s+(parseFloat(b.stake)||0),0);
  const totalProfit  = bets => settled(bets).reduce((s,b)=>s+(b.profit||0),0);
  const winRate      = bets => { const s=settled(bets); return s.length ? (won(s).length/s.length)*100 : 0; };
  const roi          = bets => { const ts=totalStaked(bets); return ts ? (totalProfit(bets)/ts)*100 : 0; };
  const avgOdd       = bets => { const s=settled(bets); return s.length ? s.reduce((a,b)=>a+(parseFloat(b.odd)||0),0)/s.length : 0; };
  const avgStake     = bets => { const s=settled(bets); return s.length ? totalStaked(s)/s.length : 0; };

  const maxDrawdown  = (bets, initialBalance) => {
    let peak=initialBalance, maxDD=0, balance=initialBalance;
    const sorted=[...settled(bets)].sort((a,b)=>new Date(a.date)-new Date(b.date));
    sorted.forEach(b=>{ balance+=b.profit||0; if(balance>peak)peak=balance; const dd=peak-balance; if(dd>maxDD)maxDD=dd; });
    return maxDD;
  };

  const streaks = bets => {
    const s=[...settled(bets)].sort((a,b)=>new Date(a.date)-new Date(b.date));
    let curW=0,curL=0,maxW=0,maxL=0;
    s.forEach(b=>{
      if(b.result==='won'||b.result==='half_won'){curW++;curL=0;if(curW>maxW)maxW=curW;}
      else if(b.result==='lost'||b.result==='half_lost'){curL++;curW=0;if(curL>maxL)maxL=curL;}
    });
    return {currentWin:curW,currentLoss:curL,maxWin:maxW,maxLoss:maxL};
  };

  const groupBy = (bets, key) => {
    const map={};
    settled(bets).forEach(b=>{
      const k=b[key]||'Outros';
      if(!map[k]) map[k]={count:0,won:0,lost:0,profit:0,staked:0};
      map[k].count++;
      if(b.result==='won'||b.result==='half_won') map[k].won++;
      else if(b.result==='lost'||b.result==='half_lost') map[k].lost++;
      map[k].profit+=b.profit||0;
      map[k].staked+=parseFloat(b.stake)||0;
    });
    Object.keys(map).forEach(k=>{ const m=map[k]; m.roi=m.staked?((m.profit/m.staked)*100):0; m.winRate=m.count?(m.won/m.count*100):0; });
    return map;
  };

  const bankrollCurve = (bets, initialBalance) => {
    const sorted=[...settled(bets)].sort((a,b)=>new Date(a.date)-new Date(b.date));
    let bal=initialBalance;
    const points=[{date:'Início',balance:bal}];
    sorted.forEach(b=>{ bal+=b.profit||0; const d=new Date(b.date); points.push({date:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}), balance:+bal.toFixed(2), event:b.event}); });
    return points;
  };

  const monthlyStats = bets => {
    const map={};
    settled(bets).forEach(b=>{
      const d=new Date(b.date), k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if(!map[k]) map[k]={label:'',profit:0,staked:0,won:0,total:0};
      map[k].profit+=b.profit||0; map[k].staked+=parseFloat(b.stake)||0; map[k].total++;
      if(b.result==='won'||b.result==='half_won') map[k].won++;
      const [y,m]=k.split('-');
      map[k].label=new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).map(([,v])=>v);
  };

  const oddDistribution = bets => {
    const buckets={'1.01-1.50':0,'1.51-2.00':0,'2.01-2.50':0,'2.51-3.00':0,'3.01+':0};
    settled(bets).forEach(b=>{
      const o=parseFloat(b.odd)||0;
      if(o<=1.50) buckets['1.01-1.50']++;
      else if(o<=2.00) buckets['1.51-2.00']++;
      else if(o<=2.50) buckets['2.01-2.50']++;
      else if(o<=3.00) buckets['2.51-3.00']++;
      else buckets['3.01+']++;
    });
    return buckets;
  };

  const fullStats = (bets, initialBalance) => {
    const s=settled(bets), ts=totalStaked(s), tp=totalProfit(s);
    return {
      total:bets.length, settled:s.length, pending:bets.filter(b=>b.result==='pending').length,
      won:won(s).length, lost:lost(s).length, void:s.filter(b=>b.result==='void').length,
      winRate:winRate(s), roi:roi(s), yield:ts?((tp/ts)*100):0,
      totalStaked:ts, totalProfit:tp, avgOdd:avgOdd(s), avgStake:avgStake(s),
      maxDrawdown:maxDrawdown(s, initialBalance),
      streaks:streaks(s),
      bestBet:s.reduce((best,b)=>(b.profit||0)>(best.profit||0)?b:best, {profit:-Infinity}),
      worstBet:s.reduce((worst,b)=>(b.profit||0)<(worst.profit||0)?b:worst, {profit:Infinity}),
    };
  };

  // ── CALCULATORS ───────────────────────────────────────
  const kelly = (bankroll, odd, prob) => {
    const b=odd-1, f=(prob*b-(1-prob))/b;
    return Math.max(0, +(f*bankroll).toFixed(2));
  };

  const convertOdd = (value, from, to) => {
    let dec;
    if(from==='decimal') dec=value;
    else if(from==='fractional'){const[n,d]=String(value).split('/').map(Number); dec=(n/d)+1;}
    else if(from==='american') dec=value>=0?((value/100)+1):(100/Math.abs(value))+1;
    if(to==='decimal')    return +dec.toFixed(4);
    if(to==='fractional') return `${+(dec-1).toFixed(4)}`;
    if(to==='american')   return dec>=2?Math.round((dec-1)*100):Math.round(-100/(dec-1));
    if(to==='implied')    return +((1/dec)*100).toFixed(2);
    return dec;
  };

  const surebet = (odds) => {
    const impl=odds.map(o=>1/o), sum=impl.reduce((a,b)=>a+b,0);
    const isArb=sum<1;
    return {isArbitrage:isArb, margin:+((sum-1)*100).toFixed(2),
      stakes: odds.map(o=>(+((1/o)/sum*100).toFixed(2))),
      roi:isArb?+(((1/sum)-1)*100).toFixed(2):0};
  };

  const dutching = (totalStake, odds) => {
    const impl=odds.map(o=>1/o), sum=impl.reduce((a,b)=>a+b,0);
    const stakes=impl.map(i=>+((i/sum*totalStake).toFixed(2)));
    const ret=+(totalStake/sum).toFixed(2);
    return {stakes, return:ret, profit:+(ret-totalStake).toFixed(2)};
  };

  return {settled,won,lost,totalStaked,totalProfit,winRate,roi,avgOdd,avgStake,maxDrawdown,streaks,groupBy,bankrollCurve,monthlyStats,oddDistribution,fullStats,kelly,convertOdd,surebet,dutching};
})();
