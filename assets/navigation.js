(function(){
 'use strict';
 const root=document.documentElement,toggle=document.getElementById('menu-toggle'),nav=document.getElementById('primary-navigation');
 if(!toggle||!nav)return;
 function close(){root.dataset.menuOpen='false';toggle.setAttribute('aria-expanded','false');}
 root.dataset.navReady='true';close();
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';root.dataset.menuOpen=String(open);toggle.setAttribute('aria-expanded',String(open));});
 nav.addEventListener('click',e=>{if(e.target.closest('a,button'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.dataset.menuOpen==='true'){close();toggle.focus();}});
 window.addEventListener('hashchange',close);
})();
