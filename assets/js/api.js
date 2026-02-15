window.EvenCashApi=(function(){
  function cfg(){
    const c=(window.EVENCASH_CONFIG||{});
    return {base:(c.API_BASE||"/api").replace(/\/$/,""),key:String(c.API_KEY||"")};
  }
  async function request(path,{method="GET",body=null,query=null}={}){
    const {base,key}=cfg();
    const url=new URL(base+"/"+path.replace(/^\//,""),window.location.origin);
    if(query&&typeof query==="object"){
      Object.keys(query).forEach(k=>{if(query[k]!==undefined&&query[k]!==null)url.searchParams.set(k,String(query[k]));});
    }

    if(key){
      url.searchParams.set('key', key);
    }

    const headers={"X-EVENCASH-KEY":key};
    if(key){
      headers["Authorization"]="Bearer "+key;
    }
    let payload=null;
    if(body!==null){
      headers["Content-Type"]="application/json";
      payload=JSON.stringify(body);
    }
    const res=await fetch(url.toString(),{method,headers,body:payload});
    const ct=res.headers.get("content-type")||"";
    if(ct.includes("application/json")){
      const data=await res.json();
      if(!res.ok){
        const err=new Error(data&&data.error?data.error:("http_"+res.status));
        err.data=data;
        err.status=res.status;
        throw err;
      }
      return data;
    }

    const text=await res.text();
    if(!res.ok){
      const snippet=String(text||"").trim().slice(0,200);
      const msg=snippet?(`http_${res.status}: `+snippet):("http_"+res.status);
      const err=new Error(msg);
      err.status=res.status;
      err.data={raw:snippet};
      throw err;
    }
    return text;
  }
  return {
    walletCreate:()=>request("wallet_create.php",{method:"POST",body:{}}),
    walletByToken:(token)=>request("wallet_by_token.php",{query:{token}}),
    walletCredit:(wallet_id,amount)=>request("wallet_credit.php",{method:"POST",body:{wallet_id,amount}}),
    walletDebit:(qr_token,amount,product_name,stand_name)=>request("wallet_debit.php",{method:"POST",body:{qr_token,amount,product_name,stand_name}}),
    productsList:(stand)=>request("products_list.php",{query:{stand}}),
    metrics:()=>request("metrics.php"),
    listWallets:(q)=>request("admin_wallets_list.php",{query:{q}}),
    deactivateWallet:(wallet_id)=>request("admin_wallet_deactivate.php",{method:"POST",body:{wallet_id}}),
    exportCsvUrl:()=>{
      const {base}=cfg();
      const u=new URL(base+"/export_csv.php",window.location.origin);
      return u.toString();
    },
  };
})();
