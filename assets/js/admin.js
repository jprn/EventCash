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
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='a-action danger';
      btn.textContent='Désactiver';
      btn.disabled=!active;
      btn.addEventListener('click',async ()=>{
        // Prevent row click preview
        if (window.event && typeof window.event.stopPropagation === 'function') {
          window.event.stopPropagation();
        }
        try{
          btn.disabled=true;
          await api.deactivateWallet(String(w.id));
          await refresh();
          toast('Wallet désactivé.','ok');
        }catch(e){
          btn.disabled=false;
          toast(e.message,'err');
        }
      });
      tdAction.appendChild(btn);

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
