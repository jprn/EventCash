(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;
  const state={wallet:null};

  function toast(msg,type){
    const el=$("#toast");
    el.className="toast "+(type||"");
    el.textContent=msg;
    el.style.display="block";
  }

  function setWallet(w){
    state.wallet=w;
    $("#walletId").textContent=w?String(w.id||""):"";
    $("#walletToken").textContent=w?String(w.qr_token||""):"";
    $("#walletBalance").textContent=w?String(w.balance||"0.00"):"0.00";
  }

  async function renderQr(token){
    const wrap=$("#qr");
    wrap.innerHTML="";
    if(!token){return;}
    const value=String(token);
    if(window.QRCode&&typeof window.QRCode.toCanvas==="function"){
      const canvas=document.createElement("canvas");
      wrap.appendChild(canvas);
      await window.QRCode.toCanvas(canvas,value,{width:220,margin:1});
      return;
    }
    wrap.textContent=value;
  }

  function amountFromInput(){
    const v=String($("#amount").value||"").replace(",",".");
    const n=Number(v);
    if(!Number.isFinite(n)||n<=0){throw new Error("invalid_amount");}
    return Math.round(n*100)/100;
  }

  async function createWallet(){
    toast("Création du wallet…");
    const data=await api.walletCreate();
    const w={id:data.id,qr_token:data.qr_token,balance:data.balance,is_active:data.is_active};
    setWallet(w);
    await renderQr(w.qr_token);
    toast("Wallet créé.","ok");
  }

  async function credit(){
    if(!state.wallet){throw new Error("no_wallet");}
    const amount=amountFromInput();
    toast("Recharge…");
    const data=await api.walletCredit(state.wallet.id,amount);
    state.wallet.balance=data.balance;
    setWallet(state.wallet);
    toast("Recharge OK.","ok");
  }

  function bind(){
    $("#createWallet").addEventListener("click",()=>createWallet().catch(e=>toast(e.message,"err")));
    $("#credit").addEventListener("click",()=>credit().catch(e=>toast(e.message,"err")));
    document.querySelectorAll("[data-amt]").forEach(btn=>btn.addEventListener("click",()=>{$("#amount").value=btn.getAttribute("data-amt");}));
    $("#printQr").addEventListener("click",()=>{
      const token=state.wallet?state.wallet.qr_token:"";
      if(!token){toast("Aucun wallet.","err");return;}
      const w=window.open("","_blank");
      if(!w){toast("Popup bloquée.","err");return;}
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>QR</title><style>body{font-family:system-ui;margin:24px} .t{font-size:14px;color:#111;margin-top:10px;word-break:break-all}</style></head><body><div id="q"></div><div class="t">'+token+'</div><script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script><script>QRCode.toCanvas(document.getElementById("q"),"'+token+'",{width:320,margin:1});window.print();<\/script></body></html>');
      w.document.close();
    });
  }

  function init(){
    bind();
    toast("Prêt.");
  }

  window.addEventListener("DOMContentLoaded",init);
})();
