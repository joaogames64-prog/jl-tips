const CACHE = 'bettrack-v4';
const ASSETS = ['./', './index.html', './css/style.css', './js/storage.js', './js/utils/calc.js', './js/utils/charts.js', './js/utils/dateFilter.js', './js/utils/api.js', './js/utils/supabaseClient.js', './js/views/auth.js', './js/views/dashboard.js', './js/views/games.js', './js/views/newBet.js', './js/views/betList.js', './js/views/analytics.js', './js/views/bankroll.js', './js/views/calculators.js', './js/views/settings.js', './js/app.js'];
self.addEventListener('install',  e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{})));
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch',    e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)).catch(() => caches.match('./index.html'))));
