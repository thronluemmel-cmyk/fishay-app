'use strict';
// The per-launch nonce binds storage requests to this app's Google frame.
const bridgeNonce=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
let authFrame=null,authOrigin=null;
window.addEventListener('message',e=>{
 const d=e.data;
 if(!appUrl||!started||!d||d.type!=='fishay-auth-request'||d.nonce!==bridgeNonce||typeof d.id!=='string')return;
 if(!/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(e.origin)||!e.source)return;
 if(authFrame && (e.source!==authFrame||e.origin!==authOrigin))return;
 authFrame=e.source;authOrigin=e.origin;
 const key='fishay-auth:'+appUrl.pathname;
 let value=null,ok=true;
 try{
  if(d.action==='get'){
   value=JSON.parse(localStorage.getItem(key)||'null');
   if(value && (!/^[a-f0-9-]{72}$/.test(value.token)||!Number.isFinite(value.expiresAt)||value.expiresAt<=Date.now())){localStorage.removeItem(key);value=null;}
  }else if(d.action==='set'){
   const v=d.value;
   if(!v||!/^[a-f0-9-]{72}$/.test(v.token)||!Number.isFinite(v.expiresAt)||v.expiresAt<=Date.now()||v.expiresAt>Date.now()+31*86400000)throw Error('Invalid session');
   localStorage.setItem(key,JSON.stringify({token:v.token,expiresAt:v.expiresAt}));
  }else if(d.action==='clear')localStorage.removeItem(key);
  else return;
 }catch(_){ok=false;}
 e.source.postMessage({type:'fishay-auth-response',id:d.id,nonce:bridgeNonce,ok,value},e.origin);
});
