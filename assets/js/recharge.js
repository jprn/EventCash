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
    $("#walletBalance").textContent=w?String(w.balance||"0.00")+"€":"0.00€";
    $("#walletActive").textContent=w?(String(w.is_active)==="1"?"actif":"inactif"):"";
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
        await window.QRCode.toCanvas(canvas,value,{
          width:220,
          margin:2,
          errorCorrectionLevel:'H',
          color:{dark:'#000000',light:'#ffffff'}
        });
        return;
      }
    } catch(_e) {
      // fallback below
    }
    const img=document.createElement('img');
    img.alt='QR';
    img.width=220;
    img.height=220;
    img.loading='lazy';
    img.referrerPolicy='no-referrer';
    img.src='https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=0-0-0&bgcolor=255-255-255&margin=2&ecc=H&data='+encodeURIComponent(value);
    wrap.appendChild(img);
  }

  function amountFromInput(){
    const v=String($("#amount").value||"").replace(",",".");
    const n=Number(v);
    if(!Number.isFinite(n)||n<=0){throw new Error("invalid_amount");}
    return Math.round(n*100)/100;
  }

  function optionalAmountFromInput(){
    const raw=String($("#amount").value||"").trim();
    if(!raw){
      return null;
    }
    return amountFromInput();
  }

  async function createWallet(){
    toast("Création du wallet…");
    const data=await api.walletCreate();
    const w={id:data.id,qr_token:data.qr_token,balance:data.balance,is_active:data.is_active};
    setWallet(w);

    const amount=optionalAmountFromInput();
    if(amount!==null){
      toast("Crédit du wallet…");
      const creditRes=await api.walletCredit(w.id, amount);
      w.balance=creditRes.balance;
      setWallet(w);
    }

    await renderQr(w.qr_token);
    toast("Wallet créé.","ok");

    await showSuccessScreen();
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

    const existingLoaded=$("#existingLoaded");
    const amountBlock=$("#amountBlock");
    const existingActions=$("#existingActions");
    const existingBlock=$("#existingBlock");
    if(existingBlock){existingBlock.style.display='none';}
    if(existingLoaded){existingLoaded.style.display='block';}
    if(amountBlock){amountBlock.style.display='block';}
    if(existingActions){existingActions.style.display='block';}
    $("#credit").disabled=false;
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

  async function renderQrInto(el, token, size, darkColor){
    if(!el){return;}
    el.innerHTML="";
    if(!token){return;}
    const value=String(token);
    const dark=String(darkColor||'#000000');
    try{
      if(typeof window.ensureQRCodeLib === 'function'){
        await window.ensureQRCodeLib();
      }
      if(window.QRCode&&typeof window.QRCode.toCanvas==="function"){
        const canvas=document.createElement("canvas");
        el.appendChild(canvas);
        await window.QRCode.toCanvas(canvas,value,{
          width:size||240,
          margin:2,
          errorCorrectionLevel:'H',
          color:{dark:dark,light:'#ffffff'}
        });
        return;
      }
    } catch(_e) {
      // fallback below
    }
    const s=Number(size||240);
    const img=document.createElement('img');
    img.alt='QR';
    img.width=s;
    img.height=s;
    img.loading='lazy';
    img.referrerPolicy='no-referrer';
    const colorParam=(dark.toLowerCase()==='#000000'||dark.toLowerCase()==='black')?'0-0-0':'0-0-0';
    img.src='https://api.qrserver.com/v1/create-qr-code/?size='+encodeURIComponent(String(s)+'x'+String(s))+'&color='+colorParam+'&bgcolor=255-255-255&margin=2&ecc=H&data='+encodeURIComponent(value);
    el.appendChild(img);
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

    await renderQrInto($("#payQr"), state.wallet.qr_token, 280, '#000000');

    const cfg=(window.EVENCASH_CONFIG||{});
    const clientPath=String(cfg.CLIENT_PATH||"/client/");
    const clientUrl=new URL(clientPath, window.location.origin);
    clientUrl.searchParams.set('token', String(state.wallet.qr_token||""));
    await renderQrInto($("#phoneQr"), clientUrl.toString(), 280, '#000000');

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
    const formTitle=$("#formTitle");
    const amountBlock=$("#amountBlock");
    const existingLoaded=$("#existingLoaded");
    const existingActions=$("#existingActions");

    if(next==="new"){
      tabNew.classList.add("active");
      tabExisting.classList.remove("active");
      tabNew.setAttribute("aria-selected","true");
      tabExisting.setAttribute("aria-selected","false");
      existingBlock.style.display="none";
      if(existingLoaded){existingLoaded.style.display='none';}
      if(existingActions){existingActions.style.display='none';}
      if(amountBlock){amountBlock.style.display='block';}
      createBtn.style.display="flex";
      creditBtn.disabled=true;
      if(formTitle){formTitle.textContent="Montant de la recharge";}
      setWallet(null);
      renderQr("");
      return;
    } else {
      tabExisting.classList.add("active");
      tabExisting.setAttribute("aria-selected","true");
      tabNew.classList.remove("active");
      tabNew.setAttribute("aria-selected","false");
      existingBlock.style.display="block";
      if(existingLoaded){existingLoaded.style.display='none';}
      if(existingActions){existingActions.style.display='none';}
      if(amountBlock){amountBlock.style.display='none';}
      createBtn.style.display="none";
      creditBtn.disabled=true;
      if(formTitle){formTitle.textContent="Recharger un wallet existant";}
      setWallet(null);
      renderQr("");
    }
  }

  function bind(){
    $("#tab-new").addEventListener("click",()=>setMode("new"));
    $("#tab-existing").addEventListener("click",()=>setMode("existing"));

    $("#createWallet").addEventListener("click",()=>createWallet().catch(e=>toast(e.message,"err")));
    $("#loadExisting").addEventListener("click",()=>loadExisting().then(()=>{$("#credit").disabled=false;}).catch(e=>toast(e.message,"err")));
    $("#existingToken").addEventListener("keydown",e=>{if(e.key==="Enter"){loadExisting().then(()=>{$("#credit").disabled=false;}).catch(er=>toast(er.message,"err"));}});

    const cancel=$("#cancelExisting");
    if(cancel){
      cancel.addEventListener('click',()=>{
        $("#existingToken").value='';
        $("#amount").value='';
        const existingBlock=$("#existingBlock");
        const existingLoaded=$("#existingLoaded");
        const amountBlock=$("#amountBlock");
        const existingActions=$("#existingActions");
        if(existingBlock){existingBlock.style.display='block';}
        if(existingLoaded){existingLoaded.style.display='none';}
        if(amountBlock){amountBlock.style.display='none';}
        if(existingActions){existingActions.style.display='none';}
        $("#credit").disabled=true;
        setWallet(null);
        renderQr("");
      });
    }

    $("#credit").addEventListener("click",()=>credit().catch(e=>toast(e.message,"err")));
    document.querySelectorAll("[data-amt]").forEach(btn=>btn.addEventListener("click",()=>{$("#amount").value=btn.getAttribute("data-amt");}));
    $("#printQr").addEventListener("click",()=>{
      const token=state.wallet?state.wallet.qr_token:"";
      if(!token){toast("Aucun wallet.","err");return;}
      const w=window.open("","_blank");
      if(!w){toast("Popup bloquée.","err");return;}
      const imgSrc='https://api.qrserver.com/v1/create-qr-code/?size=320x320&color=22-163-74&bgcolor=255-255-255&data='+encodeURIComponent(token);
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>QR</title><style>body{font-family:system-ui;margin:24px} img{width:320px;height:320px} .t{font-size:14px;color:#111;margin-top:10px;word-break:break-all}</style></head><body><img src="'+imgSrc+'" alt="QR" /><div class="t">'+token+'</div><script>window.onload=()=>window.print();<\/script></body></html>');
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
