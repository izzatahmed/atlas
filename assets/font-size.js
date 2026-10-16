(function(){
 'use strict';
 const key='qiraat-atlas-font-size-v1',levels=[100,110,125,150,175,200],root=document.documentElement;
 const valid=value=>levels.includes(Number(value))?Number(value):100;
 let scale=100;try{scale=valid(localStorage.getItem(key));}catch{}
 function apply(value,persist=false){
  scale=valid(value);root.style.fontSize=scale+'%';root.dataset.fontScale=String(scale);root.dataset.largeText=String(scale>=150);
  if(persist)try{localStorage.setItem(key,String(scale));}catch{}
  const output=document.getElementById('font-size-value');if(!output)return;
  output.textContent=scale.toLocaleString('ar-EG')+'٪';
  document.getElementById('font-size-smaller').disabled=scale===levels[0];
  document.getElementById('font-size-larger').disabled=scale===levels.at(-1);
  document.getElementById('font-size-reset').disabled=scale===100;
 }
 // Restore before styles and body render, avoiding a flash at the wrong size.
 apply(scale);
 function setup(){
  if(!document.getElementById('font-size-larger'))return;
  document.getElementById('font-size-larger').addEventListener('click',()=>apply(levels[Math.min(levels.length-1,levels.indexOf(scale)+1)],true));
  document.getElementById('font-size-smaller').addEventListener('click',()=>apply(levels[Math.max(0,levels.indexOf(scale)-1)],true));
  document.getElementById('font-size-reset').addEventListener('click',()=>apply(100,true));apply(scale);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
 window.addEventListener('storage',e=>{if(e.key===key||e.key===null)apply(e.newValue);});
})();
