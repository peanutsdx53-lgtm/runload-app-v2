/* A/B progress inspection for a saved GPS course.
 * The computation is an arithmetic projection onto retained route points;
 * it is NOT a speed/gradient/biomechanics model.
 */
import {projectToRoute} from './gpxImport.js';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function gpsCourseEvidence(feature,aKm,bKm){
 if(feature?.kind!=='gps'||!Array.isArray(feature.segments)||feature.segments.length===0||
    !finite(feature.distanceKm)||feature.distanceKm<=0)return null;
 const pts=feature.segments.flat();
 if(pts.length<2)return null;
 const altitudePoints=pts.filter(p=>finite(p.ele)).length;
 const checkpoint=km=>{
  if(!finite(km)||km<0)return null;
  const loc=projectToRoute(feature,km);
  if(!loc)return null;
  const beyond=km>feature.distanceKm;
  const elevationM=!beyond&&finite(loc.ele)?Math.round(loc.ele):null;
  const exact=pts.some(p=>Math.abs(p.km-km)<1e-7&&finite(p.ele));
  return {distanceKm:km,beyond,elevationM,elevationMethod:elevationM===null?'unavailable':exact?'sample':'interpolated'};
 };
 return {sampledPoints:pts.length,altitudePoints,
  altitudeCoveragePct:Math.round(100*altitudePoints/pts.length),
  gapCount:Math.max(0,feature.segments.length-1),
  simplified:feature.simplified===true,
  a:checkpoint(aKm),b:checkpoint(bKm)};
}
