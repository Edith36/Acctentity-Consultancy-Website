var nav=document.getElementById('nav'),bg=document.getElementById('bg');
bg.onclick=function(){var o=nav.classList.toggle('open');bg.setAttribute('aria-expanded',o)};
var cf=document.getElementById('cf');
if(cf){cf.onsubmit=function(e){e.preventDefault();var f=e.target,t='Hello Acctentity, I am '+f.n.value+(f.p.value?' ('+f.p.value+')':'')+'. I need help with: '+f.s.value+'. '+f.m.value;window.open('https://wa.me/254746728341?text='+encodeURIComponent(t),'_blank')}}
