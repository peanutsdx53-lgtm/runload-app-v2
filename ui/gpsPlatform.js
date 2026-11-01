/* GPS measurement is a smartphone-only route.
 * Narrowing a desktop window cannot enable GPS recording. */
export const isGpsSmartphone=({userAgent='',uaMobile=false}={})=>
 uaMobile===true||/iPhone|iPod|Android.*Mobile/i.test(String(userAgent));
export const currentGpsSmartphone=()=>isGpsSmartphone({
 userAgent:typeof navigator==='undefined'?'':navigator.userAgent,
 uaMobile:typeof navigator!=='undefined'&&navigator.userAgentData?.mobile===true
});
