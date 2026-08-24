/* NETVO gömülebilir widget — yayıncı tek satırla ekler.
   Kullanım (satıcı blogu / ajans sitesi):
     <div id="netvo-widget"></div>
     <script src="https://netvo.co/widget/embed.js" async></script>
   Dağıtım + backlink + B2B hunisi, üçü bir arada. */
(function(){
  var BASE="https://netvo.co";
  function mount(){
    var host=document.getElementById('netvo-widget');
    if(!host||host.getAttribute('data-netvo')==='1')return;
    host.setAttribute('data-netvo','1');
    var f=document.createElement('iframe');
    f.src=BASE+"/widget/netvo-widget.html";
    f.title="Netvo — pazaryeri kâr hesabı";
    f.loading="lazy";
    f.style.cssText="width:100%;max-width:380px;border:0;height:360px;overflow:hidden";
    host.appendChild(f);
    window.addEventListener('message',function(e){
      if(e.data&&typeof e.data.netvoHeight==='number') f.style.height=(e.data.netvoHeight+4)+"px";
    });
  }
  if(document.readyState!=='loading') mount(); else document.addEventListener('DOMContentLoaded',mount);
})();
