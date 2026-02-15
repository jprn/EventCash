(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;
  const standName=String(window.EVENCASH_STAND_NAME||"");
  const state={wallet:null,products:[],token:""};
  let currentModal=null;

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

  function toast(msg,type){
    // legacy: toast area removed from UI
    void msg;
    void type;
  }

  function closeModal(){
    if(currentModal){
      currentModal.remove();
      currentModal=null;
    }
  }

  function showModal({title,message,variant,actions,includeReason}={}){
    closeModal();

    const overlay=document.createElement('div');
    overlay.className='s-modalOverlay';
    overlay.addEventListener('click',e=>{if(e.target===overlay) closeModal();});

    const modal=document.createElement('div');
    modal.className='s-modal'+(variant?(' '+variant):'');

    const head=document.createElement('div');
    head.className='s-modalHead';

    const t=document.createElement('div');
    t.className='s-modalTitle';
    t.textContent=String(title||'');

    const close=document.createElement('button');
    close.type='button';
    close.className='s-modalClose';
    close.textContent='Fermer';
    close.addEventListener('click',closeModal);

    head.appendChild(t);
    head.appendChild(close);

    const body=document.createElement('div');
    body.className='s-modalBody';

    const msg=document.createElement('div');
    msg.className='s-modalMsg';
    msg.textContent=String(message||'');
    body.appendChild(msg);

    let reasonEl=null;
    if(includeReason){
      const note=document.createElement('div');
      note.className='s-modalNote';
      note.innerHTML='<div class="l">Raison du refus</div>';
      reasonEl=document.createElement('textarea');
      reasonEl.placeholder='Expliquez la raison…';
      note.appendChild(reasonEl);
      body.appendChild(note);
    }

    const act=document.createElement('div');
    act.className='s-modalActions';

    (actions||[]).forEach(a=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='s-modalBtn '+(a.kind||'neutral');
      b.textContent=String(a.label||'OK');
      b.addEventListener('click',()=>a.onClick && a.onClick({close:closeModal,reason:reasonEl?String(reasonEl.value||'').trim():''}));
      act.appendChild(b);
    });

    body.appendChild(act);
    modal.appendChild(head);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    currentModal=overlay;
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

  function setWallet(w){
    state.wallet=w;
    const balEl=$("#walletBalance");
    if(balEl){
      const v=w?String(w.balance||"0.00")+"€":"0.00€";
      balEl.textContent=v;
    }
    const banner=$("#balanceBanner");
    if(banner){
      banner.style.display=w?'flex':'none';
    }
  }

  function resetForm(){
    state.token="";
    setWallet(null);
    const tokenInput=$("#token");
    if(tokenInput){
      tokenInput.value="";
      tokenInput.focus();
    }
    renderProducts();
  }

  function renderProducts(){
    const box=$("#products");
    box.innerHTML="";
    (state.products||[]).forEach(p=>{
      const row=document.createElement('div');
      row.className='s-prodRow';

      const left=document.createElement('div');
      const name=document.createElement('div');
      name.className='s-prodName';
      name.textContent=String(p.name);
      const price=document.createElement('div');
      price.className='s-prodPrice';
      price.textContent=String(p.price)+"€";
      left.appendChild(name);
      left.appendChild(price);

      const right=document.createElement('div');
      right.className='s-prodRight';

      const qty=document.createElement('input');
      qty.type='number';
      qty.min='1';
      qty.step='1';
      qty.value='1';
      qty.className='s-prodQty';
      qty.setAttribute('aria-label','Quantité');

      const buy=document.createElement('button');
      buy.type='button';
      buy.className='s-buy';
      buy.textContent='Acheter';
      buy.addEventListener('click',()=>buyProduct(p, qty));

      right.appendChild(qty);
      right.appendChild(buy);

      row.appendChild(left);
      row.appendChild(right);
      box.appendChild(row);
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

  function qtyFromEl(el){
    const raw=el?String(el.value||"").trim():"1";
    const n=Math.floor(Number(raw));
    if(!Number.isFinite(n) || n<1){
      throw new Error("invalid_qty");
    }
    return n;
  }

  function buyProduct(p, qtyEl){
    try{
      if(!state.token){
        showModal({title:'Wallet manquant',message:'Scannez ou collez le token du client puis cliquez Charger.',variant:'error',actions:[{label:'OK',kind:'neutral',onClick:({close})=>close()}]});
        return;
      }
      const qty=qtyFromEl(qtyEl);
      const unit=Number(String(p.price).replace(",","."));
      const amount=Math.round(unit*qty*100)/100;

      showModal({
        title:'Confirmer le paiement',
        message:'Produit : '+String(p.name)+' — '+String(p.price)+'€\nQuantité : '+String(qty)+'\nTotal : '+String(amount.toFixed(2))+'€',
        actions:[
          {label:'Refuser',kind:'danger',onClick:({close})=>{close();showModal({title:'Paiement refusé',message:'Indiquez la raison du refus.',variant:'error',includeReason:true,actions:[
            {label:'Annuler',kind:'neutral',onClick:({close:cl})=>cl()},
            {label:'Confirmer le refus',kind:'danger',onClick:({close:cl,reason})=>{
              cl();
              const r=reason||'refusé';
              showModal({title:'Refus enregistré',message:r,variant:'error',actions:[{label:'OK',kind:'neutral',onClick:({close:c})=>c()}]});
            }}
          ]});}},
          {label:'Valider',kind:'primary',onClick:async ({close})=>{
            try{
              const data=await api.walletDebit(state.token,amount,String(p.name),standName);
              setWallet({...(state.wallet||{}),balance:data.balance,is_active:1});
              close();
              showModal({title:'Paiement validé',message:'Nouveau solde : '+String(data.balance)+'€',variant:'success',actions:[{label:'OK',kind:'neutral',onClick:({close:c})=>c()}]});
              const audio=$("#beep");
              if(audio&&typeof audio.play==="function"){
                audio.currentTime=0;
                audio.play().catch(()=>{});
              }
              resetForm();
            }catch(e){
              close();
              showModal({title:'Paiement refusé',message:String(e.message||'Erreur'),variant:'error',actions:[{label:'OK',kind:'neutral',onClick:({close:c})=>c()}]});
            }
          }},
        ]
      });
    } catch(e) {
      showModal({title:'Erreur',message:String(e.message||e),variant:'error',actions:[{label:'OK',kind:'neutral',onClick:({close})=>close()}]});
    }
  }

  function init(){
    $("#standName").textContent=standName;

    const scanBtn=$("#scan");
    if(scanBtn){
      scanBtn.addEventListener('click',async ()=>{
        try{
          const token=await scanQr();
          $("#token").value=token;
          lookupToken().catch(e=>showModal({title:'Erreur',message:String(e.message||e),variant:'error',actions:[{label:'OK',kind:'neutral',onClick:({close})=>close()}]}));
        }catch(e){
          showModal({title:'Scanner indisponible',message:String(e.message||e),variant:'error',actions:[{label:'OK',kind:'neutral',onClick:({close})=>close()}]});
        }
      });
    }

    $("#lookup").addEventListener("click",()=>lookupToken().catch(e=>toast(e.message,"err")));
    $("#token").addEventListener("keydown",e=>{if(e.key==="Enter"){lookupToken().catch(er=>toast(er.message,"err"));}});
    const close=$("#balanceClose");
    if(close){
      close.addEventListener('click',()=>setWallet(null));
    }
    loadProducts().catch(e=>toast(e.message,"err"));
    toast("Prêt.");
  }

  window.addEventListener("DOMContentLoaded",init);
})();
