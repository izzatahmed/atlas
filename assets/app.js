(function(){
 'use strict';
 const D=window.ATLAS_DATA,W=window.QIRAAT_WITNESSES||{meta:{},records:[]},C=window.AtlasCore;
 if(!D||!C||!window.QURAN){document.getElementById('results').textContent='تعذر تحميل البيانات. أعد تحميل الصفحة.';return;}
 const E=C.createEngine(D,window.QURAN,W),$=id=>document.getElementById(id),esc=C.escapeHtml;
 const ar=n=>Number(n).toLocaleString('ar-EG'),SAVED_KEY='qiraat-atlas-saved-v1';
 let saved=[];try{saved=JSON.parse(localStorage.getItem(SAVED_KEY)||'[]');if(!Array.isArray(saved))saved=[];saved=[...new Set(saved)].filter(id=>D.records.some(r=>r.id===id));}catch{}
 const state={q:'',mode:'comparisons',surah:'',category:'',tag:'',reader:'',narrator:'',hafsDiff:false,pairA:'asim_hafs',pairB:'nafi_warsh',pairOnly:false,savedOnly:false,page:'',review:'',limit:6,saved};
 let activePage='search',found=[],lastFocus=null,toastTimer,inputTimer;
 let dialogFrames=[],dialogOrigin=null,pageFrames=[],restoringPage=false,silentCloses=0,routeScrollTimer;
 const pairLabels={same:'الأوجه الموصوفة متفقة',different:'اختلاف في الأوصاف المدرجة',overlap:'أوصاف مشتركة وأخرى مختلفة',unknown:'نسبة ناقصة أو سياق غير منطبق',limited:'التوثيق جزئي؛ لا تجزم المقارنة'};
 function reviewLabel(r){return r.review==='source-import'?'منقول من المصدر':r.review==='primary-supplement'?'موضع مراجع في النشر':'خلاف موضعي مراجع';}
 function isPartial(r){return r.variants.some(v=>v.reviewedScope&&!['complete_description','local_typographical_correction_only'].includes(v.reviewedScope));}
 function refsLabel(r){return (r.coveredRefs||[[r.surah,r.ayah]]).map(([s,a])=>D.surahs[s-1]+' '+ar(a)).join(' / ');}
 const emptyIcon='<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="17" cy="17" r="11" stroke="currentColor" stroke-width="1.5"/><path d="m25 25 10 10M12 17h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
 function options(){
  $('surah-filter').insertAdjacentHTML('beforeend',D.surahs.map((n,i)=>`<option value="${i+1}">${ar(i+1)} · ${esc(n)}</option>`).join(''));
  $('reader-filter').insertAdjacentHTML('beforeend',D.readers.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join(''));
  const tags=[...new Set(D.records.flatMap(r=>r.tags))];$('tag-filter').insertAdjacentHTML('beforeend',tags.map(t=>`<option>${esc(t)}</option>`).join(''));
  const narrOpts=D.readers.map(r=>`<optgroup label="${esc(r.name)}">${r.narrators.map(id=>{const n=E.narrators.get(id);return `<option value="${id}">${esc(n.label)}</option>`;}).join('')}</optgroup>`).join('');
  $('pair-a').innerHTML=narrOpts;$('pair-b').innerHTML=narrOpts;updateNarrators();
  $('comparison-stat').innerHTML=`${ar(D.records.length)} <small>موضع أداء</small>`;
  $('witness-stat').innerHTML=`${ar(W.records.length)} <small>شاهد وتعليق</small>`;
  $('tab-comparison-count').textContent=ar(D.records.length);$('tab-word-count').textContent=ar(E.words.length);$('coverage-summary').innerHTML=`<b>${ar(E.words.length)} كلمة · ${ar(E.verses.length)} آية · ${ar(D.records.length)} موضع أداء</b><p>منها ${ar(D.meta.sourceRecords)} موضعاً من الموسوعة القرآنية (إصدار ${esc(D.meta.sourceVersion)})، و${ar(D.meta.primaryChecked)} خلافاً موضعياً مراجعاً. عُزل ${ar(D.meta.excludedRecords)} سجلاً معيب الإحالة. ترتبط ${ar(D.meta.wordsWithLinkedRecords)} كلمة بسجل أداء واحد أو أكثر؛ لا يُحكم بالاتفاق على الكلمات الأخرى. هناك ${ar(D.meta.limitedReviewRecords)} سجلاً استُكمل فيه إثبات قاعدة جزئية فقط، ولا يمثل ذلك تحقيق وصف أدائه المركب كله.</p>`;$('tab-witness-count').textContent=ar(W.records.length);
  $('tawjih-coverage').textContent=`${ar(D.meta.tawjihTopics)} موضوعاً موثقاً، مرتبطة بـ${ar(D.meta.recordsWithTawjih)} سجلاً للأداء؛ يبدأ القسم بمواضع محددة ويتوسع مع التوثيق.`;
  $('coverage-by-surah').innerHTML=`<table class="coverage-table"><thead><tr><th>السورة</th><th>الكلمات في الفهرس</th><th>كلمات لها سجل مرتبط</th><th>سجلات الأداء</th></tr></thead><tbody>${D.coverageBySurah.map(x=>`<tr><td><a href="#search?mode=words&surah=${x.surah}">${esc(x.name)}</a></td><td>${ar(x.wordCount)}</td><td>${ar(x.wordsWithLinkedRecords)}</td><td>${ar(x.records)}</td></tr>`).join('')}</tbody></table>`;

 }
 function updateNarrators(){
  const pool=state.reader?D.narrators.filter(n=>n.readerId===state.reader):D.narrators;
  $('narrator-filter').innerHTML='<option value="">جميع الروايات</option>'+pool.map(n=>`<option value="${n.id}">${esc(n.label)}</option>`).join('');
  if(!pool.some(n=>n.id===state.narrator))state.narrator='';$('narrator-filter').value=state.narrator;
 }
 function controls(){
  $('review-filter').value=state.review;$('search-input').value=state.q;$('surah-filter').value=state.surah;$('category-filter').value=state.category;$('tag-filter').value=state.tag;$('reader-filter').value=state.reader;updateNarrators();
  $('hafs-diff').checked=state.hafsDiff;$('hafs-diff').disabled=!state.reader&&!state.narrator;
  $('pair-a').value=state.pairA;$('pair-b').value=state.pairB;$('pair-only').checked=state.pairOnly;$('page-filter').value=state.page;
  $('saved-nav').classList.toggle('is-active',state.savedOnly);$('saved-count').textContent=ar(saved.length);
 }
 function persistSaved(){try{localStorage.setItem(SAVED_KEY,JSON.stringify(saved));}catch{}state.saved=saved;$('saved-count').textContent=ar(saved.length);}
 function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
 function sourcePage(page){return `https://4review.quraat.info/madina.html?tab3a=madina&page=${page}&topage=${page}&comment=1&lines=1&brown_circle=1&colored_circles=1&empty_circles=1&star=1&key=1&font=16`;}
 function toHash(){
  const p=new URLSearchParams();if(state.q)p.set('q',state.q);if(state.mode!=='comparisons')p.set('mode',state.mode);
  for(const k of ['surah','category','tag','reader','narrator','page','review'])if(state[k])p.set(k,state[k]);
  if(state.hafsDiff)p.set('hafsDiff','1');if(state.pairOnly)p.set('pairOnly','1');if(state.savedOnly)p.set('saved','1');
  if(state.pairA!=='asim_hafs')p.set('a',state.pairA);if(state.pairB!=='nafi_warsh')p.set('b',state.pairB);
  return '#search'+(p.size?'?'+p.toString():'');
 }
 function syncUrl(){if(activePage==='search')history.replaceState(null,'',toHash());}
 function parseHash(){
  clearTimeout(routeScrollTimer);clearTimeout(inputTimer);
  const raw=location.hash.slice(1)||'search';const route=raw.split('?')[0],page=route.split('/')[0];
  activePage=['search','readers','learn','sources','library'].includes(page)?page:'search';
  document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('hidden',el.dataset.page!==activePage));
  document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===activePage));
  document.title=(activePage==='search'?'بحث ومقارنة':activePage==='readers'?'القراء والرواة':activePage==='learn'?'مدخل إلى علم القراءات':activePage==='library'?'مكتبة التوجيه':'المصادر والمواقع')+' | أطلس القراءات العشر';
  if(activePage==='search'){
   const p=new URLSearchParams(raw.split('?')[1]||'');
   state.q=p.get('q')||'';state.mode=['comparisons','witnesses','verses','words'].includes(p.get('mode'))?p.get('mode'):'comparisons';
   for(const k of ['surah','category','tag','reader','narrator','page','review'])state[k]=p.get(k)||'';
   state.hafsDiff=p.get('hafsDiff')==='1';state.pairOnly=p.get('pairOnly')==='1';state.savedOnly=p.get('saved')==='1';
   state.pairA=E.narrators.has(p.get('a'))?p.get('a'):'asim_hafs';state.pairB=E.narrators.has(p.get('b'))?p.get('b'):'nafi_warsh';
   if(!E.readers.has(state.reader))state.reader='';if(!E.narrators.has(state.narrator))state.narrator='';
   state.limit=6;controls();render(false);
   const record=p.get('record'),word=p.get('word');if(!restoringPage&&record&&D.records.some(r=>r.id===record))showDetail(record,p.get('section')==='tawjih');else if(!restoringPage&&word&&E.wordMap.has(word))showWord(word);
  }
  if(activePage!=='search'&&$('detail-dialog').open)endDialog(false);
  updateBackButton();if(restoringPage)return;
  const part=route.split('/')[1];if(activePage==='learn'&&part){routeScrollTimer=setTimeout(()=>document.getElementById('learn-'+part)?.scrollIntoView({behavior:'smooth',block:'start'}),30);}
  else window.scrollTo({top:0,behavior:'auto'});
 }
 function labelsFor(variant){
  const items=[];for(const r of D.readers){const ids=r.narrators.filter(id=>variant.narrators.includes(id));if(ids.length===2)items.push(r.name);else if(ids.length===1)items.push(E.narrators.get(ids[0]).label);}return items;
 }
 function graphemes(text){return typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ar',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);}
 function diffMarkup(a,b){
  const x=graphemes(a),y=graphemes(b),dp=Array.from({length:x.length+1},()=>new Uint16Array(y.length+1));
  for(let i=x.length-1;i>=0;i--)for(let j=y.length-1;j>=0;j--)dp[i][j]=x[i]===y[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const keep=new Set();let i=0,j=0;while(i<x.length&&j<y.length){if(x[i]===y[j]){keep.add(i);i++;j++;}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++;}
  return x.map((c,k)=>keep.has(k)?esc(c):`<span class="diff">${esc(c)}</span>`).join('');
 }
 function verseFor(r){return E.verseMap.get(`${r.surah}:${r.ayah}`)?.text||'';}
 function excerpt(r){
  const words=verseFor(r).split(/\s+/);const keys=[r.word,...r.variants.map(v=>v.text)].flatMap(x=>C.normalize(x).split(' ')).filter(w=>w.length>2);
  let p=words.findIndex(w=>keys.some(k=>C.normalize(w)===k));if(p<0)p=0;
  const start=words.length>28?Math.max(0,p-8):0,end=words.length>28?Math.min(words.length,p+13):words.length;
  const text=words.slice(start,end).map(w=>keys.includes(C.normalize(w))?`<mark>${esc(w)}</mark>`:esc(w)).join(' ');
  return (start?'… ':'')+text+(end<words.length?' …':'');
 }
 function faceMarkup(v,r,i){
  const text=v.text,other=r.variants.find((x,j)=>j!==i&&x.text);
  return `<div class="variant"><div class="variant-word">${text?(other&&r.variants.length===2?diffMarkup(text,other.text):esc(text)):'<small>وصف أدائي</small>'}</div><p class="variant-desc">${esc(v.description)}</p>${v.qualification?`<p class="face-qualification">${esc(v.qualification)}</p>`:''}${v.narratorQualifications?'<small class="review-badge">قيود لبعض الطرق في التفاصيل</small>':''}${v.reviewedScope?'<small class="review-badge">تصحيح محدود النطاق</small>':''}<div class="reader-chips">${labelsFor(v).map(n=>`<span>${esc(n)}</span>`).join('')}</div></div>`;
 }
 function card(r){
  const match=E.matchQuality(r,state.q),matchNote=match==='partial'?'مطابقة جزئية للفظ':match==='context'?'مطابقة في الشرح أو الوسوم':'';
  const preview=[...r.variants.filter(v=>v.narrators.includes(state.pairA)||v.narrators.includes(state.pairB)),...r.variants].filter((v,i,a)=>a.indexOf(v)===i).slice(0,2);
  const comparison=C.compareFaces(r,state.pairA,state.pairB),summary=n=>{const vs=C.variantsFor(r,n);return vs.length?vs.map(v=>v.text||'وصف أدائي').filter((x,i,a)=>a.indexOf(x)===i).join(' / '):'غير مثبت في هذا السجل';};
  return `<article class="result-card" data-record="${r.id}"><div class="card-top"><div class="card-title"><span class="ayah-badge" aria-hidden="true">${ar(r.ayah)}</span><h3>${esc(refsLabel(r))}<small>${esc(r.word)}</small></h3><span class="category-label">${esc(r.category)}</span></div><button class="bookmark ${saved.includes(r.id)?'on':''}" data-save="${r.id}" type="button" aria-label="${saved.includes(r.id)?'إزالة الموضع من المحفوظات':'حفظ الموضع'}" aria-pressed="${saved.includes(r.id)}">${saved.includes(r.id)?'♥':'♡'}</button></div><p class="verse-context" aria-label="مقتطف من النص المرجعي برواية حفص">${excerpt(r)}</p><div class="record-status">${matchNote?`<span class="review-badge search-match">${matchNote}</span>`:''}<span class="review-badge">${reviewLabel(r)}</span>${r.reviewWarnings?.length?'<span class="incomplete-badge">أوصاف تحتاج تحقيق إحالتها</span>':''}${isPartial(r)?'<span class="incomplete-badge">توثيق بعض القواعد فقط</span>':''}<span>${ar(r.variants.length)} أوجه موصوفة</span>${r.missingNarrators?.length?`<span class="incomplete-badge">نسبة ${ar(r.missingNarrators.length)} رواة غير مثبتة</span>`:''}</div><div class="variant-grid">${preview.map(v=>faceMarkup(v,r,r.variants.indexOf(v))).join('')}</div>${r.variants.length>2?`<button class="more-faces" data-detail="${r.id}" type="button">عرض جميع الأوجه (${ar(r.variants.length)}) وقيود الطرق ←</button>`:''}<div class="selected-pair"><span>${esc(E.narrators.get(state.pairA).label)}:</span><b>${esc(summary(state.pairA))}</b><span>·</span><span>${esc(E.narrators.get(state.pairB).label)}:</span><b>${esc(summary(state.pairB))}</b><span class="pair-result-label ${['different','overlap'].includes(comparison)?'different':''}">${pairLabels[comparison]}</span></div><div class="card-footer"><span class="source-name">${esc(r.source.title)}</span>${r.tawjihIds?.length?`<button class="tawjih-link" data-tawjih="${r.id}" type="button">توجيه القراءات ←</button>`:''}<button data-detail="${r.id}" type="button">التفاصيل والمقارنة <span aria-hidden="true">←</span></button></div></article>`;
 }
 function witnessCard(w){
  const long=w.text.length>300;const body=long?w.text.slice(0,410):w.text;
  return `<article class="result-card witness-card"><div class="card-top"><div class="card-title"><span class="ayah-badge">${ar(w.page)}</span><h3>شاهد من المصدر<small>صفحة المصحف ${ar(w.page)} · تعليق ${ar(w.annotationIndex||Number(w.id.split('-').at(-1))||1)}</small></h3><span class="category-label">شواهد وتعليقات</span></div></div><p class="witness-text ${long?'truncated':''}">${esc(body)}${long?'…':''}</p>${long?`<button class="witness-more" data-witness="${w.id}" type="button">عرض النص كاملاً ←</button>`:''}<div class="card-footer"><span>تيسير القراءات العشر · رموز المصدر محفوظة</span><div class="witness-source"><a href="${esc(w.sourceUrl)}" target="_blank" rel="noopener">صفحة المصحف ↗</a><a href="${esc(w.rawUrl)}" target="_blank" rel="noopener">النص الأصلي ↗</a></div></div></article>`;
 }
 function verseCard(v){
  const matches=E.byRef.get(`${v.surah}:${v.ayah}`)||[],page=E.pageForRef(v.surah,v.ayah);
  return `<article class="result-card verse-card"><div class="card-top"><div class="card-title"><span class="ayah-badge">${ar(v.ayah)}</span><h3>${esc(D.surahs[v.surah-1])} · ${ar(v.ayah)}<small>النص المرجعي برواية حفص · صفحة ${ar(page)}</small></h3></div><button class="text-button" data-context="${v.surah}:${v.ayah}" type="button">عرض السياق ←</button></div><p class="verse-context">${esc(v.text)}</p><button class="text-button" data-verse-words="${v.surah}:${v.ayah}" type="button">تصفّح كلمات الآية ←</button><div class="card-footer"><span>${matches.length?ar(matches.length)+' مقارنة مدرجة':'لا سجل أداء مفهرس لهذه الآية؛ لا يُستنتج الاتفاق'}</span><div class="inline-links">${matches.length?`<button data-verse-comparison="${v.surah}:${v.ayah}" type="button">قارن الأوجه ←</button>`:''}<button data-verse-witness="${v.surah}:${v.ayah}" type="button">شواهد الصفحة ←</button></div></div></article>`;
 }
 function wordCard(w){const rs=E.byWord.get(w.id)||[];return `<article class="result-card word-card"><div class="card-top"><div><h3 class="word-heading">${esc(w.text)}</h3><p>${esc(D.surahs[w.surah-1])} ${ar(w.ayah)} · الكلمة ${ar(w.position)}</p></div><span class="category-label">${ar(rs.length)} سجل مرتبط</span></div><p class="verse-context">${esc(E.verseMap.get(`${w.surah}:${w.ayah}`).text)}</p><div class="card-footer"><span>${rs.length?'الربط يشمل العبارة التي تحتوي الكلمة':'لا سجل مرتبط بالكلمة؛ لا يعني اتفاق القراءات'}</span><button data-word="${w.id}" type="button">الكلمة وأوجهها ←</button></div></article>`;}
 function showWord(id){const w=E.wordMap.get(id);if(!w)return;const rs=E.byWord.get(id)||[];openDialog(`<div class="dialog-kicker">فهرس كلمات النص المرجعي · ${esc(w.id)}</div><h2 class="dialog-title" id="dialog-title">${esc(w.text)} — ${esc(D.surahs[w.surah-1])} ${ar(w.ayah)}</h2><p class="dialog-verse">${esc(E.verseMap.get(`${w.surah}:${w.ayah}`).text)}</p><p>${rs.length?'مواضع الأداء المرتبطة بهذه الكلمة أو عبارتها:':'لم يُثبت لهذه الكلمة سجل مرتبط في القاعدة الحالية. لا يدل ذلك على اتفاق القراءات. يمكن أن تنطبق عليها أصول أداء عامة؛ راجع الشواهد والمصادر.'}</p><div class="word-records">${rs.map(r=>`<button data-detail="${r.id}" type="button"><b>${esc(r.word)}</b><span>${ar(r.variants.length)} أوجه · ${reviewLabel(r)}</span></button>`).join('')}</div><div class="detail-buttons"><button data-library-ref="${w.surah}:${w.ayah}" type="button">نص المرجع في مكتبة التوجيه</button><button data-word-link="${w.id}" type="button">نسخ رابط الكلمة</button><button data-verse-comparison="${w.surah}:${w.ayah}" type="button">جميع مواضع الآية</button><button data-verse-witness="${w.surah}:${w.ayah}" type="button">شواهد الصفحة</button></div>`);}
 function renderChips(){
  const chips=[];if(state.q)chips.push(['q','البحث: '+state.q]);if(state.surah)chips.push(['surah',D.surahs[Number(state.surah)-1]||'']);if(state.savedOnly)chips.push(['savedOnly','المحفوظات']);
  if(state.mode==='comparisons')for(const [key,name] of [['category',state.category],['tag',state.tag],['reader',E.readers.get(state.reader)?.name],['narrator',E.narrators.get(state.narrator)?.name],['review',state.review?$('review-filter').selectedOptions[0]?.textContent:'']])if(name)chips.push([key,name]);
  if(state.mode==='witnesses'&&state.page)chips.push(['page','الصفحة '+ar(state.page)]);
  $('active-filters').innerHTML=chips.map(([k,v])=>`<span class="filter-chip">${esc(v)}<button data-remove-filter="${k}" type="button" aria-label="إزالة ${esc(v)}">×</button></span>`).join('');
 }
 function render(writeUrl=true){
  if(activePage!=='search')return;
  state.saved=saved;found=E.search(state.mode,state);
  document.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===state.mode;b.classList.toggle('selected',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  $('result-panel').setAttribute('aria-labelledby','tab-'+state.mode);$('comparison-filters').classList.toggle('hidden',state.mode!=='comparisons');$('page-filter-wrap').classList.toggle('hidden',state.mode!=='witnesses');$('pair-toolbar').classList.toggle('hidden',state.mode!=='comparisons');
  const scope={comparisons:`${ar(D.records.length)} موضع أداء؛ يحتفظ السجل بكل الأوجه المنقولة للرواية. «الاتفاق» يخص الوصف المسجل وحده. لا يُستنتج الاتفاق من غياب النسبة.`,witnesses:'نصوص شواهد وتعليقات مصحف المدينة من مرآة المصدر. الربط بالآية يحدد صفحة المصحف؛ الرموز لا تُفسَّر آلياً.',verses:'بحث في جميع آيات النص المرجعي برواية حفص؛ أرقام الآيات وفق العد الكوفي.',words:`فهرس ${ar(E.words.length)} كلمة في النص المرجعي، مع روابط مواضع الأداء. لا تُعد البسملة غير المرقمة من كلمات الآية؛ تبقى محفوظة في النص الأصلي.`};
  $('scope-line').textContent=scope[state.mode];
  $('results-title').textContent=state.savedOnly&&state.mode==='comparisons'?'مواضعك المحفوظة':state.q?'نتائج البحث':state.mode==='comparisons'?'مواضع تستحق الاستكشاف':state.mode==='witnesses'?'شواهد وتعليقات المصحف':state.mode==='words'?'تصفّح كلمات القرآن':'تصفّح آيات القرآن';
  const noun=state.mode==='comparisons'?'موضع مقارنة':state.mode==='witnesses'?'شاهداً وتعليقاً':state.mode==='words'?'كلمة':'آية';
  $('result-count').textContent=`${ar(found.length)} ${noun}${state.q?' مطابقاً للبحث':''} · عرض ${ar(Math.min(state.limit,found.length))}`;
  renderChips();
  $('results').innerHTML=found.length?found.slice(0,state.limit).map(state.mode==='comparisons'?card:state.mode==='witnesses'?witnessCard:state.mode==='words'?wordCard:verseCard).join(''):emptyState();
  $('load-more').classList.toggle('hidden',found.length<=state.limit);$('export-results').disabled=!found.length;$('export-csv').disabled=!found.length;
  if(writeUrl)syncUrl();
 }
 function emptyState(){
  const savedEmpty=state.savedOnly&&state.mode==='comparisons';
  const verseMatches=!savedEmpty&&state.mode==='comparisons'&&state.q?E.search('verses',{q:state.q,surah:state.surah}):[];
  const baseMatches=verseMatches.length?E.search('comparisons',{q:state.q,surah:state.surah}):[];
  const title=savedEmpty?'لم تحفظ مواضع بعد':verseMatches.length?(baseMatches.length?'حجبت المرشحات المقارنات المتاحة':'الآية موجودة؛ المقارنة المفسرة لم تُدرج بعد'):'لا توجد نتائج ضمن هذا النطاق';
  const message=savedEmpty?'اضغط رمز القلب بجانب أي مقارنة لإضافتها إلى محفوظاتك في هذا المتصفح.':verseMatches.length?(baseMatches.length?'توجد مقارنة لهذا البحث في القاعدة، لكنها لا تطابق المرشحات الحالية. أزل المرشحات أو عدّل الروايات المختارة.':`وجد البحث ${ar(verseMatches.length)} من الآيات المطابقة في النص المرجعي، ولم تُدرج أوجهها في قاعدة المقارنات المفسرة بعد. افتح الآيات أو شواهد المصحف؛ ولا يُستنتج الاتفاق من غياب السجل.`):state.mode==='comparisons'?'قد يكون الموضع غير مفهرس في المقارنات المفصلة بعد. ابحث عنه في الآيات أو شواهد المصحف؛ فغياب السجل لا يدل على اتفاق القراء.':'جرّب لفظاً أقصر، أو مرجعاً مثل 2:259، أو أزل بعض المرشحات.';
  return `<div class="empty-state">${emptyIcon}<h3>${title}</h3><p>${message}</p><div class="empty-actions">${state.mode!=='verses'?`<button data-switch="verses" type="button">${verseMatches.length?'عرض الآيات المطابقة ('+ar(verseMatches.length)+')':'البحث في الآيات'}</button>`:''}${state.mode!=='witnesses'?'<button data-switch="witnesses" type="button">شواهد المصحف</button>':''}<button data-reset="true" type="button">إزالة المرشحات</button></div></div>`;
 }
 function setMode(mode){state.mode=mode;state.limit=6;if(mode!=='comparisons')state.savedOnly=false;render();}
 function newSearch(q){const previous=activePage!=='search'?rememberPage():null;state.q=q;state.limit=6;state.savedOnly=false;$('search-input').value=q;if(activePage!=='search')navigate(toHash(),previous);else render();}
 function reset(){Object.assign(state,{q:'',surah:'',category:'',tag:'',reader:'',narrator:'',hafsDiff:false,pairOnly:false,savedOnly:false,page:'',review:'',limit:6});controls();render();}
 function scrollPosition(){return {top:window.scrollY||0,left:window.scrollX||0};}
 function restorePosition(position,focus){focus?.isConnected&&focus.focus?.({preventScroll:true});window.scrollTo({...position,behavior:'instant'});}
 function takeDialog(){
  const dialog=$('detail-dialog'),content=$('dialog-content'),fragment=document.createDocumentFragment();
  const snapshot={fragment,scrollTop:dialog.scrollTop,frames:dialogFrames.slice(),origin:dialogOrigin,focus:document.activeElement};
  while(content.firstChild)fragment.appendChild(content.firstChild);return snapshot;
 }
 function endDialog(returnToOrigin=true){
  const dialog=$('detail-dialog'),origin=dialogOrigin;$('source-audio')?.pause();dialogOrigin=null;dialogFrames=[];
  if(dialog.open){silentCloses++;dialog.close();}
  if(returnToOrigin&&origin)restorePosition(origin.position,origin.focus);
 }
 function restoreDialog(snapshot){
  if(!snapshot)return;dialogFrames=snapshot.frames;dialogOrigin=snapshot.origin;lastFocus=dialogOrigin?.focus;
  $('dialog-content').replaceChildren(snapshot.fragment);if(!$('detail-dialog').open)$('detail-dialog').showModal();
  snapshot.focus?.isConnected&&snapshot.focus.focus?.({preventScroll:true});$('detail-dialog').scrollTop=snapshot.scrollTop;
 }
 function openDialog(html){
  const dialog=$('detail-dialog');$('source-audio')?.pause();
  if(dialog.open){const previous=takeDialog();dialogFrames.push(previous);if(dialogFrames.length>20)dialogFrames.shift();}
  else{lastFocus=document.activeElement;dialogOrigin={position:scrollPosition(),focus:lastFocus};dialogFrames=[];}
  $('dialog-content').innerHTML=html+'<div class="back-tools"><button class="back-button" data-back-dialog="true" type="button"><span aria-hidden="true">→</span> رجوع إلى الموضع السابق</button></div>';
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;$('close-dialog').focus({preventScroll:true});
 }
 function backDialog(){
  $('source-audio')?.pause();if(dialogFrames.length){const previous=dialogFrames.pop();previous.frames=dialogFrames.slice();restoreDialog(previous);}else endDialog();
 }
 function rememberPage(){
  const frame={hash:location.hash||'#search',page:activePage,state:{...state},position:scrollPosition(),focus:document.activeElement,library:window.AtlasLibrary?.snapshot?.()};
  if($('detail-dialog').open)frame.dialog=takeDialog();return frame;
 }
 function updateBackButton(){$('page-back-tools').classList.toggle('hidden',!pageFrames.length&&activePage==='search');}
 function navigate(hash,frame){
  if(hash===location.hash&&!frame&&!$('detail-dialog').open)return;const same=hash===location.hash;pageFrames.push(frame||rememberPage());if(pageFrames.length>20)pageFrames.shift();endDialog(false);if(same)parseHash();else location.hash=hash;updateBackButton();
 }
 async function backPage(){
  const frame=pageFrames.pop();endDialog(false);
  if(!frame){history.replaceState(null,'','#search');restoringPage=true;parseHash();restoringPage=false;updateBackButton();return;}
  history.replaceState(null,'',frame.hash);restoringPage=true;parseHash();restoringPage=false;
  if(frame.page==='search'){Object.assign(state,frame.state,{saved});controls();render(false);}
  if(frame.page==='library')await window.AtlasLibrary?.restore?.(frame.library);
  if(frame.dialog)restoreDialog(frame.dialog);restorePosition(frame.position,frame.focus);updateBackButton();
 }
 function routeLabel(q){return typeof q==='string'?q:q?[q.rawi,q.branch,q.book_or_policy].filter(Boolean).join('؛ '):'';}
 function sourceNames(evidence){return evidence.map(e=>`${esc(e.sourceBook||({nashr:'النشر',sharh:'شرح طيبة النشر',ithaf:'إتحاف فضلاء البشر'}[e.book]||e.book)||'المصدر')} ${esc(e.volume_page||'')}`).join('؛ ');}
 function supplementaryMarkup(r){if(!r.supplementaryReview?.length)return'';return `<details class="supplementary-review"><summary>تحقيق تكميلي للطرق والقيود (${ar(r.supplementaryReview.length)})</summary><p class="reference-note">تفصيل موثق في القدر المذكور فقط. لا يختار الأطلس طريقاً تلقائياً ولا يركّب منه أداء الآية.</p>${r.supplementaryReview.map(v=>`<article><h4>${esc(v.newDescription)}</h4><p class="face-qualification">${esc(routeLabel(v.qualification))}</p><small>${esc(v.context||'')} · ${sourceNames(v.evidence||[])}</small>${v.remainingUnresolved?.length?`<p class="reference-note">ما يتطلب تعيين الطريق: ${esc(v.remainingUnresolved.join('؛ '))}</p>`:''}</article>`).join('')}</details>`;}
 function tawjihMarkup(r){const items=E.tawjihFor(r);return `<section id="tawjih-section" class="tawjih-section" aria-labelledby="tawjih-title"><div class="tawjih-heading"><span class="kicker">من الأداء إلى البيان</span><h3 id="tawjih-title">توجيه القراءات</h3></div>${items.length?`<p class="reference-note">خلاصة محررة من المصادر المشار إليها. يشرح التوجيه الوجه اللغوي والمعنى؛ إثبات القراءة ونسبتها مستقل، ولا تُنشأ به قراءة جديدة.</p>${items.map(t=>`<article class="tawjih-entry"><h4>${esc(t.title)}</h4><div class="reader-chips">${t.tags.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="tawjih-cases">${t.cases.map(c=>`<div><b class="qword">${esc(c.form)}</b><p><strong>الوجه اللغوي:</strong> ${esc(c.linguistic)}</p><p><strong>المعنى:</strong> ${esc(c.meaning)}</p></div>`).join('')}</div><p class="tawjih-relationship">${esc(t.relationship)}</p>${t.note?`<p>${esc(t.note)}</p>`:''}<div class="tawjih-sources">${t.sources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} — ${esc(s.author)} ↗</a><br><small>${esc(s.location)}</small></p>`).join('')}<button class="text-button" data-cite-tawjih="${t.id}" data-tawjih-record="${r.id}" type="button">نسخ إحالة التوجيه</button></div></article>`).join('')}`:'<p>لم يُدرج توجيه موثَّق لهذا اللفظ في الأطلس بعد. غيابه لا يعني عدم وجود توجيه في كتب العلم.</p><a href="#learn/tawjih" data-learn-tawjih="true">ما توجيه القراءات؟ وما مصادره؟ ←</a>'}<div class="detail-buttons"><button data-library-ref="${r.surah}:${r.ayah}" type="button">نص المرجع في مكتبة التوجيه ←</button></div></section>`;}
 function showDetail(id,focusTawjih=false){
  const r=D.records.find(x=>x.id===id);if(!r)return;
  const matrix=D.readers.map(reader=>reader.narrators.map((nid,j)=>{const n=E.narrators.get(nid),vs=C.variantsFor(r,nid);return `<tr class="${[state.pairA,state.pairB].includes(nid)?'selected-row':''}">${j===0?`<td rowspan="2">${esc(reader.name)}</td>`:''}<td>${esc(n.name)}</td><td colspan="2">${vs.length?vs.map(v=>`<div class="matrix-face">${v.text?`<b class="qword">${esc(v.text)}</b>`:''}<p>${esc(v.description)}</p>${v.qualification?`<p class="face-qualification">${esc(v.qualification)}</p>`:''}${v.narratorQualifications?.[nid]?`<p class="face-qualification">قيد الطريق: ${esc(v.narratorQualifications[nid])}</p>`:''}${v.reviewNote?`<small>${esc(v.reviewNote)}</small>`:''}${v.evidence?.length?`<small class="face-evidence">${v.evidence.map(e=>esc(({nashr:'النشر',sharh:'شرح طيبة النشر',ithaf:'إتحاف فضلاء البشر'}[e.book]||e.book)+' '+(e.volume_page||''))).join('؛ ')}</small>`:''}</div>`).join(''):r.notApplicable?.includes(nid)?'<span>غير منطبق في سياق الوصل بين السورتين بلا بسملة؛ لا حكم على الابتداء</span>':'<span class="incomplete-badge">لم تثبت النسبة في هذا السجل؛ لا يُستنتج اتفاق أو اختلاف</span>'}</td></tr>`;}).join('')).join('');
  const audios=D.narrators.filter(n=>C.audioURL(D,r,n.id));
  const audio=audios.length?`<section class="audio-section"><h3>استماع من المصدر</h3><p>تسجيل الآية المرتبطة بالمصدر، وليس مقطعاً معزولاً للكلمة. قد يختلف عد الآي، ولا يثبت التسجيل أداء كل وجه أو طريق معروض.</p><label class="field">الرواية<select id="audio-narrator"><option value="">اختر رواية للاستماع</option>${audios.map(n=>`<option value="${n.id}">${esc(n.label)}</option>`).join('')}</select></label><p id="recording-description" class="recording-description" aria-live="polite"></p><audio id="source-audio" controls preload="none" aria-label="تسجيل الآية من المصدر"></audio><a id="audio-link" class="hidden" target="_blank" rel="noopener">فتح التسجيل ↗</a></section>`:'';
  openDialog(`<div class="dialog-kicker">${reviewLabel(r)} · ${esc(r.tags.join(' / '))}</div><h2 class="dialog-title" id="dialog-title">${esc(refsLabel(r))} — ${esc(r.word)}</h2><div class="dialog-verse">${(r.coveredRefs||[[r.surah,r.ayah]]).map(([s,a])=>esc(E.verseMap.get(`${s}:${a}`)?.text||'')).join(' ۞ ')}</div><p class="reference-note">النص المرجعي برواية حفص للسياق. تُعرض الأوجه البديلة منفصلة مع قيودها؛ لا تُركَّب بينها قراءة، ولا يثبت الجدول جواز الجمع بينها في طريق واحد.</p>${r.reviewWarnings?.length?`<p class="reference-note"><b>المقارنة معلقة:</b> ${esc(r.reviewWarnings.join('؛ '))}</p>`:''}${r.note&&!r.reviewWarnings?.includes(r.note)?`<p class="note-text">${esc(r.note)}</p>`:''}<h3 class="dialog-section-title">القراء العشرة والروايات العشرون · ${ar(r.variants.length)} أوجه موصوفة</h3><div class="matrix-wrap"><table class="matrix"><thead><tr><th scope="col">القارئ</th><th scope="col">الراوي</th><th scope="col" colspan="2">الأوجه وبيان النطق والقيود</th></tr></thead><tbody>${matrix}</tbody></table></div>${tawjihMarkup(r)}${supplementaryMarkup(r)}${audio}<div class="source-detail"><p><b>المصدر:</b> <a href="${esc(r.source.url)}" target="_blank" rel="noopener">${esc(r.source.title)} ↗</a><br>${esc(r.source.location)}</p><p><b>نطاق النسبة:</b> ${esc(r.scope)}<br><b>حالة الأداء:</b> ${esc(r.state)}</p>${r.source.quotation?`<details><summary>نص الشاهد في المرجع</summary><p>${esc(r.source.quotation)}</p></details>`:''}${r.corrections?.length?`<details><summary>سجل التصحيحات (${ar(r.corrections.length)})</summary>${r.corrections.map(c=>`<p>${esc(c.reason||c.note||c.operation)} ${esc(c.source||'')}${c.evidence?.length?'<br>'+c.evidence.map(e=>esc(e.book+' '+e.volume_page+': '+e.quote)).join('<br>'):''}</p>`).join('')}</details>`:''}</div><div class="detail-buttons"><button data-print-dialog="true" type="button">طباعة المقارنة</button><button data-cite="${r.id}" type="button">نسخ الإحالة</button><button data-record-link="${r.id}" type="button">نسخ رابط الموضع</button><button data-context="${r.surah}:${r.ayah}" type="button">سياق الآية</button><button data-verse-words="${r.surah}:${r.ayah}" type="button">كلمات الآية</button><button data-verse-witness="${r.surah}:${r.ayah}" type="button">شواهد الصفحة</button></div>`);
  if(focusTawjih)$('tawjih-section').scrollIntoView({behavior:'smooth',block:'start'});
  if(audios.length)$('audio-narrator').addEventListener('change',()=>{const info=C.audioInfo(D,r,$('audio-narrator').value),u=info?.url,el=$('source-audio');$('recording-description').textContent=info?(info.recording?.title||'تسجيل من المصدر')+' · رقم المقطع لدى المصدر: '+info.sourceCode:'';el.pause();if(u){el.src=u;$('audio-link').href=u;}else{el.removeAttribute('src');$('audio-link').removeAttribute('href');}$('audio-link').classList.toggle('hidden',!u);});
 }
 function showWitness(id){const w=W.records.find(x=>x.id===id);if(!w)return;openDialog(`<div class="dialog-kicker">شاهد من المصدر · صفحة ${ar(w.page)}</div><h2 class="dialog-title" id="dialog-title">نص التعليق كاملاً</h2><div class="witness-text">${esc(w.text)}</div><div class="source-detail">مشروع تيسير القراءات العشر · التعليق ${esc(String(w.annotationIndex||w.id.split('-').at(-1)))}<br>النص من مرآة JSON؛ قد تختلف تفاصيل نسخة عارض المصحف. لم يُفك ترميز الشواهد آلياً.</div><div class="detail-buttons"><a href="${esc(w.sourceUrl)}" target="_blank" rel="noopener">افتح صفحة المصحف ↗</a><a href="${esc(w.rawUrl)}" target="_blank" rel="noopener">النص الأصلي ↗</a></div>`);}
 function showContext(ref){const [s,a]=ref.split(':').map(Number);const verse=E.verseMap.get(ref);if(!verse)return;openDialog(`<div class="dialog-kicker">السياق القرآني · النص المرجعي برواية حفص</div><h2 class="dialog-title" id="dialog-title">${esc(D.surahs[s-1])} — الآية ${ar(a)}</h2>${E.context(s,a,1).map(v=>`<p class="context-row ${v.ayah===a?'current':''}">${esc(v.text)} <small>﴿${ar(v.ayah)}﴾</small></p>`).join('')}<div class="source-detail">أرقام الآيات وفق العد الكوفي. المصدر: <a href="https://tanzil.net/" target="_blank" rel="noopener">Tanzil Project</a>.</div><div class="detail-buttons"><button data-verse-comparison="${s}:${a}" type="button">المقارنات المفصلة</button><button data-verse-witness="${s}:${a}" type="button">شواهد صفحة الآية</button></div>`);}
 async function copy(text){try{await navigator.clipboard.writeText(text);toast('نُسخ إلى الحافظة');}catch{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();toast(ok?'نُسخ إلى الحافظة':'تعذر النسخ؛ يمكنك نسخ الرابط من شريط العنوان');}}
 function recordLink(id){const r=D.records.find(x=>x.id===id);return location.origin+location.pathname+'#search?'+new URLSearchParams({q:r.surah+':'+r.ayah,record:id}).toString();}
 function wordLink(id){const w=E.wordMap.get(id);return location.origin+location.pathname+'#search?'+new URLSearchParams({q:w.surah+':'+w.ayah,mode:'words',word:id}).toString();}
 function citation(r){return `أطلس القراءات العشر، الإصدار ${D.meta.version}، ${D.meta.date}. ${refsLabel(r)}، موضع «${r.word}». حالة السجل: ${reviewLabel(r)}. ${r.variants.map(v=>[v.text||'',v.description,labelsFor(v).join('، '),v.qualification?'قيد: '+v.qualification:'',v.narratorQualifications?Object.entries(v.narratorQualifications).map(([n,q])=>E.narrators.get(n).label+': '+q).join('؛ '):'',v.reviewNote?'حد التوثيق: '+v.reviewNote:''].filter(Boolean).join(' — ')).join('؛ ')}. نطاق النسبة: ${r.scope}. مراجع التصحيح الموضعي: ${[...new Set([...(r.variants.flatMap(v=>v.evidence||[])),...(r.corrections||[]).flatMap(c=>c.evidence||[])].map(e=>[e.book,e.volume_page,e.url].filter(Boolean).join('، ')))].join('؛ ')||'لا مراجعة موضعية مضافة'}. المرجع: ${r.source.title}، ${r.source.location}. ${r.source.url}. رابط الموضع: ${recordLink(r.id)}`;}

 function exportResults(){
  const payload={atlas:'أطلس القراءات العشر',version:D.meta.version,date:D.meta.date,scope:state.mode,query:state.q,filters:{review:state.review,surah:state.surah,category:state.category,tag:state.tag,reader:state.reader,narrator:state.narrator,pairA:state.pairA,pairB:state.pairB,pairOnly:state.pairOnly,hafsDiff:state.hafsDiff},sourceAttribution:'الموسوعة القرآنية https://quranpedia.net — إصدار '+D.meta.sourceVersion,narrators:D.narrators,readers:D.readers,recordings:D.audio.recordings,tawjih:D.tawjih,notice:state.mode==='witnesses'?'شواهد من مشروع تيسير القراءات العشر، للاستخدام غير الربحي وفق شروط المصدر. لم يفك الترميز آلياً.':D.meta.coverage,results:state.mode==='comparisons'?found.map(r=>({...r,audioByNarrator:Object.fromEntries(D.narrators.map(n=>[n.id,C.audioURL(D,r,n.id)]).filter(x=>x[1]))})):found};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='qiraat-atlas-'+state.mode+'-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('جُهّز ملف النتائج مع مصادره');
 }
 function downloadFile(text,name,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 function exportCSV(){
  const credit='الموسوعة القرآنية https://quranpedia.net — إصدار '+D.meta.sourceVersion,rows=[];
  if(state.mode==='comparisons'){
   rows.push(['معرف السجل','السورة','الآية','المواضع المشمولة','الكلمة','القارئ','الراوي','الوجه المكتوب','وصف الأداء','قيود الوجه','قيد الطريق للراوي','حد المراجعة','حالة السجل','المصدر','موضع المرجع','رابط المرجع','نطاق النسبة','السياق','رابط الموضع','نسبة البيانات','تنبيه']);
   for(const r of found)for(const n of D.narrators){const vs=C.variantsFor(r,n.id);for(const v of vs.length?vs:[null])rows.push([r.id,D.surahs[r.surah-1],r.ayah,refsLabel(r),r.word,E.readers.get(n.readerId).name,n.label,v?.text,v?.description||(r.notApplicable?.includes(n.id)?'غير منطبق في السياق المحدد':'نسبة غير مثبتة'),v?.qualification,v?.narratorQualifications?.[n.id],v?.reviewNote,reviewLabel(r),r.source.title,r.source.location,r.source.url,r.scope,r.state,recordLink(r.id),credit,D.meta.coverage]);}
  }else if(state.mode==='witnesses'){
   rows.push(['معرف الشاهد','صفحة المصحف','نص الشاهد','رابط الصفحة','رابط النص','نسبة البيانات','تنبيه']);for(const r of found)rows.push([r.id,r.page,r.text,r.sourceUrl,r.rawUrl,'تيسير القراءات العشر https://quraat.info/','للاستخدام غير الربحي وفق شروط المصدر؛ الرموز لم تحلل آلياً.']);
  }else{
   rows.push(['المعرف','السورة','الآية','ترتيب الكلمة','النص','سجلات الأداء المرتبطة','نسبة النص','تنبيه']);for(const r of found)rows.push([r.id||r.surah+':'+r.ayah,D.surahs[r.surah-1],r.ayah,r.position||'',r.text,(state.mode==='words'?E.byWord.get(r.id)||[]:E.byRef.get(r.surah+':'+r.ayah)||[]).map(x=>x.id).join(' | '),'Tanzil Project https://tanzil.net — CC BY 3.0','نص مرجعي برواية حفص؛ غياب سجل مرتبط لا يثبت اتفاق القراءات.']);
  }
  downloadFile(window.AtlasResearch.csv(rows),'qiraat-atlas-'+state.mode+'.csv','text/csv;charset=utf-8');toast('جُهّز جدول النتائج مع النسب والمراجع');
 }
 $('export-csv').addEventListener('click',exportCSV);
 $('backup-saved').addEventListener('click',()=>{downloadFile(JSON.stringify({format:'qiraat-atlas-bookmarks-v1',atlasVersion:D.meta.version,createdAt:new Date().toISOString(),ids:saved},null,2),'qiraat-atlas-bookmarks.json','application/json;charset=utf-8');$('backup-status').textContent='جُهّزت نسخة من '+ar(saved.length)+' موضعاً محفوظاً.';});
 $('restore-saved').addEventListener('click',()=>$('restore-file').click());
 $('restore-file').addEventListener('change',async()=>{const file=$('restore-file').files[0];if(!file)return;try{if(file.size>1000000)throw new Error('حجم الملف أكبر من الحد المسموح: 1 ميغابايت.');const data=window.AtlasResearch.savedIds(JSON.parse(await file.text()),new Set(D.records.map(r=>r.id))),before=saved.length;saved=[...new Set([...saved,...data.ids])];persistSaved();controls();render();$('backup-status').textContent='أُضيف '+ar(saved.length-before)+' موضعاً.'+(data.unknown?' استُبعد '+ar(data.unknown)+' معرفاً غير موجود في هذه النسخة.':'');}catch(e){$('backup-status').textContent=e instanceof SyntaxError?'الملف لا يحتوي JSON صالحاً.':e.message;}finally{$('restore-file').value='';}});
 function renderReaders(){
  $('reader-grid').innerHTML=D.readers.map(r=>`<article class="reader-card"><div class="reader-card-heading"><span class="reader-order">${ar(r.order)}</span><div><h2>${esc(r.name)}</h2><small>${esc(r.fullName)}</small></div></div><div class="reader-meta"><span>${esc(r.city)}</span><span>•</span><span>ت ${esc(r.death)} هـ</span></div><div class="narrator-list">${r.narrators.map(id=>{const n=E.narrators.get(id);return `<div class="narrator-row"><b>${esc(n.name)}</b><span>${esc(n.fullName)}</span><small>ت ${esc(n.death)} هـ</small></div>`;}).join('')}</div><button data-reader="${r.id}" type="button">استكشف الخلاف مع حفص ←</button></article>`).join('');
 }
 function renderSources(){
  $('source-grid').innerHTML=D.sources.map(s=>`<article class="source-card"><span class="source-tag">${esc(s.kind)}</span><h3>${esc(s.title)}</h3><span class="source-author">${esc(s.author)}</span><p>${esc(s.desc)}</p><a href="${esc(s.url)}" target="_blank" rel="noopener">افتح المصدر <span aria-hidden="true">↗</span></a></article>`).join('');
  $('similar-grid').innerHTML=D.similar.map(s=>`<a class="similar-card" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="similar-icon" aria-hidden="true">↗</span><div><h3>${esc(s.title)}</h3><small>${esc(s.label)}</small><p>${esc(s.desc)}</p></div></a>`).join('');
 }
 function jumpToRef(ref,mode){const previous=rememberPage();endDialog(false);state.q=ref;state.mode=mode;state.surah='';state.category='';state.tag='';state.reader='';state.narrator='';state.hafsDiff=false;state.pairOnly=false;state.savedOnly=false;state.page='';state.review='';navigate(toHash(),previous);activePage='search';controls();render();document.querySelectorAll('[data-page]').forEach(el=>el.classList.toggle('hidden',el.dataset.page!=='search'));$('results-title').scrollIntoView({behavior:'smooth',block:'start'});}
 document.addEventListener('click',e=>{
  const b=e.target.closest('button,a');if(!b)return;
  if(b.dataset.backDialog){backDialog();return;}
  if(b.dataset.backPage){backPage();return;}
  if(b.tagName==='A'&&b.getAttribute('href')?.startsWith('#')&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();navigate(b.getAttribute('href'));return;}
  if(b.dataset.printDialog){window.print();return;}
  if(b.dataset.query!==undefined){newSearch(b.dataset.query);return;}
  if(b.dataset.mode){setMode(b.dataset.mode);return;}
  if(b.dataset.switch){setMode(b.dataset.switch);return;}
  if(b.dataset.reset){reset();return;}
  if(b.dataset.tawjih){showDetail(b.dataset.tawjih,true);return;}
  if(b.dataset.learnTawjih){endDialog();return;}
  if(b.dataset.citeTawjih){const t=D.tawjih.entries.find(t=>t.id===b.dataset.citeTawjih);if(t)copy(`أطلس القراءات العشر، الإصدار ${D.meta.version}. توجيه «${t.title}»: ${t.sources.map(s=>s.title+'، '+s.author+'، '+s.location+'، '+s.url).join('؛ ')}. خلاصة محررة، لا نقل حرفي ولا حصر لجميع الأقوال. ${recordLink(b.dataset.tawjihRecord)}&section=tawjih`);return;}
  if(b.dataset.word){showWord(b.dataset.word);return;}
  if(b.dataset.verseWords){jumpToRef(b.dataset.verseWords,'words');return;}
  if(b.dataset.detail){showDetail(b.dataset.detail);return;}
  if(b.dataset.witness){showWitness(b.dataset.witness);return;}
  if(b.dataset.context){showContext(b.dataset.context);return;}
  if(b.dataset.verseComparison){jumpToRef(b.dataset.verseComparison,'comparisons');return;}
  if(b.dataset.verseWitness){jumpToRef(b.dataset.verseWitness,'witnesses');return;}
  if(b.dataset.save){const id=b.dataset.save;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];persistSaved();render();document.querySelector(`[data-save="${id}"]`)?.focus({preventScroll:true});toast(saved.includes(id)?'أُضيف الموضع إلى المحفوظات':'أُزيل الموضع من المحفوظات');return;}
  if(b.dataset.recordLink){copy(recordLink(b.dataset.recordLink));return;}
  if(b.dataset.wordLink){copy(wordLink(b.dataset.wordLink));return;}
  if(b.dataset.cite){const r=D.records.find(x=>x.id===b.dataset.cite);if(r)copy(citation(r));return;}
  if(b.dataset.reader){const previous=rememberPage();state.review='';state.reader=b.dataset.reader;state.narrator='';state.hafsDiff=true;state.mode='comparisons';state.q='';state.surah='';state.category='';state.tag='';state.savedOnly=false;state.pairOnly=false;navigate(toHash(),previous);return;}
  if(b.dataset.removeFilter){const k=b.dataset.removeFilter;state[k]=k==='savedOnly'?false:'';if(k==='reader'){state.narrator='';state.hafsDiff=false;}if(k==='narrator'&&!state.reader)state.hafsDiff=false;state.limit=6;controls();render();}
 });
 $('search-form').addEventListener('submit',e=>{e.preventDefault();clearTimeout(inputTimer);state.q=$('search-input').value.trim();state.limit=6;state.savedOnly=false;render();$('results-title').scrollIntoView({behavior:'smooth',block:'start'});});
 $('search-input').addEventListener('input',()=>{clearTimeout(inputTimer);inputTimer=setTimeout(()=>newSearch($('search-input').value.trim()),210);});
 for(const [id,key] of [['surah-filter','surah'],['category-filter','category'],['tag-filter','tag'],['page-filter','page'],['review-filter','review']])$(id).addEventListener('change',()=>{state[key]=$(id).value;state.limit=6;render();});
 $('reader-filter').addEventListener('change',()=>{state.reader=$('reader-filter').value;state.narrator='';state.hafsDiff=!!state.reader;state.limit=6;controls();render();});
 $('narrator-filter').addEventListener('change',()=>{state.narrator=$('narrator-filter').value;state.hafsDiff=!!state.narrator||!!state.reader;state.limit=6;controls();render();});
 $('hafs-diff').addEventListener('change',()=>{state.hafsDiff=$('hafs-diff').checked;state.limit=6;render();});
 for(const [id,key] of [['pair-a','pairA'],['pair-b','pairB']])$(id).addEventListener('change',()=>{state[key]=$(id).value;state.limit=6;render();});
 $('pair-only').addEventListener('change',()=>{state.pairOnly=$('pair-only').checked;state.limit=6;render();});
 $('reset-filters').addEventListener('click',reset);$('load-more').addEventListener('click',()=>{state.limit+=6;render();});$('export-results').addEventListener('click',exportResults);
 $('copy-search').addEventListener('click',()=>copy(location.origin+location.pathname+toHash()));
 $('saved-nav').addEventListener('click',()=>{const previous=activePage!=='search'?rememberPage():null;state.review='';state.mode='comparisons';state.savedOnly=!state.savedOnly;state.q='';state.surah='';state.category='';state.tag='';state.reader='';state.narrator='';state.hafsDiff=false;state.pairOnly=false;state.limit=6;if(activePage!=='search')navigate(toHash(),previous);else{controls();render();$('results-title').scrollIntoView({behavior:'smooth',block:'start'});}});
 $('close-dialog').addEventListener('click',()=>endDialog());$('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog')){const r=$('detail-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)endDialog();}});
 $('detail-dialog').addEventListener('close',()=>{if(silentCloses){silentCloses--;return;}if(!$('detail-dialog').open)endDialog();});
 document.querySelectorAll('[role="tab"]').forEach(tab=>tab.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...document.querySelectorAll('[role="tab"]')];let i=tabs.indexOf(tab);i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowLeft'?1:-1)+tabs.length)%tabs.length;setMode(tabs[i].dataset.mode);tabs[i].focus();}}));
 window.addEventListener('hashchange',parseHash);
 options();renderReaders();renderSources();parseHash();
 window.addEventListener('beforeprint',()=>document.body.classList.toggle('print-dialog',$('detail-dialog').open));
 window.addEventListener('afterprint',()=>document.body.classList.remove('print-dialog'));
 window.QiraatAtlas={engine:E,state,render,showDetail,showWord,openDialog,copy,toast,navigate,backPage,backDialog};
})();
