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

    const tbody=$("#byStand");
    tbody.innerHTML="";
    (data.ca_by_stand||[]).forEach(r=>{
      const tr=document.createElement("tr");
      const td1=document.createElement("td");
      const td2=document.createElement("td");
      td1.textContent=String(r.stand_name);
      td2.textContent=euro(r.ca);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tbody.appendChild(tr);
    });

    $("#exportCsv").setAttribute("href",api.exportCsvUrl());
    toast("OK.","ok");
  }

  function init(){
    $("#refresh").addEventListener("click",()=>refresh().catch(e=>toast(e.message,"err")));
    refresh().catch(e=>toast(e.message,"err"));
  }

  window.addEventListener("DOMContentLoaded",init);
})();
