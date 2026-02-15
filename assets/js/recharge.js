(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;
  const state={wallet:null};
  let mode="new";

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
    try{
      if(typeof window.ensureQRCodeLib === 'function'){
        await window.ensureQRCodeLib();
      }
      if(window.QRCode&&typeof window.QRCode.toCanvas==="function"){
        const canvas=document.createElement("canvas");
        wrap.appendChild(canvas);
        await window.QRCode.toCanvas(canvas,value,{width:220,margin:1});
        return;
      }
    } catch(_e) {
      // fallback below
    }
    wrap.textContent=value;
    toast("QR indisponible (lib non chargée).","err");
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

    showSuccessScreen();
  }

  async function loadExisting(){
    const token=String($("#existingToken").value||"").trim();
    if(!token){throw new Error("missing_token");}
    toast("Chargement du wallet…");
    const data=await api.walletByToken(token);
    const w=data.wallet;
    setWallet(w);
    await renderQr(w.qr_token);
    toast("Wallet chargé.","ok");
  }

  async function credit(){
    if(!state.wallet){throw new Error("no_wallet");}
    const amount=amountFromInput();
    toast("Recharge…");
    const data=await api.walletCredit(state.wallet.id,amount);
    state.wallet.balance=data.balance;
    setWallet(state.wallet);
    toast("Recharge OK.","ok");

    const successBalance=$("#successBalance");
    if(successBalance){
      successBalance.textContent=String(data.balance)+"€";
    }
  }

  async function renderQrInto(el, token, size){
    if(!el){return;}
    el.innerHTML="";
    if(!token){return;}
    const value=String(token);
    try{
      if(typeof window.ensureQRCodeLib === 'function'){
        await window.ensureQRCodeLib();
      }
      if(window.QRCode&&typeof window.QRCode.toCanvas==="function"){
        const canvas=document.createElement("canvas");
        el.appendChild(canvas);
        await window.QRCode.toCanvas(canvas,value,{width:size||240,margin:1});
        return;
      }
    } catch(_e) {
      // fallback below
    }
    el.textContent=value;
  }

  async function showSuccessScreen(){
    const form=$("#rechargeForm");
    const success=$("#successScreen");
    if(!form || !success || !state.wallet){
      return;
    }

    document.body.classList.add('r-successBg');

    const bal=$("#successBalance");
    if(bal){
      bal.textContent=String(state.wallet.balance||"0.00")+"€";
    }

    await renderQrInto($("#payQr"), state.wallet.qr_token, 260);

    const cfg=(window.EVENCASH_CONFIG||{});
    const clientPath=String(cfg.CLIENT_PATH||"/client/");
    const clientUrl=new URL(clientPath, window.location.origin);
    clientUrl.searchParams.set('token', String(state.wallet.qr_token||""));
    await renderQrInto($("#phoneQr"), clientUrl.toString(), 260);

    form.style.display='none';
    success.style.display='block';
  }

  function hideSuccessScreen(){
    const form=$("#rechargeForm");
    const success=$("#successScreen");
    if(form){form.style.display='block';}
    if(success){success.style.display='none';}
    document.body.classList.remove('r-successBg');
  }

  function setMode(next){
    mode=next;

    const tabNew=$("#tab-new");
    const tabExisting=$("#tab-existing");
    const existingBlock=$("#existingBlock");
    const createBtn=$("#createWallet");
    const creditBtn=$("#credit");

    if(mode==="new"){
      tabNew.classList.add("active");
      tabNew.setAttribute("aria-selected","true");
      tabExisting.classList.remove("active");
      tabExisting.setAttribute("aria-selected","false");
      existingBlock.style.display="none";

      createBtn.style.display="flex";
      creditBtn.style.display="inline-flex";
      creditBtn.disabled=!state.wallet;
    } else {
      tabExisting.classList.add("active");
      tabExisting.setAttribute("aria-selected","true");
      tabNew.classList.remove("active");
      tabNew.setAttribute("aria-selected","false");
      existingBlock.style.display="block";

      createBtn.style.display="none";
      creditBtn.style.display="inline-flex";
      creditBtn.disabled=!state.wallet;
    }
  }

  function bind(){
    $("#tab-new").addEventListener("click",()=>setMode("new"));
    $("#tab-existing").addEventListener("click",()=>setMode("existing"));

    $("#createWallet").addEventListener("click",()=>createWallet().then(()=>setMode("new")).then(()=>{
      $("#credit").disabled=false;
    }).catch(e=>toast(e.message,"err")));
    $("#loadExisting").addEventListener("click",()=>loadExisting().then(()=>{
      $("#credit").disabled=false;
    }).catch(e=>toast(e.message,"err")));
    $("#existingToken").addEventListener("keydown",e=>{if(e.key==="Enter"){loadExisting().then(()=>{$("#credit").disabled=false;}).catch(er=>toast(er.message,"err"));}});

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

    const successPrint=$("#successPrint");
    if(successPrint){
      successPrint.addEventListener('click',()=>{
        // reuse existing print logic
        $("#printQr").click();
      });
    }

    const newAgain=$("#newWalletAgain");
    if(newAgain){
      newAgain.addEventListener('click',()=>{
        hideSuccessScreen();
        setWallet(null);
        renderQr("");
        setMode('new');
        $("#amount").value='';
        $("#existingToken").value='';
        $("#credit").disabled=true;
      });
    }
  }

  function init(){
    bind();
    setMode("new");
    toast("Prêt.");
  }

  window.addEventListener("DOMContentLoaded",init);
})();
