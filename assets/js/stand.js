(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;
  const standName=String(window.EVENCASH_STAND_NAME||"");
  const state={wallet:null,products:[],token:""};
  let currentModal=null;

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
