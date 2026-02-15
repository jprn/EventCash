(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;
  const standName=String(window.EVENCASH_STAND_NAME||"");
  const state={wallet:null,products:[],selected:null,token:""};
  let currentModal=null;

  function toast(msg,type){
    const el=$("#toast");
    el.className="toast "+(type||"");
    el.textContent=msg;
    el.style.display="block";
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
    const amount=Number(String(state.selected.price).replace(",","."));
    showModal({
      title:'Confirmer le paiement',
      message:'Produit : '+state.selected.name+' — '+String(state.selected.price)+'€',
      actions:[
        {label:'Refuser',kind:'danger',onClick:({close})=>{close();showModal({title:'Paiement refusé',message:'Indiquez la raison du refus.',variant:'error',includeReason:true,actions:[
          {label:'Annuler',kind:'neutral',onClick:({close:cl})=>cl()},
          {label:'Confirmer le refus',kind:'danger',onClick:({close:cl,reason})=>{
            cl();
            const r=reason||'refusé';
            toast('Refus: '+r,'err');
            showModal({title:'Refus enregistré',message:r,variant:'error',actions:[{label:'OK',kind:'neutral',onClick:({close:c})=>c()}]});
          }}
        ]});}},
        {label:'Valider',kind:'primary',onClick:async ({close})=>{
          try{
            toast('Débit…');
            const data=await api.walletDebit(state.token,amount,state.selected.name,standName);
            $("#walletBalance").textContent=String(data.balance);
            toast('Paiement OK.','ok');
            close();
            showModal({title:'Paiement validé',message:'Nouveau solde : '+String(data.balance)+'€',variant:'success',actions:[{label:'OK',kind:'neutral',onClick:({close:c})=>c()}]});
            const audio=$("#beep");
            if(audio&&typeof audio.play==="function"){
              audio.currentTime=0;
              audio.play().catch(()=>{});
            }
          }catch(e){
            close();
            toast(e.message,'err');
            showModal({title:'Paiement refusé',message:String(e.message||'Erreur'),variant:'error',actions:[{label:'OK',kind:'neutral',onClick:({close:c})=>c()}]});
          }
        }},
      ]
    });
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
