// 404.html redirect helper — externalized for CSP (no inline script)
(function(){
  try{
    var p = location.pathname;
    if(p.endsWith('/homework')||p.endsWith('/videos')||p.endsWith('/trades')||p.endsWith('/nda')){
      var t = p.split('/').pop();
      location.replace(t+'.html');
    }
  }catch(e){}
})();
