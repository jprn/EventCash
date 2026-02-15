(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;

  function toast(msg,type){
    const el=$("#toast");
    el.className="toast "+(type||"");
    el.textContent=msg;
    el.style.display="block";
  }

  async function lookup(){
    const token=String($("#token").value||"").trim();
    if(!token){throw new Error("missing_token");}
    toast("Chargement…");
    const data=await api.walletByToken(token);
    const w=data.wallet;
    $("#balance").textContent=String(w.balance)+"€";
    $("#active").textContent=String(w.is_active)==="1"?"actif":"inactif";
    $("#walletId").textContent=String(w.id);
    toast("OK.","ok");
  }

  function init(){
    $("#lookup").addEventListener("click",()=>lookup().catch(e=>toast(e.message,"err")));
    $("#token").addEventListener("keydown",e=>{if(e.key==="Enter"){lookup().catch(er=>toast(er.message,"err"));}});
    toast("Prêt.");
  }

  window.addEventListener("DOMContentLoaded",init);
})();
