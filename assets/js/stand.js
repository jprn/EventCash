(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;
  const standName=String(window.EVENCASH_STAND_NAME||"");
  const state={wallet:null,products:[],selected:null,token:""};

  function toast(msg,type){
    const el=$("#toast");
    el.className="toast "+(type||"");
    el.textContent=msg;
    el.style.display="block";
  }

  function setWallet(w){
    state.wallet=w;
    $("#walletId").textContent=w?String(w.id||""):"";
    $("#walletBalance").textContent=w?String(w.balance||"0.00"):"0.00";
    $("#walletActive").textContent=w?(String(w.is_active)==="1"?"actif":"inactif"):"";
  }

  function renderProducts(){
    const box=$("#products");
    box.innerHTML="";
    state.products.forEach(p=>{
      const btn=document.createElement("button");
      btn.type="button";
      const isActive=state.selected&&state.selected.id===p.id;
      const useNew=document.body && document.body.classList && document.body.classList.contains('stand');
      btn.className=useNew?("s-chip "+(isActive?"active":"")):("btn small "+(isActive?"primary":""));
      btn.textContent=p.name+" — "+p.price+"€";
      btn.addEventListener("click",()=>{state.selected=p;renderProducts();});
      box.appendChild(btn);
    });
  }

  async function loadProducts(){
    const data=await api.productsList(standName);
    state.products=(data.products||[]).map(p=>({id:p.id,name:p.name,price:String(p.price),stand:p.stand}));
    renderProducts();
  }

  async function lookupToken(){
    const token=String($("#token").value||"").trim();
    if(!token){throw new Error("missing_token");}
    toast("Recherche…");
    const data=await api.walletByToken(token);
    const w=data.wallet;
    state.token=token;
    setWallet(w);
    toast("Wallet chargé.","ok");
  }

  async function debit(){
    if(!state.token){throw new Error("missing_token");}
    if(!state.selected){throw new Error("missing_product");}
    toast("Débit…");
    const amount=Number(String(state.selected.price).replace(",","."));
    const data=await api.walletDebit(state.token,amount,state.selected.name,standName);
    $("#walletBalance").textContent=String(data.balance);
    toast("Paiement OK.","ok");
    const audio=$("#beep");
    if(audio&&typeof audio.play==="function"){
      audio.currentTime=0;
      audio.play().catch(()=>{});
    }
  }

  function init(){
    $("#standName").textContent=standName;
    $("#lookup").addEventListener("click",()=>lookupToken().catch(e=>toast(e.message,"err")));
    $("#debit").addEventListener("click",()=>debit().catch(e=>toast(e.message,"err")));
    $("#token").addEventListener("keydown",e=>{if(e.key==="Enter"){lookupToken().catch(er=>toast(er.message,"err"));}});
    loadProducts().catch(e=>toast(e.message,"err"));
    toast("Prêt.");
  }

  window.addEventListener("DOMContentLoaded",init);
})();
