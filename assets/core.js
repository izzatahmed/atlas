(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function digits(value){return String(value).replace(/[٠-٩۰-۹]/g,c=>{const a='٠١٢٣٤٥٦٧٨٩'.indexOf(c);return a<0?'۰۱۲۳۴۵۶۷۸۹'.indexOf(c):a;});}
function normalize(value){return digits(value||'').normalize('NFKD').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/[^\p{L}\p{N}:\s/]/gu,' ').replace(/\s+/g,' ').trim().toLowerCase();}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function parseReference(query,surahs){
 const q=normalize(query).replace(/^سورة\s+/,'').replace(/\s+(?:الاية|اية)\s*/,' ');if(!q)return null;
 let m=q.match(/^(\d{1,3})\s*[:/]\s*(\d{1,3})$/)||q.match(/^(\d{1,3})\s+(\d{1,3})$/);if(m)return{surah:+m[1],ayah:+m[2]};
 const names=surahs.map(normalize),idx=names.indexOf(q);if(idx>=0)return{surah:idx+1,ayah:null};
 m=q.match(/^(.+?)\s*[:/]?\s+(\d{1,3})$/)||q.match(/^(.+?)\s*[:/]\s*(\d{1,3})$/);if(m){const n=names.indexOf(m[1].trim());if(n>=0)return{surah:n+1,ayah:+m[2]};}return null;
}
function matchText(haystack,query){return !query||query.split(' ').filter(Boolean).every(t=>haystack.includes(t));}
function variantsFor(record,narrator){return record.variants.filter(v=>v.narrators.includes(narrator));}
function variantFor(record,narrator){return variantsFor(record,narrator)[0];}
function faceKey(v){return [v.text||'',v.description||''].join('|');}
function compareFaces(record,a,b){
 const av=variantsFor(record,a),bv=variantsFor(record,b);if(!av.length||!bv.length)return'unknown';
 // A partial rule and a composite description cannot establish full agreement.
 if([...av,...bv].some(v=>v.reviewedScope&&!['complete_description','local_typographical_correction_only'].includes(v.reviewedScope)))return'limited';
 const aa=new Set(av.map(faceKey)),bb=new Set(bv.map(faceKey));
 if(aa.size===bb.size&&[...aa].every(k=>bb.has(k)))return'same';
 return [...aa].some(k=>bb.has(k))?'overlap':'different';
}
function audioURL(data,record,narrator){const n=record.audioByNarrator?.[narrator],t=data.audio?.tracks[n];if(!t)return null;const u=data.audio.prefixes[t[0]]+t[1];return u.startsWith('https://')?u:null;}
function audioInfo(data,record,narrator){const track=data.audio?.tracks[record.audioByNarrator?.[narrator]];if(!track)return null;return{url:audioURL(data,record,narrator),recording:data.audio.recordings?.[track[0]]||null,sourceCode:track[1].replace(/\.mp3$/i,'')};}
function createEngine(data,quran,witnessBundle={records:[]}){
 const readers=new Map(data.readers.map(r=>[r.id,r])),narrators=new Map(data.narrators.map(n=>[n.id,n]));
 const verses=quran.map(v=>({surah:v[0],ayah:v[1],text:v[2],id:`verse-${v[0]}-${v[1]}`}));
 const verseMap=new Map(verses.map(v=>[`${v.surah}:${v.ayah}`,v])),words=[],wordMap=new Map(),byWord=new Map(),byRef=new Map();
 const basmala=quran[0][2];
 for(const v of verses){let body=v.text;if(v.ayah===1&&![1,9].includes(v.surah)&&body.startsWith(basmala))body=body.slice(basmala.length).trim();let i=0;for(const text of body.split(/\s+/).filter(x=>normalize(x))){const w={id:`${v.surah}:${v.ayah}:${++i}`,surah:v.surah,ayah:v.ayah,position:i,text};words.push(w);wordMap.set(w.id,w);}}
 const tawjihMap=new Map((data.tawjih?.entries||[]).map(e=>[e.id,e]));
 const tawjihFor=r=>(r.tawjihIds||[]).map(id=>tawjihMap.get(id)).filter(Boolean);
 const records=data.records,witnesses=witnessBundle.records||[];
 for(const r of records){for(const [s,a]of r.coveredRefs||[[r.surah,r.ayah]]){const k=`${s}:${a}`;if(!byRef.has(k))byRef.set(k,[]);byRef.get(k).push(r);}for(const id of r.wordIds||[]){if(!byWord.has(id))byWord.set(id,[]);byWord.get(id).push(r);}}
 const rIndex=new Map(records.map(r=>[r.id,normalize([r.word,...r.tags,r.category,...r.variants.flatMap(v=>[v.text,v.description,v.qualification]),...(r.wordIds||[]).map(id=>wordMap.get(id)?.text||''),...tawjihFor(r).flatMap(t=>[t.title,t.relationship,...t.tags,...t.cases.flatMap(c=>[c.form,c.linguistic,c.meaning])])].join(' '))]));
 const vIndex=new Map(verses.map(v=>[v.id,normalize(v.text)])),wIndex=new Map(witnesses.map(w=>[w.id,normalize(w.text)])),wordIndex=new Map(words.map(w=>[w.id,normalize(w.text)]));
 const key=(s,a)=>s*1000+a,starts=data.pageStarts||[];
 function pageForRef(s,a){let found=null;for(const p of starts){if(key(p[1],p[2])<=key(s,a))found=p[0];else break;}return found;}
 function pagesForSurah(s){const first=pageForRef(s,1),lastAyah=verses.filter(v=>v.surah===s).at(-1)?.ayah;if(!first||!lastAyah)return[];const last=pageForRef(s,lastAyah);return Array.from({length:last-first+1},(_,i)=>first+i);}
 function search(mode,state){
  const query=normalize(state.q||''),ref=parseReference(state.q||'',data.surahs),sid=+state.surah||null;
  if(ref&&(ref.surah<1||ref.surah>114||(ref.ayah!==null&&!verseMap.has(`${ref.surah}:${ref.ayah}`))))return[];
  if(mode==='comparisons')return records.filter(r=>{
   const refs=r.coveredRefs||[[r.surah,r.ayah]];
   if(sid&&!refs.some(x=>x[0]===sid))return false;
   if(ref&&!refs.some(x=>x[0]===ref.surah&&(ref.ayah===null||x[1]===ref.ayah)))return false;
   if(!ref&&!matchText(rIndex.get(r.id),query))return false;
   if(state.category&&r.category!==state.category||state.tag&&!r.tags.includes(state.tag))return false;
   if(state.review==='tawjih'&&!r.tawjihIds?.length)return false;
   if(state.review==='primary'&&!r.review.startsWith('primary'))return false;
   if(state.review==='import'&&r.review!=='source-import')return false;
   if(state.review==='partial'&&!r.variants.some(v=>v.reviewedScope&&!['complete_description','local_typographical_correction_only'].includes(v.reviewedScope)))return false;
   if(state.review==='corrected'&&!r.corrections?.some(c=>c.patch_id||c.id||c.correctionId))return false;
   if(state.review==='alignment'&&!['approximate','source-anchor'].includes(r.alignment?.method))return false;
   if(state.savedOnly&&!(state.saved||[]).includes(r.id))return false;
   const chosen=state.narrator?[state.narrator]:state.reader?(readers.get(state.reader)?.narrators||[]):[];
   if(chosen.length&&!chosen.some(n=>variantsFor(r,n).length))return false;
   if(state.hafsDiff&&chosen.length&&!chosen.some(n=>['different','overlap'].includes(compareFaces(r,n,'asim_hafs'))))return false;
   if(state.pairOnly&&!['different','overlap'].includes(compareFaces(r,state.pairA,state.pairB)))return false;
   return true;
  });
  if(mode==='verses'||mode==='words')return(mode==='words'?words:verses).filter(v=>{
   if(sid&&v.surah!==sid)return false;if(ref)return v.surah===ref.surah&&(ref.ayah===null||v.ayah===ref.ayah);
   return matchText((mode==='words'?wordIndex:vIndex).get(v.id),query);
  });
  if(mode==='witnesses'){const pages=ref?(ref.ayah===null?pagesForSurah(ref.surah):[pageForRef(ref.surah,ref.ayah)]):null,surahPages=sid?pagesForSurah(sid):null;return witnesses.filter(w=>(!pages||pages.includes(w.page))&&(!surahPages||surahPages.includes(w.page))&&(!state.page||w.page===+state.page)&&(ref||matchText(wIndex.get(w.id),query)));}return[];
 }
 function context(s,a,radius=1){return verses.filter(v=>v.surah===s&&Math.abs(v.ayah-a)<=radius);}
 return{search,verses,verseMap,words,wordMap,byWord,byRef,readers,narrators,pageForRef,pagesForSurah,context,records,witnesses,tawjihFor,reference:q=>parseReference(q,data.surahs)};
}
return{normalize,digits,escapeHtml,parseReference,matchText,variantFor,variantsFor,compareFaces,audioURL,audioInfo,createEngine};
});
