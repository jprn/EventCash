(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;
  let lastToken="";

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
    el.textContent=String(token);
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
    toast("Téléchargement indisponible.","err");
  }

  function init(){
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
