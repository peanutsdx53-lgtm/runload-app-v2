// RunLoad v2 visual dashboard drag adapter.
// Pointer gestures edit only the in-memory v2 layout; Save remains an explicit action.
// Touch: hold the dedicated handle, then move. Ordinary card scroll/taps are unaffected.
// Mouse/pen: start dragging the handle after moving 6px.
// No writes to old RunLoad localStorage keys or running data.
export function bindHomeDashboardDrag(root,{onDrop}={}){
 if(!root||typeof onDrop!=="function")return ()=>{};
 const win=root.ownerDocument.defaultView;
 let active=null;
 const HOLD_MS=320,TOUCH_SLOP=13,MOUSE_START=6;
 const clearHover=()=>{
  root.querySelectorAll(".dashboard-widget--drag-source,.dashboard-widget--drop-before,.dashboard-widget--drop-after").forEach(node=>node.classList.remove("dashboard-widget--drag-source","dashboard-widget--drop-before","dashboard-widget--drop-after"));
 };
 const stop=()=>{
  if(!active)return;
  if(active.timer!==null)win.clearTimeout(active.timer);
  active.ghost?.remove();
  active=null;
  root.classList.remove("dashboard-custom-grid--dragging");
  clearHover();
 };
 function begin(){
  if(!active||active.dragging)return;
  active.armed=true;
  active.dragging=true;
  const card=active.source;
  card.classList.add("dashboard-widget--drag-source");
  root.classList.add("dashboard-custom-grid--dragging");
  const ghost=root.ownerDocument.createElement("div");
  ghost.className="dashboard-drag-ghost";
  ghost.setAttribute("aria-hidden","true");
  ghost.textContent=card.querySelector(".widget-edit-label")?.textContent||"移動中";
  root.ownerDocument.body.appendChild(ghost);
  active.ghost=ghost;
  positionGhost(active.x,active.y);
 }
 const positionGhost=(x,y)=>{
  if(!active?.ghost)return;
  active.ghost.style.left=Math.max(6,Math.min(win.innerWidth-175,x+11))+"px";
  active.ghost.style.top=Math.max(6,Math.min(win.innerHeight-46,y-13))+"px";
 };
 function updateTarget(x,y){
  if(!active?.dragging)return;
  const el=root.ownerDocument.elementFromPoint(x,y)?.closest?.("[data-home-dashboard-id]");
  const id=el?.dataset.homeDashboardId||"";
  const valid=Boolean(el&&root.contains(el)&&id!==active.sourceId);
  clearHover();
  active.source.classList.add("dashboard-widget--drag-source");
  if(!valid){active.targetId=null;return}
  const rect=el.getBoundingClientRect();
  const after=y>=rect.top+rect.height/2;
  el.classList.add(after?"dashboard-widget--drop-after":"dashboard-widget--drop-before");
  active.targetId=id;
  active.after=after;
 }
 function onDown(e){
  if(active||e.button!==0||e.isPrimary===false)return;
  const handle=e.target.closest?.("[data-home-drag-handle]");
  if(!handle||!root.contains(handle)||handle.disabled)return;
  const source=handle.closest("[data-home-dashboard-id]");
  if(!source)return;
  const touch=e.pointerType==="touch";
  active={pointerId:e.pointerId,pointerType:e.pointerType,x:e.clientX,y:e.clientY,
   startX:e.clientX,startY:e.clientY,source,sourceId:source.dataset.homeDashboardId,
   armed:!touch,dragging:false,targetId:null,after:false,timer:null,ghost:null};
  if(touch)active.timer=win.setTimeout(()=>{
   if(active?.pointerId!==e.pointerId)return;
   active.timer=null;active.armed=true;
   handle.classList.add("is-long-pressed");
  },HOLD_MS);
 }
 function onMove(e){
  const g=active;
  if(!g||e.pointerId!==g.pointerId)return;
  const dist=Math.hypot(e.clientX-g.startX,e.clientY-g.startY);
  g.x=e.clientX;g.y=e.clientY;
  if(!g.dragging){
   if(g.pointerType==="touch"&&!g.armed){
    if(dist>TOUCH_SLOP)stop(); // Scroll/accidental swipe: no edit.
    return;
   }
   if(dist<(g.pointerType==="touch"?4:MOUSE_START))return;
   begin();
  }
  if(!active?.dragging)return;
  e.preventDefault();
  positionGhost(e.clientX,e.clientY);
  // Auto-scroll in deliberate drags only; never on an ordinary tap.
  if(e.clientY<67)win.scrollBy(0,-14);
  else if(e.clientY>win.innerHeight-98)win.scrollBy(0,14);
  updateTarget(e.clientX,e.clientY);
 }
 function onUp(e){
  if(!active||e.pointerId!==active.pointerId)return;
  const {dragging,sourceId,targetId,after}=active;
  stop();
  root.querySelectorAll(".is-long-pressed").forEach(el=>el.classList.remove("is-long-pressed"));
  if(dragging&&targetId)onDrop({sourceId,targetId,after});
 }
 function cancel(){
  stop();
  root.querySelectorAll(".is-long-pressed").forEach(el=>el.classList.remove("is-long-pressed"));
 }
 function onKey(e){if(e.key==="Escape"&&active)cancel()}
 root.addEventListener("pointerdown",onDown);
 win.addEventListener("pointermove",onMove,{passive:false});
 win.addEventListener("pointerup",onUp);
 win.addEventListener("pointercancel",cancel);
 win.addEventListener("blur",cancel);
 win.addEventListener("keydown",onKey);
 return ()=>{
  cancel();
  root.removeEventListener("pointerdown",onDown);
  win.removeEventListener("pointermove",onMove);
  win.removeEventListener("pointerup",onUp);
  win.removeEventListener("pointercancel",cancel);
  win.removeEventListener("blur",cancel);
  win.removeEventListener("keydown",onKey);
 };
}
