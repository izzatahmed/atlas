/* البرامج الشقيقة: شريط في أعلى الصفحة، ورابط إلى معاني كلمات الآية وتفاسيرها حين يكون البحث عن موضع آية (مثل 2:255) */
(function () {
  'use strict';
  var SITES = { hypertext: 'https://izzatahmed.github.io/hypertext/', tafsir: 'https://izzatahmed.github.io/tafsir/', readings: 'https://izzatahmed.github.io/atlas/' };
  var st = document.createElement('style');
  st.textContent = '.sister-apps{background:#8a6a12;color:#fff;font-size:.82rem;padding:.15rem 16px;display:flex;gap:.5rem;justify-content:center;align-items:center;flex-wrap:wrap;line-height:1.8;font-family:inherit}' +
    '.sister-apps a{color:#fff;opacity:.85;text-decoration:none}.sister-apps a:hover{opacity:1;text-decoration:underline}.sister-apps b{font-weight:700}.sister-apps i{opacity:.6;font-style:normal}' +
    '.sister-apps .ctx{background:rgba(255,255,255,.18);border-radius:999px;padding:0 .7rem;opacity:1}.sister-apps .sh{display:none}@media (max-width:600px){.sister-apps .lg{display:none}.sister-apps .sh{display:inline}}';
  document.head.appendChild(st);
  var bar = document.createElement('nav'); bar.className = 'sister-apps'; bar.setAttribute('aria-label', 'البرامج الشقيقة');
  var L = [['hypertext', 'الموسوعة القرآنية المترابطة', 'الموسوعة'], ['tafsir', 'المفردات والتفاسير', 'المفردات'], ['readings', 'أطلس القراءات العشر', 'الأطلس']];
  function query() {
    var raw = location.hash.slice(1), i = raw.indexOf('?');
    if (raw.split('?')[0].split('/')[0] !== 'search' && raw) return '';
    try { return (new URLSearchParams(i >= 0 ? raw.slice(i + 1) : '').get('q') || '').trim(); } catch (e) { return ''; }
  }
  function draw() {
    var q = query(), m = q.match(/^(\d{1,3})\s*[:：]\s*(\d{1,3})$/), ctx = '';
    if (m && +m[1] >= 1 && +m[1] <= 114) ctx = '<a class="ctx" href="' + SITES.tafsir + '#' + (+m[1]) + ':' + (+m[2]) + '">معاني كلمات الآية ' + m[1] + ':' + m[2] + ' وتفاسيرها ↗</a>';
    else if (q && !/\d/.test(q)) ctx = '<a class="ctx" href="' + SITES.tafsir + '#w/' + encodeURIComponent(q) + '">«' + q.replace(/[<>&"]/g, '') + '» في المفردات والتفاسير ↗</a>';
    bar.innerHTML = L.map(function (x) { var t = '<span class="lg">' + x[1] + '</span><span class="sh">' + x[2] + '</span>'; return x[0] === 'readings' ? '<b>' + t + '</b>' : '<a href="' + SITES[x[0]] + '">' + t + '</a>'; }).join('<i>·</i>') + (ctx ? '<i>·</i>' + ctx : '');
  }
  function mount() { document.body.insertBefore(bar, document.body.firstChild); draw(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  window.addEventListener('hashchange', draw);
  // the search box updates the address with replaceState, which fires no event: check it now and then
  var last = location.hash; setInterval(function () { if (location.hash !== last) { last = location.hash; draw(); } }, 700);
})();
