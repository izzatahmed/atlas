(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasResearch=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function csv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[\s\uFEFF]*[=+@-]/u.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');}
 function savedIds(value,known){
  if(!value||value.format!=='qiraat-atlas-bookmarks-v1'||!Array.isArray(value.ids)||value.ids.length>10000||value.ids.some(id=>typeof id!=='string'))throw new Error('ملف المحفوظات غير صالح أو غير متوافق.');
  const unique=[...new Set(value.ids)];return {ids:unique.filter(id=>known.has(id)),unknown:unique.filter(id=>!known.has(id)).length};
 }
 return {csv,savedIds};
});
