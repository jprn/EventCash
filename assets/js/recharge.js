(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;
  const state={wallet:null};
  let mode="new";

  async function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;
      s.async=true;
      s.onload=()=>resolve();
      s.onerror=()=>reject(new Error('failed:'+src));
      document.head.appendChild(s);
    });
  }

  async function ensureJsQR(){
    if(typeof window.jsQR === 'function') return true;
    const sources=[
      'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
      'https://unpkg.com/jsqr@1.4.0/dist/jsQR.js',
    ];
    for(const src of sources){
      try{
        await loadScript(src);
        if(typeof window.jsQR === 'function') return true;
      }catch(_e){
        // continue
      }
    }
    return false;
  }

  async function scanQr(){
    if(!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia){
      throw new Error('camera_unavailable');
    }
    const hasBarcodeDetector=(typeof window.BarcodeDetector === 'function');
    const detector=hasBarcodeDetector ? new window.BarcodeDetector({formats:['qr_code']}) : null;

    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9999';
    const card=document.createElement('div');
    card.style.cssText='width:min(520px,100%);background:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(15,23,42,.10);box-shadow:0 28px 80px rgba(15,23,42,.25)';
    const head=document.createElement('div');
    head.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.08)';
    head.innerHTML='<div style="font-weight:1000">Scanner le QR code</div>';
    const close=document.createElement('button');
    close.type='button';
    close.textContent='Fermer';
    close.style.cssText='appearance:none;border:1px solid rgba(15,23,42,.10);background:rgba(255,255,255,.9);border-radius:12px;min-height:38px;padding:0 12px;font-weight:1000;cursor:pointer';
    head.appendChild(close);

    const body=document.createElement('div');
    body.style.cssText='padding:14px';
    const video=document.createElement('video');
    video.setAttribute('playsinline','');
    video.style.cssText='width:100%;border-radius:12px;background:#000';
    const hint=document.createElement('div');
    hint.style.cssText='margin-top:10px;color:rgba(15,23,42,.65);font-size:13px;text-align:center;font-weight:900';
    hint.textContent='Présentez le QR code devant la caméra';
    body.appendChild(video);
    body.appendChild(hint);

    card.appendChild(head);
    card.appendChild(body);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    let stream=null;
    let raf=0;
    const cleanup=()=>{
      if(raf) cancelAnimationFrame(raf);
      if(stream){
        stream.getTracks().forEach(t=>t.stop());
        stream=null;
      }
      overlay.remove();
    };
    close.addEventListener('click',cleanup);
    overlay.addEventListener('click',e=>{if(e.target===overlay) cleanup();});

    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
      video.srcObject=stream;
      await video.play();
    } catch(_e){
      cleanup();
      throw new Error('camera_permission_denied');
    }

    return await new Promise((resolve,reject)=>{
      const tick=async ()=>{
        try{
          if(video.readyState>=2){
            if(detector){
              const codes=await detector.detect(video);
              if(codes && codes[0] && codes[0].rawValue){
                const val=String(codes[0].rawValue||'').trim();
                cleanup();
                resolve(val);
                return;
              }
            } else {
              const ok=await ensureJsQR();
              if(!ok){
                cleanup();
                reject(new Error('barcode_detector_unavailable'));
                return;
              }
              const w=video.videoWidth||0;
              const h=video.videoHeight||0;
              if(w>0 && h>0){
                const canvas=document.createElement('canvas');
                canvas.width=w;
                canvas.height=h;
                const ctx=canvas.getContext('2d',{willReadFrequently:true});
                if(ctx){
                  ctx.drawImage(video,0,0,w,h);
                  const img=ctx.getImageData(0,0,w,h);
                  const code=window.jsQR(img.data,w,h,{inversionAttempts:'attemptBoth'});
                  if(code && code.data){
                    const val=String(code.data||'').trim();
                    cleanup();
                    resolve(val);
                    return;
                  }
                }
              }
            }
          }
          raf=requestAnimationFrame(tick);
        } catch(e){
          cleanup();
          reject(e);
        }
      };
      tick();
    });
  }

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

    const scan=$("#existingScan");
    if(scan){
      scan.addEventListener('click',async ()=>{
        try{
          const token=await scanQr();
          $("#existingToken").value=token;
          await loadExisting();
        }catch(e){
          toast(e.message,"err");
        }
      });
    }

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
