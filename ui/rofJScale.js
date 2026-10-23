// RunLoad ROF-J presentation, grounded in the original runload-app and
// ROF_J_AUTHOR_CONFIRMED_2026_10_01. Displays only integer selections 0..10.
// The five diagram URLs are the existing published/attributed assets from
// the same developer's runload-app repository, NOT AI-generated artwork.
export const ROF_J_ANCHORS=Object.freeze([
 {position:0,positionLabel:"0",descriptor:"まったく疲れていない",file:"lowest"},
 {position:2.5,positionLabel:"2と3の間",descriptor:"少し疲れている",file:"low"},
 {position:5,positionLabel:"5",descriptor:"中程度に疲れている",file:"moderate"},
 {position:7.5,positionLabel:"7と8の間",descriptor:"とても疲れている",file:"high"},
 {position:10,positionLabel:"10",descriptor:"完全な疲労困憊（何も残っていない状態）",file:"highest"}
]);
export const isValidRofJ=v=>Number.isInteger(v)&&v>=0&&v<=10;
export const guidanceForRofJ=v=>{
 if(!isValidRofJ(v))return "数値を選択してください";
 if(v===0||v===5||v===10)return ROF_J_ANCHORS.find(a=>a.position===v).descriptor;
 if(v===2||v===3)return "少し疲れている付近";
 if(v===7||v===8)return "とても疲れている付近";
 return "目安の間の値";
};
export const ORIGINAL_ROF_ASSET_ROOT="https://raw.githubusercontent.com/peanutsdx53-lgtm/runload-app/main/assets/rof/";
export function referenceImageUrl(anchor){return ORIGINAL_ROF_ASSET_ROOT+"rof-visual-"+anchor.file+".png"}
export const ROF_J_RIGHTS={
 scale:"Suzuki K, Arai T. Validation of the Japanese Version of the Rating of Fatigue Scale. Sports Medicine - Open (2026).",
 scaleUrl:"https://link.springer.com/article/10.1186/s40798-026-01108-8",
 scaleLicense:"https://creativecommons.org/licenses/by-nc-nd/4.0/",
 images:"Micklewright D et al. Development and Validity of the Rating-of-Fatigue Scale. Sports Medicine (2017).",
 imagesUrl:"https://doi.org/10.1007/s40279-017-0711-5",
 imagesLicense:"https://creativecommons.org/licenses/by/4.0/"
};
