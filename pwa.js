// Progressive enhancement. On iOS, Safari's Share → Add to Home Screen is required.
let deferredInstall=null;
const isInstalled=()=>window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
const safari=()=>/Safari/.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
function showInstall(){
 const old=document.getElementById("install-guide");if(old)old.remove();
 const div=document.createElement("div");div.id="install-guide";
 const instructions=isInstalled()?"この端末では、すでにアプリとして起動しています。":ios()?(safari()?"Safariの共有メニューから「ホーム画面に追加」→「追加」を選んでください。":"Safariでこのサイトを開き、共有メニューから「ホーム画面に追加」を選んでください。"):deferredInstall?"「インストールする」を押すと、ブラウザがインストール確認を表示します。":"ブラウザのメニューで「アプリをインストール」または「ホーム画面に追加」を選んでください。";
 div.innerHTML='<div class="install-backdrop"><div class="install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-title" tabindex="-1"><div class="install-logo">↗</div><h2 id="install-title">RunLoadをインストール</h2><p>'+instructions+'</p><p class="install-caption">これは画面確認用の試作です。GPS測定、科学計算、正式な記録保存はまだ利用できません。</p><div class="install-actions">'+(deferredInstall&&!ios()&&!isInstalled()?'<button class="btn primary" data-install-confirm>インストールする</button>':'')+'<button class="btn" data-install-dismiss>閉じる</button></div></div></div>';
 document.body.appendChild(div);
 const dismiss=()=>{div.remove();document.removeEventListener("keydown",onKey)};
 const onKey=e=>{if(e.key==="Escape")dismiss();if(e.key==="Tab"){const controls=[...div.querySelectorAll("button")];if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};
 document.addEventListener("keydown",onKey);
 div.addEventListener("click",async e=>{if(e.target.matches(".install-backdrop")||e.target.closest("[data-install-dismiss]")){dismiss();return}if(e.target.closest("[data-install-confirm]")&&deferredInstall){const prompt=deferredInstall;deferredInstall=null;try{await prompt.prompt();await prompt.userChoice}catch(e){console.warn("Install prompt:",e)}dismiss()}});
 div.querySelector("button")?.focus();
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e});
window.addEventListener("appinstalled",()=>{deferredInstall=null});
document.addEventListener("click",e=>{if(e.target.closest("[data-install-app]")){e.preventDefault();showInstall()}});
if("serviceWorker" in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(e=>console.warn("Offline cache:",e)));
