(function(){
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

  window.ensureQRCodeLib=async function ensureQRCodeLib(){
    if(window.QRCode && typeof window.QRCode.toCanvas === 'function') return true;

    const sources=[
      'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
      'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
    ];

    for(const src of sources){
      try{
        await loadScript(src);
        if(window.QRCode && typeof window.QRCode.toCanvas === 'function') return true;
      }catch(_e){
        // continue
      }
    }
    return false;
  };
})();
