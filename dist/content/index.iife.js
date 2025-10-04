(function(){"use strict";var m;(function(e){e.Local="local",e.Sync="sync",e.Managed="managed",e.Session="session"})(m||(m={}));var x;(function(e){e.ExtensionPagesOnly="TRUSTED_CONTEXTS",e.ExtensionPagesAndContentScripts="TRUSTED_AND_UNTRUSTED_CONTEXTS"})(x||(x={}));const a=globalThis.chrome,D=async(e,t)=>{const o=r=>typeof r=="function",n=r=>r instanceof Promise;return o(e)?(n(e),e(t)):e};let A=!1;function L(e){if(a&&a.storage[e]===void 0)throw new Error(`Check your storage permission in manifest.json: ${e} is not defined`)}function z(e,t,o){var B,R;let n=null,r=!1,s=[];const c=(o==null?void 0:o.storageEnum)??m.Local,d=((B=o==null?void 0:o.serialization)==null?void 0:B.serialize)??(i=>i),b=((R=o==null?void 0:o.serialization)==null?void 0:R.deserialize)??(i=>i);A===!1&&c===m.Session&&(o==null?void 0:o.sessionAccessForContentScripts)===!0&&(L(c),a==null||a.storage[c].setAccessLevel({accessLevel:x.ExtensionPagesAndContentScripts}).catch(i=>{console.warn(i),console.warn("Please call setAccessLevel into different context, like a background script.")}),A=!0);const g=async()=>{L(c);const i=await(a==null?void 0:a.storage[c].get([e]));return i?b(i[e])??t:t},y=()=>{s.forEach(i=>i())},S=async i=>{r||(n=await g()),n=await D(i,n),await(a==null?void 0:a.storage[c].set({[e]:d(n)})),y()},Y=i=>(s=[...s,i],()=>{s=s.filter(v=>v!==i)}),Z=()=>n;g().then(i=>{n=i,r=!0,y()});async function ee(i){if(i[e]===void 0)return;const v=b(i[e].newValue);n!==v&&(n=await D(v,n),y())}return a==null||a.storage[c].onChanged.addListener(ee),{get:g,set:S,getSnapshot:Z,subscribe:Y}}const W={protectionActive:!0,blockedCount:0,todayBlockedCount:0,lastResetDate:new Date().toDateString(),blockedSites:[]},h=z("content-blocking-storage",W,{storageEnum:m.Local}),E={...h,toggleProtection:async()=>{await h.set(e=>({...e,protectionActive:!e.protectionActive}))},incrementBlockCount:async()=>{await h.set(e=>{const t=new Date().toDateString(),o=e.lastResetDate!==t;return{...e,blockedCount:e.blockedCount+1,todayBlockedCount:o?1:e.todayBlockedCount+1,lastResetDate:t}})},resetDailyCount:async()=>{await h.set(e=>({...e,todayBlockedCount:0,lastResetDate:new Date().toDateString()}))},addBlockedSite:async e=>{await h.set(t=>t.blockedSites.includes(e)?t:{...t,blockedSites:[...t.blockedSites,e]})}};console.log("Content script loaded - v5 - Performance Optimized");let l=!0;const H=.2,p=new WeakSet,N=new Set;let w=0;const U=3;E.get().then(e=>{l=e.protectionActive,console.log("[Content Script] Protection state initialized:",l)}),chrome.storage.local.onChanged.addListener(e=>{if(e["content-blocking-storage"]){const t=e["content-blocking-storage"].newValue;if(t&&typeof t.protectionActive=="boolean"){const o=l;l=t.protectionActive,console.log("[Content Script] Protection state changed:",o,"->",l),o&&!l&&(console.log("[Content Script] Disabling protection, stopping observer and unwrapping all images..."),J(),document.querySelectorAll(".content-blocker-container").forEach(n=>{const r=n.querySelector("img");r&&(p.delete(r),C(r,n))})),!o&&l&&(console.log("[Content Script] Re-enabling protection, starting observer and processing all images..."),P(),document.querySelectorAll(".content-blocker-container img").forEach(n=>{p.delete(n)}),document.querySelectorAll("img").forEach(n=>{k(n)}))}}if(e["privy-auth-storage"]){const t=e["privy-auth-storage"].newValue;t&&!t.isPremium&&t.freeBlocksRemaining===0&&console.log("[Content Script] User hit paywall (0 free blocks), stopping image processing")}});const F=`
  .content-blocker-container {
    position: relative !important; /* Crucial for absolute positioning of overlay */
    display: inline-block !important; /* Default, adjust as needed */
    vertical-align: bottom !important; /* Align with image baseline */
    line-height: 0 !important; /* Prevent extra space below image */
    overflow: hidden !important; /* Ensure overlay doesn't extend beyond container */
    max-width: 100% !important;
  }
  .content-blocker-container img {
    display: block !important; /* Prevent extra space below image */
    max-width: 100% !important;
    height: auto !important;
  }
  .content-blocker-overlay {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    background-color: rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(5px) !important; /* Default blur for scanning */
    -webkit-backdrop-filter: blur(5px) !important;
    z-index: 9998 !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    align-items: center !important;
    text-align: center !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    color: white !important;
    padding: 10px !important;
    box-sizing: border-box !important;
    cursor: default !important; /* Default cursor */
    opacity: 1 !important;
    transition: opacity 0.3s ease, backdrop-filter 0.3s ease, background-color 0.3s ease !important;
  }
  .content-blocker-overlay.disallowed {
    backdrop-filter: blur(25px) !important;
    -webkit-backdrop-filter: blur(25px) !important;
    background-color: rgba(0, 0, 0, 0.75) !important;
    cursor: pointer !important; /* Allow clicking to reveal */
  }
  .content-blocker-overlay .eye-icon {
    width: 48px !important;
    height: 48px !important;
    margin-bottom: 8px !important;
    opacity: 0.95 !important;
    flex-shrink: 0 !important;
    display: block !important;
    border-radius: 4px !important;
  }
  .content-blocker-overlay .message {
    font-size: 13px !important;
    line-height: 1.4 !important;
    max-width: 200px !important;
    text-shadow: 0 1px 3px rgba(0,0,0,0.5) !important;
    flex-shrink: 0 !important;
  }
  /* State for fading out when allowed (handled by removing the element) */
`,I=document.createElement("style");I.textContent=F,document.head.appendChild(I);const M=["oh my such big boobas","bro this one is worth gooning","sheesh 👀 you sure about this?","down catastrophically huh?","someone bonk this man","least horny internet user","touch grass challenge failed","my eyes... they need bleach","you really wanna see this?","certified goon moment™","the council says: no","begone, coomer!","not on my watch chief"],_="Blocked by NoGoon";function G(){return Math.random()<.15?M[Math.floor(Math.random()*M.length)]:_}const q=`<img src="${chrome.runtime.getURL("/booba.gif")}" class="eye-icon" alt="NoGoon" />`;function $(e){const t=e.src.toLowerCase(),o=e.naturalWidth||e.offsetWidth,n=e.naturalHeight||e.offsetHeight;if(o<100||n<100||["doubleclick.net","google-analytics.com","googletagmanager.com","facebook.com/tr","analytics.","/pixel.","/tracking.","/beacon.","favicon",".ico",".svg","/logo","/icon"].some(c=>t.includes(c)))return!0;const s=e.className.toLowerCase();return!!(s.includes("icon")||s.includes("logo")||s.includes("avatar")||s.includes("badge"))}async function V(e){try{const t=await chrome.runtime.sendMessage({type:"classifyImage",imageUrl:e});if(t.status==="error")return console.error("[Content Script] Classification error:",t.message),"error";if(t.status==="success"&&t.result){const n=t.result.some(r=>(r.className==="Porn"||r.className==="Sexy"||r.className==="Hentai")&&r.probability>=H)?"disallowed":"allowed";return console.log(`[Content Script] Image classified as ${n}:`,e.substring(0,50)),n}else return console.error("[Content Script] Invalid response from background"),"error"}catch(t){return t instanceof Error&&t.message.includes("Could not establish connection")?console.warn("[Content Script] Background script unavailable"):console.error("[Content Script] Classification error:",t),"error"}}function j(e){const t=document.createElement("div");return t.className="content-blocker-overlay",t.textContent=e,t}function X(e){if(!e.parentNode)return null;const t=document.createElement("div");t.className="content-blocker-container";const o=window.getComputedStyle(e);return t.style.display=o.display==="inline"?"inline-block":o.display,t.style.verticalAlign=o.verticalAlign,t.style.width=`${e.offsetWidth}px`,t.style.height=`${e.offsetHeight}px`,e.parentNode.insertBefore(t,e),t.appendChild(e),t}function C(e,t){t.parentNode&&t.parentNode.insertBefore(e,t),t.remove()}async function k(e){if(!l||p.has(e)||e.closest(".content-blocker-container")||!e.src||e.src.startsWith("data:")||!e.src.startsWith("http"))return;if($(e)){p.add(e);return}const t=100;if(e.offsetWidth<t&&e.offsetHeight<t)return;const o=e.src;if(N.has(o)){console.log("[Content Script] Already processing this URL, skipping:",o);return}if(w>=U){console.log("[Content Script] Max concurrent processing reached, queuing for later"),setTimeout(()=>k(e),500);return}p.add(e),N.add(o),w++;const n=()=>{N.delete(o),w=Math.max(0,w-1)},r=X(e);if(!r){p.delete(e),n();return}const s=j("Scanning...");r.appendChild(s);try{if(!e.complete)try{await e.decode()}catch(g){console.log("[Content Script] Image failed to load/decode:",e.src,g),C(e,r),p.delete(e),n();return}const c=100;if(e.naturalWidth<c||e.naturalHeight<c){console.log("[Content Script] Skipping small image after load:",e.src,`(${e.naturalWidth}x${e.naturalHeight})`),C(e,r),n();return}r.style.width=`${e.offsetWidth}px`,r.style.height=`${e.offsetHeight}px`;const d=new URL(e.src,document.baseURI).href,b=await V(d);if(b==="allowed")console.log("[Content Script] Image allowed:",e.src),s.style.opacity="0",setTimeout(()=>{s.parentNode&&s.remove(),n()},300);else if(b==="disallowed"){console.log("[Content Script] Image blocked:",e.src),await E.incrementBlockCount().catch(S=>{console.error("[Content Script] Failed to increment block count:",S)});const g=window.location.hostname;await E.addBlockedSite(g).catch(S=>{console.error("[Content Script] Failed to add blocked site:",S)}),s.classList.add("disallowed");const y=G();s.innerHTML=`
        ${q}
        <div class="message">${y}</div>
      `,s.addEventListener("click",()=>{console.log("[Content Script] Revealing image:",e.src),s.parentNode&&s.remove()},{once:!0}),n()}else console.log("[Content Script] Error classifying image, removing overlay:",e.src),s.style.opacity="0",setTimeout(()=>{s.parentNode&&s.remove(),n()},500)}catch(c){console.error("[Content Script] Unexpected error during classification process:",c);const d=r.querySelector(".content-blocker-overlay");d&&(d.textContent="Error",d.style.opacity="0",setTimeout(()=>{d.parentNode&&d.remove()},500)),n()}}let f=null,u=[],T=null;function K(){if(u.length===0)return;console.log(`[Content Script] Processing ${u.length} new images from mutations`);const e=[...u];u=[],e.forEach((t,o)=>{setTimeout(()=>k(t),o*50)})}function Q(){return new MutationObserver(e=>{l&&(e.forEach(t=>{if(t.addedNodes.forEach(o=>{if(o.nodeType===Node.ELEMENT_NODE){const n=o;n.tagName==="IMG"&&u.push(n),n.children.length>0&&n.children.length<50&&n.querySelectorAll("img").forEach(r=>{u.push(r)})}}),t.type==="attributes"&&(t.attributeName==="src"||t.attributeName==="srcset")&&t.target.nodeName==="IMG"){const o=t.target,n=o.closest(".content-blocker-container");n&&C(o,n),p.delete(o),u.push(o)}}),T&&clearTimeout(T),T=window.setTimeout(K,200))})}function P(){!f&&l&&(console.log("[Content Script] Starting MutationObserver..."),f=Q(),f.observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["src","srcset","style"]}),console.log("[Content Script] Observer started."))}function J(){f&&(console.log("[Content Script] Stopping MutationObserver..."),f.disconnect(),f=null,console.log("[Content Script] Observer stopped."))}function O(){if(console.log("[Content Script] Initializing content script..."),l){let e=function(){const r=t.slice(o,o+n);r.forEach(s=>k(s)),o+=r.length,o<t.length?setTimeout(e,100):console.log("[Content Script] Initial image processing complete.")};console.log("[Content Script] Protection is enabled, starting observer..."),P(),console.log("[Content Script] Processing initially present images...");const t=Array.from(document.querySelectorAll("img"));console.log(`[Content Script] Found ${t.length} images to process`);let o=0;const n=5;e()}else console.log("[Content Script] Protection is disabled, skipping image processing.");console.log("[Content Script] Initialization started.")}document.readyState==="loading"?(console.log("[AIDEBUGLOGDETECTIVEWORK]: DOM is loading, adding DOMContentLoaded listener."),document.addEventListener("DOMContentLoaded",O)):(console.log("[AIDEBUGLOGDETECTIVEWORK]: DOM already loaded, calling initializeContentScript directly."),O())})();
