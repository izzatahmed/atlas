(function(){
 'use strict';
 const D=window.ATLAS_DATA,A=window.QiraatAtlas,C=window.AtlasCore,$=id=>document.getElementById(id),esc=C.escapeHtml,ar=n=>Number(n).toLocaleString('ar-EG');
 const meta=D.library,cache=new Map();let request=0,rows=[],limit=8,selected=1,openRequest=0;
 const label=a=>D.surahs[a.surah-1]+' '+ar(a.ayah);
 const location=b=>b.page?'الجزء '+(b.part||'—')+'، الصفحة '+ar(b.page):'موضع غير مرقّم في المصدر';
 function link(s,a){return '#library?'+new URLSearchParams({s:String(s),ayah:String(a)});}
 function routeState(){const p=new URLSearchParams(window.location.hash.split('?')[1]||'');return {s:Number(p.get('s')||1),ayah:p.get('ayah')||'',q:p.get('q')||''};}
 function valid(s,a){return Number.isInteger(s)&&s>=1&&s<=114&&(!a||(/^\d+$/.test(a)&&A.engine.verseMap.has(s+':'+Number(a))));}
 async function load(s){
  if(!cache.has(s))cache.set(s,fetch('./assets/library/'+s+'.json').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(data=>{if(data.surah!==s||!Array.isArray(data.verses))throw new Error('Reference data mismatch');return data;}).catch(e=>{cache.delete(s);throw e;}));
  return cache.get(s);
 }
 function resultCard(a){const b=a.blocks[0];return `<article class="result-card library-card"><div class="card-top"><div><span class="kicker">نص مرجعي · ${ar(a.blocks.length)} مقاطع</span><h2>${esc(label(a))}</h2></div><span class="review-badge">فهرسة المصدر</span></div><p class="library-preview">${esc(b.text.slice(0,420))}${b.text.length>420?'…':''}</p><div class="card-footer"><span>${esc(location(b))}${a.filtered?' · المقاطع المطابقة للبحث فقط':''}</span><button data-library-open="${a.surah}:${a.ayah}" type="button">${a.filtered?'فتح المدخل كاملاً':'قراءة نص المرجع'} ←</button><button data-verse-comparison="${a.surah}:${a.ayah}" type="button">مقارنات الآية ←</button></div></article>`;}
 function render(){
  $('library-results').innerHTML=rows.length?rows.slice(0,limit).map(resultCard).join(''):'<div class="empty-state"><h3>لا يوجد نص مطابق في هذا النطاق</h3><p>قد لا تفهرس نسخة المصدر هذه الآية منفردة، أو لا تطابق العبارة نصها. جرّب حذف رقم الآية أو تقصير العبارة، ويمكن الرجوع إلى الآيات المجاورة. لا يُستنتج غياب الخلاف أو التوجيه من ذلك.</p></div>';
  $('library-status').textContent=ar(rows.length)+' مدخلاً مطابقاً · '+D.surahs[selected-1]+' · عرض '+ar(Math.min(limit,rows.length));
  $('library-more').classList.toggle('hidden',rows.length<=limit);
 }
 async function route(){
  if(!/^#library(?:\?|$)/.test(window.location.hash))return;
  const token=++request,{s,ayah,q}=routeState();$('library-more').classList.add('hidden');$('library-results').innerHTML='';
  if(!valid(s,ayah)){$('library-status').textContent='مرجع غير صالح. اختر سورة ورقم آية صحيحاً.';$('library-results').setAttribute('aria-busy','false');return;}
  selected=s;$('library-surah').value=String(s);$('library-ayah').value=ayah;$('library-ayah').max=String(A.engine.verses.filter(v=>v.surah===s).length);$('library-query').value=q;
  $('library-results').setAttribute('aria-busy','true');$('library-status').textContent='جارٍ تحميل نص المرجع للسورة…';
  try{
   const data=await load(s);if(token!==request||!/^#library(?:\?|$)/.test(window.location.hash))return;
   const query=C.normalize(q).trim();rows=data.verses.filter(a=>!ayah||a.ayah===Number(ayah)).map(a=>query?{...a,filtered:true,blocks:a.blocks.filter(b=>C.normalize(b.text).includes(query))}:a).filter(a=>a.blocks.length);
   limit=8;render();
  }catch(e){if(token===request){$('library-status').textContent='تعذر تحميل نص المرجع. تحقق من الاتصال ثم أعد المحاولة.';$('library-results').innerHTML='<button class="outlined" type="button" id="library-retry">إعادة المحاولة</button>';}}
  finally{if(token===request)$('library-results').setAttribute('aria-busy','false');}
 }
 async function open(ref){
  const [s,a]=ref.split(':').map(Number);if(!valid(s,String(a)))return;
  const token=++openRequest,hash=window.location.hash;
  try{
   const data=await load(s),entry=data.verses.find(v=>v.ayah===a);if(!entry||token!==openRequest||hash!==window.location.hash)return;
   const citation=`${meta.title}، ${meta.author}. ${label(entry)}. ${[...new Set(entry.blocks.map(location))].join('؛ ')}. نص من ${meta.source}، إصدار ${meta.version}. ${meta.url}. ${window.location.origin+window.location.pathname+link(s,a)}. فهرسة المصدر؛ قد يمتد الكلام إلى آيات مجاورة.`;
   A.openDialog(`<div class="dialog-kicker">نص مرجعي · ${esc(meta.author)}</div><h2 class="dialog-title" id="dialog-title">${esc(meta.title)} — ${esc(label(entry))}</h2><p class="reference-note">${esc(meta.scope)}</p><div class="reference-blocks">${entry.blocks.map(b=>`<section class="reference-block"><h3>${esc(location(b))}</h3><p>${esc(b.text)}</p></section>`).join('')}</div><div class="source-detail">${esc(meta.source)} · إصدار ${esc(meta.version)} · <a href="${meta.url}" target="_blank" rel="noopener">الأصل في المصدر ↗</a></div><div class="detail-buttons"><button id="library-cite" type="button">نسخ إحالة النص</button><button data-verse-comparison="${s}:${a}" type="button">مقارنات الآية</button><button data-print-dialog="true" type="button">طباعة النص</button></div>`);
   $('library-cite').addEventListener('click',()=>A.copy(citation));
  }catch{A.toast('تعذر تحميل المرجع. أعد المحاولة من مكتبة التوجيه.');}
 }
 $('library-surah').innerHTML=meta.surahs.map(x=>`<option value="${x.surah}">${ar(x.surah)} · ${esc(D.surahs[x.surah-1])} (${ar(x.verses)} مدخلاً)</option>`).join('');
 $('library-coverage').textContent=ar(meta.verseCount)+' مدخلاً · '+ar(meta.surahCount)+' سورة · '+ar(meta.blockCount)+' مقطعاً مرجعياً';$('library-version').textContent=meta.version;
 $('library-surah').addEventListener('change',()=>{$('library-ayah').value='';$('library-ayah').max=String(A.engine.verses.filter(v=>v.surah===Number($('library-surah').value)).length);});
 $('library-form').addEventListener('submit',e=>{e.preventDefault();const params=new URLSearchParams({s:$('library-surah').value}),ayah=$('library-ayah').value,q=$('library-query').value.trim();if(ayah)params.set('ayah',ayah);if(q)params.set('q',q);const hash='#library?'+params; if(window.location.hash===hash)route();else A.navigate(hash);});
 $('library-more').addEventListener('click',()=>{limit+=8;render();});$('library-copy-link').addEventListener('click',()=>A.copy(window.location.href));
 document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;if(b.dataset.libraryOpen)open(b.dataset.libraryOpen);if(b.id==='library-retry')route();if(b.dataset.libraryRef)A.navigate(link(...b.dataset.libraryRef.split(':')));});
 window.addEventListener('hashchange',route);function snapshot(){return {rows,limit,selected,params:routeState(),ready:$('library-results').getAttribute('aria-busy')!=='true'};}
 async function restore(snapshot){
  if(!snapshot||!snapshot.ready){await route();return;}request++;rows=snapshot.rows;limit=snapshot.limit;selected=snapshot.selected;
  $('library-surah').value=String(snapshot.params.s);$('library-ayah').value=snapshot.params.ayah;$('library-query').value=snapshot.params.q;
  $('library-ayah').max=String(A.engine.verses.filter(v=>v.surah===selected).length);$('library-results').setAttribute('aria-busy','false');render();
 }
 window.AtlasLibrary={route,open,link,snapshot,restore};route();
})();
