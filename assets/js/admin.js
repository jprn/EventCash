(function(){
  const $=s=>document.querySelector(s);
  const api=window.EvenCashApi;

  function toast(msg,type){
    const el=$("#toast");
    el.className="toast "+(type||"");
    el.textContent=msg;
    el.style.display="block";
  }

  function euro(v){
    const n=Number(String(v).replace(",","."));
    if(!Number.isFinite(n)) return String(v);
    return n.toFixed(2)+"€";
  }

  function fmtDate(s){
    try{
      if(!s) return "";
      const d=new Date(String(s).replace(" ","T"));
      if(Number.isNaN(d.getTime())) return String(s);
      return d.toLocaleString("fr-FR");
    }catch(_e){
      return String(s||"");
    }
  }

  function renderWallets(wallets){
    const tbody=$("#walletsTbody");
    if(!tbody){return;}
    tbody.innerHTML="";

    (wallets||[]).forEach(w=>{
      const tr=document.createElement('tr');
      tr.style.cursor='pointer';

      const tdToken=document.createElement('td');
      const token=String(w.qr_token||"");
      tdToken.innerHTML='<div class="a-token" title="'+token.replace(/"/g,'&quot;')+'">'+token+'</div>';

      const tdBal=document.createElement('td');
      tdBal.style.fontWeight='1000';
      tdBal.textContent=euro(w.balance);

      const tdCreated=document.createElement('td');
      tdCreated.textContent=fmtDate(w.created_at);

      const tdStatus=document.createElement('td');
      const active=(String(w.is_active)==="1" || w.is_active===1);
      tdStatus.innerHTML=active
        ? '<span class="a-badge ok">Actif</span>'
        : '<span class="a-badge off">Inactif</span>';

      const tdAction=document.createElement('td');
      const actions=document.createElement('div');
      actions.className='a-actions';

      const btnOff=document.createElement('button');
      btnOff.type='button';
      btnOff.className='a-iconBtn off';
      btnOff.title='Désactiver';
      btnOff.disabled=!active;
      btnOff.innerHTML='<svg viewBox="0 0 24 24"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
      btnOff.addEventListener('click',async (ev)=>{
        ev.stopPropagation();
        try{
          btnOff.disabled=true;
          await api.deactivateWallet(String(w.id));
          await refresh();
          toast('Wallet désactivé.','ok');
        }catch(e){
          btnOff.disabled=false;
          toast(e.message,'err');
        }
      });

      const btnOn=document.createElement('button');
      btnOn.type='button';
      btnOn.className='a-iconBtn on';
      btnOn.title='Réactiver';
      btnOn.disabled=active;
      btnOn.innerHTML='<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';
      btnOn.addEventListener('click',async (ev)=>{
        ev.stopPropagation();
        try{
          btnOn.disabled=true;
          await api.activateWallet(String(w.id));
          await refresh();
          toast('Wallet réactivé.','ok');
        }catch(e){
          btnOn.disabled=false;
          toast(e.message,'err');
        }
      });

      const btnTrash=document.createElement('button');
      btnTrash.type='button';
      btnTrash.className='a-iconBtn trash';
      btnTrash.title='Supprimer (wallet inactif uniquement)';
      btnTrash.disabled=active;
      btnTrash.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 16h10l1-16"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
      btnTrash.addEventListener('click',async (ev)=>{
        ev.stopPropagation();
        if(!confirm('Supprimer ce wallet ? (possible uniquement si inactif et sans transactions)')){
          return;
        }
        try{
          btnTrash.disabled=true;
          await api.deleteWallet(String(w.id));
          await refresh();
          toast('Wallet supprimé.','ok');
        }catch(e){
          btnTrash.disabled=false;
          toast(e.message,'err');
        }
      });

      actions.appendChild(btnOff);
      actions.appendChild(btnOn);
      actions.appendChild(btnTrash);
      tdAction.appendChild(actions);

      tr.addEventListener('click',()=>showWalletPreview(w));

      tr.appendChild(tdToken);
      tr.appendChild(tdBal);
      tr.appendChild(tdCreated);
      tr.appendChild(tdStatus);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }

  function showWalletPreview(w){
    const panel=$("#walletPreview");
    if(!panel){return;}

    const token=String(w.qr_token||"");
    $("#walletPreviewToken").textContent=token;
    $("#walletPreviewBalance").textContent=euro(w.balance);
    const active=(String(w.is_active)==="1" || w.is_active===1);
    $("#walletPreviewStatus").innerHTML=active
      ? '<span class="a-badge ok">Actif</span>'
      : '<span class="a-badge off">Inactif</span>';

    const qr=$("#walletPreviewQr");
    if(qr){
      qr.innerHTML='';
      const img=document.createElement('img');
      img.alt='QR';
      img.loading='lazy';
      img.referrerPolicy='no-referrer';
      img.src='https://api.qrserver.com/v1/create-qr-code/?size=300x300&color=22-163-74&bgcolor=255-255-255&data='+encodeURIComponent(token);
      qr.appendChild(img);
    }

    panel.style.display='block';
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function loadWallets(){
    const tbody=$("#walletsTbody");
    if(!tbody){return;}
    const search=$("#walletSearch");
    const q=search?String(search.value||"").trim():"";
    const data=await api.listWallets(q||undefined);
    renderWallets(data.wallets||[]);
  }

  async function refresh(){
    toast("Chargement…");
    const data=await api.metrics();
    $("#totalCa").textContent=euro(data.total_ca);
    $("#totalTx").textContent=String(data.total_transactions);
    $("#sumBalances").textContent=euro(data.sum_active_balances);

    const walletsActiveEl=$("#walletsActive");
    if(walletsActiveEl){
      walletsActiveEl.textContent=String(data.wallets_active ?? "—");
    }

    const list=$("#byStand");
    list.innerHTML="";
    (data.ca_by_stand||[]).forEach(r=>{
      const row=document.createElement("div");
      row.className="a-row";
      const left=document.createElement("div");
      left.className="name";
      left.textContent=String(r.stand_name);
      const right=document.createElement("div");
      right.className="value";
      right.textContent=euro(r.ca);
      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    });

    $("#exportCsv").setAttribute("href",api.exportCsvUrl());

    const hint=$("#exportHint");
    if(hint){
      hint.textContent=String(data.total_transactions)+" transactions disponibles";
    }

    await loadWallets();
    toast("OK.","ok");
  }

  function init(){
    $("#refresh").addEventListener("click",()=>refresh().catch(e=>toast(e.message,"err")));

    const close=$("#walletPreviewClose");
    if(close){
      close.addEventListener('click',()=>{
        const panel=$("#walletPreview");
        if(panel){panel.style.display='none';}
      });
    }

    const s=$("#walletSearch");
    if(s){
      let t=null;
      s.addEventListener('input',()=>{
        if(t) window.clearTimeout(t);
        t=window.setTimeout(()=>loadWallets().catch(e=>toast(e.message,'err')),250);
      });
    }

    refresh().catch(e=>toast(e.message,"err"));
  }

  window.addEventListener("DOMContentLoaded",init);
})();
