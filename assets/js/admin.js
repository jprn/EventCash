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
    toast("OK.","ok");
  }

  function init(){
    $("#refresh").addEventListener("click",()=>refresh().catch(e=>toast(e.message,"err")));
    refresh().catch(e=>toast(e.message,"err"));
  }

  window.addEventListener("DOMContentLoaded",init);
})();
