(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;
  let lastToken="";

  async function scanQr(){
    if(!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia){
      throw new Error('camera_unavailable');
    }
    if(typeof window.BarcodeDetector !== 'function'){
      throw new Error('barcode_detector_unavailable');
    }
    const detector=new window.BarcodeDetector({formats:['qr_code']});

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
            const codes=await detector.detect(video);
            if(codes && codes[0] && codes[0].rawValue){
              const val=String(codes[0].rawValue||'').trim();
              cleanup();
              resolve(val);
              return;
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

  async function lookup(){
    const token=String($("#token").value||"").trim();
    if(!token){throw new Error("missing_token");}
    toast("Chargement…");
    const data=await api.walletByToken(token);
    const w=data.wallet;
    lastToken=String(w.qr_token||token);
    $("#balance").textContent=String(w.balance)+"€";
    $("#active").textContent=String(w.is_active)==="1"?"actif":"inactif";
    $("#walletId").textContent=String(w.id);
    await renderPayQr(lastToken);
    toast("OK.","ok");
  }

  async function renderPayQr(token){
    const block=$("#payQrBlock");
    const el=$("#clientPayQr");
    if(!block || !el){return;}
    if(!token){block.style.display='none';return;}
    block.style.display='block';
    el.innerHTML='';
    try{
      if(typeof window.ensureQRCodeLib === 'function'){
        await window.ensureQRCodeLib();
      }
      if(window.QRCode && typeof window.QRCode.toCanvas === 'function'){
        const canvas=document.createElement('canvas');
        el.appendChild(canvas);
        await window.QRCode.toCanvas(canvas,String(token),{width:260,margin:1});
        return;
      }
    }catch(_e){
      // fallback
    }
    const img=document.createElement('img');
    img.alt='QR';
    img.width=260;
    img.height=260;
    img.loading='lazy';
    img.referrerPolicy='no-referrer';
    img.src='https://api.qrserver.com/v1/create-qr-code/?size=260x260&data='+encodeURIComponent(String(token));
    el.appendChild(img);
  }

  async function downloadPayQr(){
    const el=$("#clientPayQr");
    if(!el){return;}
    const canvas=el.querySelector('canvas');
    if(canvas && canvas.toDataURL){
      const a=document.createElement('a');
      a.href=canvas.toDataURL('image/png');
      a.download='wallet_qr.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    const img=el.querySelector('img');
    if(img && img.src){
      window.open(img.src,'_blank');
      return;
    }
    toast("Téléchargement indisponible.","err");
  }

  function init(){
    const scanBtn=$("#scan");
    if(scanBtn){
      scanBtn.addEventListener('click',async ()=>{
        try{
          const token=await scanQr();
          $("#token").value=token;
          lookup().catch(e=>toast(e.message,'err'));
        }catch(e){
          toast(e.message,'err');
        }
      });
    }
    $("#lookup").addEventListener("click",()=>lookup().catch(e=>toast(e.message,"err")));
    $("#token").addEventListener("keydown",e=>{if(e.key==="Enter"){lookup().catch(er=>toast(er.message,"err"));}});
    const dl=$("#downloadPayQr");
    if(dl){
      dl.addEventListener('click',()=>downloadPayQr().catch(e=>toast(e.message,"err")));
    }

    const params=new URLSearchParams(window.location.search);
    const preset=params.get('token');
    if(preset){
      $("#token").value=preset;
      lookup().catch(e=>toast(e.message,"err"));
    }
    toast("Prêt.");
  }

  window.addEventListener("DOMContentLoaded",init);
})();
