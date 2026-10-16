(function(){
 'use strict';
 document.querySelectorAll('[data-document-back]').forEach(button=>button.addEventListener('click',()=>{
  let previous;try{previous=new URL(document.referrer);}catch{}
  const base=new URL('./',location.href),paths=[base.pathname,...['index.html','review.html','review-next.html'].map(name=>base.pathname+name)];
  if(previous?.origin===location.origin&&paths.includes(previous.pathname)&&history.length>1)history.back();
  else location.href='./index.html#learn/method';
 }));
})();
