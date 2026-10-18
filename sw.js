'use strict';
const CACHE='fishay-shell-v1.7.0';
const FILES=['./','./index.html','./style.css','./fishay-hero.jpg','./app.js','./auth-host.js','./push.js','./push-config.js','./config.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fishay-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  // Never intercept Google requests, photos, authentication or uploads.
  if(e.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  const known=FILES.some(p=>new URL(p,self.registration.scope).pathname===url.pathname);
  if(!known)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)));}return r;}).catch(()=>caches.match(e.request).then(r=>r||Response.error())));
});

// Register click handling before Firebase's listener.
self.addEventListener('notificationclick',event=>{
 event.stopImmediatePropagation();event.notification.close();
 event.waitUntil((async()=>{
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 const existing=windows.find(w=>w.url.startsWith(self.registration.scope));
 if(existing){await existing.focus();existing.postMessage({type:'fishay-open-catches'});}
 else await self.clients.openWindow(self.registration.scope+'?catches=1');
 })());
});
importScripts('./push-config.js');
if(self.FISHAY_PUSH?.firebase?.apiKey){
 importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
 firebase.initializeApp(self.FISHAY_PUSH.firebase);firebase.messaging();
}
