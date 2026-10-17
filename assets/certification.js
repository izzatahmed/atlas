(()=>{
 'use strict';
 const input=document.getElementById('question-search'),filter=document.getElementById('question-state'),count=document.getElementById('question-count'),rows=[...document.querySelectorAll('.question')];
 if(!input||!filter||!count)return;
 const norm=x=>x.normalize('NFKD').replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g,'').replace(/[أإآٱ]/g,'ا');
 function render(){const q=norm(input.value.trim());let visible=0;for(const r of rows){r.hidden=!!((filter.value&&r.dataset.state!==filter.value)||(q&&!norm(r.textContent).includes(q)));if(!r.hidden)visible++;}count.textContent=visible.toLocaleString('ar-EG')+' من '+rows.length.toLocaleString('ar-EG')+' سؤالاً';}
 input.addEventListener('input',render);filter.addEventListener('change',render);render();
})();
