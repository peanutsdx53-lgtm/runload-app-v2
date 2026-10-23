import test from "node:test";
import assert from "node:assert/strict";
import {
 HOME_DASHBOARD_KEY,HOME_DASHBOARD_WIDGETS,defaultHomeDashboardLayout,
 isValidHomeDashboardLayout,copyHomeDashboardLayout,loadHomeDashboardLayout,
 saveHomeDashboardLayout,editHomeDashboardLayout,moveHomeDashboardWidget
} from "../ui/homeDashboardLayout.js";
function mockStore(seed={}){
 const map=new Map(Object.entries(seed));
 return {getItem(key){return map.has(key)?map.get(key):null},setItem(key,value){map.set(key,String(value))},removeItem(key){map.delete(key)},raw:key=>map.get(key),keys:()=>[...map.keys()]};
}
test("six independent widgets and default desktop split",()=>{
 const d=defaultHomeDashboardLayout();
 assert.equal(HOME_DASHBOARD_WIDGETS.length,6);
 assert.equal(d.order.length,6);
 assert.ok(d.visible.includes("condition"));
 assert.equal(d.sizes.topics,"full");
 assert.equal(d.sizes.condition,"half");
 assert.ok(isValidHomeDashboardLayout(d));
});
test("reorder and size preserve unchanged input",()=>{
 const initial=defaultHomeDashboardLayout();
 const swapped=editHomeDashboardLayout(initial,"down","condition");
 assert.deepEqual(swapped.order.slice(0,2),["latest","condition"]);
 assert.equal(initial.order[0],"condition");
 const full=editHomeDashboardLayout(swapped,"size","condition");
 assert.equal(full.sizes.condition,"full");
 assert.equal(swapped.sizes.condition,"half");
});
test("hide and restore, preserve minimum one visible",()=>{
 let d=defaultHomeDashboardLayout();
 for(const widget of HOME_DASHBOARD_WIDGETS.slice(0,-1))d=editHomeDashboardLayout(d,"toggle",widget.id);
 const before=JSON.stringify(d);
 d=editHomeDashboardLayout(d,"toggle",HOME_DASHBOARD_WIDGETS.at(-1).id);
 assert.equal(JSON.stringify(d),before,"never allow an empty dashboard");
 d=editHomeDashboardLayout(d,"toggle","condition");
 assert.ok(d.visible.includes("condition"));
});
test("valid layout can be saved, reloaded and restored with isolated key",()=>{
 const storage=mockStore({"running-record-mobile-home-widgets-v1":"an authoritative legacy payload"});
 const changed=editHomeDashboardLayout(editHomeDashboardLayout(defaultHomeDashboardLayout(),"down","condition"),"toggle","topics");
 assert.equal(saveHomeDashboardLayout(storage,changed).ok,true);
 const loaded=loadHomeDashboardLayout(storage);
 assert.deepEqual(loaded.layout,changed);
 assert.equal(loaded.canSave,true);
 assert.deepEqual(storage.keys().sort(),[HOME_DASHBOARD_KEY,"running-record-mobile-home-widgets-v1"].sort());
 assert.equal(storage.getItem("running-record-mobile-home-widgets-v1"),"an authoritative legacy payload");
});
test("malformed or inaccessible storage is fail-closed",()=>{
 for(const raw of ["{not json}","null","[]",JSON.stringify({version:1,order:[],visible:[],sizes:{}})]){
  const storage=mockStore({[HOME_DASHBOARD_KEY]:raw});
  const loaded=loadHomeDashboardLayout(storage);
  assert.equal(loaded.canSave,false);
  assert.equal(saveHomeDashboardLayout(storage,defaultHomeDashboardLayout()).ok,false);
  assert.equal(storage.raw(HOME_DASHBOARD_KEY),raw,"original corrupt bytes stay unchanged");
 }
 const denied={getItem(){throw Error("denied")},setItem(){throw Error("denied")}};
 assert.equal(loadHomeDashboardLayout(denied).canSave,false);
 assert.equal(saveHomeDashboardLayout(denied,defaultHomeDashboardLayout()).ok,false);
});
test("invalid IDs, duplicates, sizes and versions do not mutate storage",()=>{
 const storage=mockStore();
 const cases=[
  {version:2,order:[],visible:[],sizes:{}},
  {...defaultHomeDashboardLayout(),order:["condition","condition","topics","shortcuts","trend","discovery"]},
  {...defaultHomeDashboardLayout(),visible:["nonexistent"]},
  {...defaultHomeDashboardLayout(),sizes:{...defaultHomeDashboardLayout().sizes,condition:"giant"}}
 ];
 for(const entry of cases){assert.equal(isValidHomeDashboardLayout(entry),false);assert.equal(saveHomeDashboardLayout(storage,entry).ok,false)}
 assert.equal(storage.getItem(HOME_DASHBOARD_KEY),null);
});

test("drag reorder inserts strictly before or after a target",()=>{
 const original=defaultHomeDashboardLayout();
 const below=moveHomeDashboardWidget(original,"condition","latest",true);
 assert.deepEqual(below.order.slice(0,2),["latest","condition"]);
 const above=moveHomeDashboardWidget(original,"discovery","condition",false);
 assert.equal(above.order[0],"discovery");
 assert.deepEqual(original.order,defaultHomeDashboardLayout().order,"reorder leaves original unchanged");
 assert.equal(moveHomeDashboardWidget(original,"condition","condition"),original,"self-drop is a no-op");
 assert.equal(moveHomeDashboardWidget(original,"condition","invalid-id"),original,"invalid target is ignored");
 assert.ok(isValidHomeDashboardLayout(below));
});
