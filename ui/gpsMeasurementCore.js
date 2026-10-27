/* GPS factual measurement, separately versioned from the scientific engine.
 * Key filters are ported from legacy runMeasurementCore.js, with immutable copies
 * of geolocation values, explicit gap boundaries, and no browser globals at import.
 */
// Altitude thresholds are conservative display gates, NOT a certified elevation accuracy.
export const GPS_LIMITS=Object.freeze({accuracyM:50,maxSpeedMps:15,minMoveM:2,minFinishM:10,maxTrack:2000,altitudeAccuracyM:20,maxVerticalSpeedMps:3,maxElevationGrade:0.6,maxContinuousGapMs:30000});
export const GPS_ALTITUDE_QUALITY=Object.freeze(['usable','missing','unknown-accuracy','low-accuracy','spike']);
export const GPS_ACTIVITY=Object.freeze({WALK:'ウォーキング',JOGGING:'ジョギング',RUNNING:'ランニング',MIXED:'走る＋歩く'});
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const range=(v,min,max)=>finite(v)&&v>=min&&v<=max;
const rad=v=>v*Math.PI/180;
export function gpsDistanceMeters(a,b){
 if(!a||!b||![a.lat,b.lat].every(x=>range(x,-90,90))||![a.lon,b.lon].every(x=>range(x,-180,180)))return NaN;
 const x=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;
 return 12742017.6*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));
}
export function snapshotPosition(source){
 try{
  const c=source?.coords,t=Number(source?.timestamp),lat=c?.latitude,lon=c?.longitude,accuracy=c?.accuracy;
  if(!range(lat,-90,90)||!range(lon,-180,180)||!range(accuracy,0,1e6)||!range(t,1,9e15))return null;
  // Optional GPS altitude accessors may throw on permission changes; do not
  // discard otherwise valid horizontal coordinates.
  let ele=null,altitudeAccuracy=null;
  try{const v=c?.altitude;if(range(v,-12000,9000))ele=v;}catch{}
  try{const v=c?.altitudeAccuracy;if(range(v,0,1e6))altitudeAccuracy=v;}catch{}
  return {lat,lon,accuracyM:accuracy,t,ele,altitudeAccuracy};
 }catch{return null;}
}
export function checkGpsPoint(previous,point,{gap=false}={}){
 if(!point)return {ok:false,reason:'位置データが不正です'};
 if(point.accuracyM>GPS_LIMITS.accuracyM)return {ok:false,reason:'GPSの誤差が大きいため、この位置点を採用しません'};
 if(!previous||gap)return {ok:true,meters:0,gap:true};
 if(point.t<=previous.t)return {ok:false,reason:'位置情報の時刻が古いため採用しません'};
 // A suspended browser cannot know the path between widely separated fixes.
 // Keep the new fix as a new segment; never invent distance across that gap.
 if(point.t-previous.t>GPS_LIMITS.maxContinuousGapMs)return {ok:true,meters:0,gap:true,reason:'GPS受信が途切れた区間の距離は加算していません'};
 const meters=gpsDistanceMeters(previous,point),speed=meters/((point.t-previous.t)/1000);
 if(!finite(meters))return {ok:false,reason:'位置データが不正です'};
 if(speed>GPS_LIMITS.maxSpeedMps)return {ok:false,reason:'不自然な速度の位置点を除外しました'};
 if(meters<GPS_LIMITS.minMoveM)return {ok:false,reason:'移動が小さいため距離には加算しません'};
 return {ok:true,meters,gap:false};
}
export function qualifyGpsAltitude(previous,point,{meters=0,gap=false}={}){
 if(!point)return null;
 if(point.ele===null)return {...point,ele:null,altitudeQuality:'missing'};
 if(point.altitudeAccuracy===null)return {...point,ele:null,altitudeQuality:'unknown-accuracy'};
 if(point.altitudeAccuracy>GPS_LIMITS.altitudeAccuracyM)return {...point,ele:null,altitudeQuality:'low-accuracy'};
 if(previous&&previous.ele!==null&&!gap){
  const seconds=(point.t-previous.t)/1000,climb=Math.abs(point.ele-previous.ele);
  // A large altitude discontinuity is suspicious even when the device reports
  // optimistic accuracy. Reject altitude only, never the accepted GPS position.
  if(seconds>0&&climb>10&&(climb/seconds>GPS_LIMITS.maxVerticalSpeedMps||meters>0&&climb/meters>GPS_LIMITS.maxElevationGrade))
   return {...point,ele:null,altitudeQuality:'spike'};
 }
 return {...point,altitudeQuality:'usable'};
}
export function gpsElapsedMs(s,now){
 if(!s.startedAt)return 0;
 const end=s.phase==='running'?now:(s.pausedAt||s.finishedAt||now);
 return Math.max(0,end-s.startedAt-(s.pausedMs||0));
}
export function formatGpsClock(ms){const secs=Math.floor(Math.max(0,ms)/1000);return `${String(Math.floor(secs/3600)).padStart(2,'0')}:${String(Math.floor(secs/60)%60).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;}
export function gpsPace(distanceM,elapsedMs){if(!(distanceM>=GPS_LIMITS.minFinishM&&elapsedMs>0))return '—';const seconds=Math.round(elapsedMs/1000/(distanceM/1000));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
export function createGpsSession({geo,now=()=>Date.now(),onChange=()=>{}}={}){
 const source=geo;let watchId=null,epoch=0;
 const s={phase:'ready',activity:'RUNNING',segmentActivity:'RUNNING',segments:[],distanceM:0,track:[],startedAt:0,pausedAt:0,pausedMs:0,finishedAt:0,accepted:0,rejected:0,positionError:'',lastPosition:null,saveRoute:false,notice:'',goalMode:'free',goalValue:'',goalReached:false,finalized:false};
 const changed=()=>onChange(s);
 const checkGoal=()=>{
  if(s.phase!=='running'||s.goalReached||s.goalMode==='free')return false;
  const v=Number(s.goalValue);
  if(!(v>0&&Number.isFinite(v)))return false;
  if((s.goalMode==='distance'&&s.distanceM>=v*1000)||(s.goalMode==='time'&&gpsElapsedMs(s,now())>=v*60000)){
   s.goalReached=true;s.notice='設定した目標に達しました。測定は自動では終了しません。';changed();return true;
  }
  return false;
 };
 const stopWatch=()=>{epoch++;const id=watchId;watchId=null;if(id!==null){try{source?.clearWatch?.(id);}catch{}}};
 const watch=()=>{
  const token=++epoch;
  let fn;try{fn=source?.watchPosition;}catch{fn=null;}
  if(typeof fn!=='function'){s.positionError='位置情報を利用できません';changed();return false;}
  try{watchId=fn.call(source,(raw)=>{
   if(token!==epoch||s.phase!=='running')return;
   const p=snapshotPosition(raw),check=checkGpsPoint(s.lastPosition,p,{gap:!s.lastPosition||s.nextGap});
   if(!check.ok){s.rejected++;s.positionError=check.reason;changed();return;}
   if(s.track.length>=GPS_LIMITS.maxTrack){s.positionError='軌跡が上限に達しました。測定距離は継続します。';}
   const prev=s.lastPosition,accepted=qualifyGpsAltitude(prev,p,check);
   s.distanceM+=check.meters;s.accepted++;
   s.lastPosition=accepted;s.nextGap=false;
   if(s.track.length<GPS_LIMITS.maxTrack)s.track.push({...accepted,km:s.distanceM/1000,breakBefore:check.gap,activity:s.segmentActivity});
   s.positionError=check.reason||'';checkGoal();changed();
  },(err)=>{
   if(token!==epoch||s.phase!=='running')return;
   let code;try{code=err?.code;}catch{code=0;}
   s.positionError=code===1?'位置情報が拒否されました。端末の設定を確認してください':code===2?'GPSを受信できません。屋外などで確認してください':code===3?'GPSの取得がタイムアウトしました':'GPSで位置情報を取得できません';changed();
  },{enableHighAccuracy:true,maximumAge:0,timeout:15000});
  }catch{s.positionError='GPSを開始できませんでした';changed();return false;}
  return true;
 };
 function start(){if(s.phase!=='ready')return false;if(s.goalMode!=='free'&&!(Number(s.goalValue)>0&&Number(s.goalValue)<=1000)){s.notice='時間または距離の目標を正しく入力してください';changed();return false;}s.startedAt=now();s.phase='running';s.notice='';if(!watch()){s.phase='ready';s.startedAt=0;return false;}changed();return true;}
 function pause(){if(s.phase!=='running')return false;s.pausedAt=now();s.phase='paused';stopWatch();changed();return true;}
 function resume(){if(s.phase!=='paused')return false;s.pausedMs+=Math.max(0,now()-s.pausedAt);s.pausedAt=0;s.phase='running';s.lastPosition=null;s.nextGap=true;if(!watch()){s.phase='paused';s.pausedAt=now();return false;}changed();return true;}
 function finish(){if(!['running','paused'].includes(s.phase))return false;const t=now();if(s.phase==='paused')s.pausedMs+=Math.max(0,t-s.pausedAt);s.finishedAt=t;s.phase='finished';stopWatch();changed();return true;}
 function discard(){stopWatch();s.phase='discarded';s.track=[];s.lastPosition=null;changed();return true;}
 function setGoalMode(value){if(s.phase!=='ready'||!['free','time','distance'].includes(value))return false;s.goalMode=value;s.goalValue='';changed();return true;}
 function setGoalValue(value){if(s.phase!=='ready')return false;s.goalValue=String(value).slice(0,16);return true;}
 function setActivity(value){if(s.phase!=='ready'||!GPS_ACTIVITY[value])return false;s.activity=value;s.segmentActivity=value==='MIXED'?'RUNNING':value;changed();return true;}
 function setSegment(value){if(s.activity!=='MIXED'||!['WALK','JOGGING','RUNNING'].includes(value)||s.phase!=='running')return false;if(s.segmentActivity===value)return true;s.segmentActivity=value;s.lastPosition=null;s.nextGap=true;changed();return true;}
 return {state:s,start,pause,resume,finish,discard,setActivity,setGoalMode,setGoalValue,setSegment,stopWatch,checkGoal,elapsed:()=>gpsElapsedMs(s,now()),getSnapshot:()=>({...s,track:s.track.map(p=>({...p})),elapsedMs:gpsElapsedMs(s,now())})};
}
