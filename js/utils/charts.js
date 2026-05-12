const Charts = (() => {
  const instances = {};

  const defaults = {
    color: { primary:'#1B9E3E', secondary:'#C9A030', danger:'#FF4757', success:'#2ED573', warning:'#FFA502', muted:'rgba(255,255,255,0.1)' },
    font: { family:"'Inter', sans-serif", color:'rgba(255,255,255,0.6)' },
    grid: { color:'rgba(255,255,255,0.06)' }
  };

  const destroy = (id) => { if(instances[id]){ instances[id].destroy(); delete instances[id]; } };
  const destroyAll = () => Object.keys(instances).forEach(destroy);

  const baseOptions = (extra={}) => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{
      backgroundColor:'rgba(6,13,21,0.95)', titleColor:'#fff',
      bodyColor:'rgba(255,255,255,0.7)', borderColor:'rgba(255,255,255,0.1)',
      borderWidth:1, padding:12, cornerRadius:8
    }},
    scales:{
      x:{ grid:{color:defaults.grid.color}, ticks:{color:defaults.font.color, font:{family:defaults.font.family, size:11}} },
      y:{ grid:{color:defaults.grid.color}, ticks:{color:defaults.font.color, font:{family:defaults.font.family, size:11}} }
    },
    ...extra
  });

  const bankrollCurve = (canvasId, points) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if(!ctx) return;
    const labels = points.map(p=>p.date);
    const data   = points.map(p=>p.balance);
    const isProfit = data[data.length-1] >= data[0];
    const grad = ctx.getContext('2d').createLinearGradient(0,0,0,250);
    const col = isProfit ? defaults.color.secondary : defaults.color.danger;
    grad.addColorStop(0, 'rgba(27,158,62,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    instances[canvasId] = new Chart(ctx, {
      type:'line',
      data:{ labels, datasets:[{
        data, borderColor:col, backgroundColor:grad,
        borderWidth:2.5, fill:true, tension:0.4,
        pointBackgroundColor:col, pointRadius:3, pointHoverRadius:6
      }]},
      options: baseOptions({plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`R$ ${c.parsed.y.toFixed(2)}`}}}})
    });
  };

  const monthlyBar = (canvasId, months) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId); if(!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type:'bar',
      data:{ labels:months.map(m=>m.label), datasets:[{
        data:months.map(m=>+m.profit.toFixed(2)),
        backgroundColor:months.map(m=>m.profit>=0?'rgba(27,158,62,0.7)':'rgba(255,71,87,0.7)'),
        borderColor:months.map(m=>m.profit>=0?'#1B9E3E':defaults.color.danger),
        borderWidth:2, borderRadius:6, borderSkipped:false
      }]},
      options: baseOptions({plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`R$ ${c.parsed.y.toFixed(2)}`}}}})
    });
  };

  const sportDoughnut = (canvasId, grouped) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId); if(!ctx) return;
    const keys = Object.keys(grouped);
    const colors = ['#1B9E3E','#C9A030','#1565C0','#2ED573','#FFA502','#FF4757','#38BDF8'];
    instances[canvasId] = new Chart(ctx, {
      type:'doughnut',
      data:{ labels:keys, datasets:[{
        data:keys.map(k=>grouped[k].count),
        backgroundColor:colors.slice(0,keys.length),
        borderColor:'#0F1D2E', borderWidth:3, hoverOffset:8
      }]},
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'72%',
        plugins:{
          legend:{display:true, position:'bottom', labels:{color:'rgba(255,255,255,0.7)', font:{family:defaults.font.family, size:12}, padding:16}},
          tooltip:{backgroundColor:'rgba(13,13,26,0.95)',titleColor:'#fff',bodyColor:'rgba(255,255,255,0.7)',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,padding:12,cornerRadius:8,
            callbacks:{label:c=>`${c.label}: ${c.parsed} apostas`}}
        }
      }
    });
  };

  const oddDistBar = (canvasId, dist) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId); if(!ctx) return;
    const labels = Object.keys(dist), data = Object.values(dist);
    instances[canvasId] = new Chart(ctx, {
      type:'bar',
      data:{ labels, datasets:[{
        data, backgroundColor:'rgba(27,158,62,0.7)', borderColor:'#1B9E3E',
        borderWidth:2, borderRadius:6, borderSkipped:false
      }]},
      options: baseOptions({plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.parsed.y} apostas`}}}})
    });
  };

  const profitByKey = (canvasId, grouped, label) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId); if(!ctx) return;
    const keys = Object.keys(grouped).sort((a,b)=>grouped[b].profit - grouped[a].profit).slice(0,8);
    instances[canvasId] = new Chart(ctx, {
      type:'bar',
      data:{ labels:keys, datasets:[{
        label, data:keys.map(k=>+grouped[k].profit.toFixed(2)),
        backgroundColor:keys.map(k=>grouped[k].profit>=0?'rgba(27,158,62,0.7)':'rgba(255,71,87,0.7)'),
        borderColor:keys.map(k=>grouped[k].profit>=0?'#1B9E3E':defaults.color.danger),
        borderWidth:2, borderRadius:6, borderSkipped:false
      }]},
      options:{
        ...baseOptions(), indexAxis:'y',
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`R$ ${c.parsed.x.toFixed(2)}`}}}
      }
    });
  };

  const winLosePie = (canvasId, won, lost, voided) => {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId); if(!ctx) return;
    instances[canvasId] = new Chart(ctx, {
      type:'doughnut',
      data:{
        labels:['Vitórias','Derrotas','Void'],
        datasets:[{
          data:[won,lost,voided],
          backgroundColor:['rgba(46,213,115,0.8)','rgba(255,71,87,0.8)','rgba(255,165,2,0.8)'],
          borderColor:'#0F1D2E', borderWidth:3, hoverOffset:8
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'65%',
        plugins:{
          legend:{display:true,position:'bottom',labels:{color:'rgba(255,255,255,0.7)',font:{family:defaults.font.family,size:12},padding:16}},
          tooltip:{backgroundColor:'rgba(13,13,26,0.95)',titleColor:'#fff',bodyColor:'rgba(255,255,255,0.7)',borderColor:'rgba(255,255,255,0.1)',borderWidth:1,padding:12,cornerRadius:8}
        }
      }
    });
  };

  return { bankrollCurve, monthlyBar, sportDoughnut, oddDistBar, profitByKey, winLosePie, destroy, destroyAll };
})();
