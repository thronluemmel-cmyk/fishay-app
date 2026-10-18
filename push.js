'use strict';
const pushButton=document.getElementById('pushEnable'),pushOff=document.getElementById('pushDisable'),pushStatus=document.getElementById('pushStatus');
const pushRequests=new Map();let pushSdk=null;
function isInstalled(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function pushUi(){document.getElementById('pushSettings').hidden=!isInstalled();}
pushUi();window.addEventListener('appinstalled',pushUi);
window.addEventListener('message',e=>{const d=e.data;if(e.source!==authFrame||e.origin!==authOrigin||!d||d.nonce!==bridgeNonce||d.type!=='fishay-push-response')return;const p=pushRequests.get(d.id);if(!p)return;clearTimeout(p.timer);pushRequests.delete(d.id);d.ok?p.resolve():p.reject(Error(d.error||'Push-Verbindung fehlgeschlagen.'));});
function pushRpc(action,deviceToken){return new Promise((resolve,reject)=>{if(!authFrame)return reject(Error('Bitte zuerst den Cup öffnen und anmelden, dann über „Menü“ zurückkommen.'));const id=crypto.randomUUID(),timer=setTimeout(()=>{pushRequests.delete(id);reject(Error('Keine Antwort. Bitte Cup neu öffnen und erneut versuchen.'));},30000);pushRequests.set(id,{resolve,reject,timer});authFrame.postMessage({type:'fishay-push-request',nonce:bridgeNonce,id,action,deviceToken},authOrigin);});}
async function messaging(){
 if(pushSdk)return pushSdk;
 const cfg=globalThis.FISHAY_PUSH;if(!cfg?.firebase?.apiKey||!cfg.vapidKey)throw Error('Firebase muss zuerst vom Verwalter eingerichtet werden.');
 const [app,sdk]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging.js')]);
 if(!await sdk.isSupported())throw Error('Dieses Gerät unterstützt Push hier nicht. Auf dem iPhone die App vom Home-Bildschirm öffnen (iOS 16.4 oder neuer).');
 const instance=sdk.getMessaging(app.initializeApp(cfg.firebase));
 sdk.onMessage(instance,async payload=>{const reg=await navigator.serviceWorker.ready;await reg.showNotification(payload.notification?.title||'Neuer FISHAY-Fang',{body:payload.notification?.body||'',tag:payload.notification?.tag||'fishay',data:{FCM_MSG:payload},icon:'icons/icon-192.png'});});
 pushSdk={sdk,instance};return pushSdk;
}
pushButton.onclick=async()=>{
 if(!isInstalled())return;
 pushButton.disabled=true;
 try{
 if(!authFrame)throw Error('Bitte zuerst den Cup öffnen und anmelden, danach über „Menü“ zurückkommen.');
 if(!('Notification' in window))throw Error('Push wird auf diesem Gerät nicht unterstützt.');
 // Request directly from the tap, before network calls (required on iPhone).
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Benachrichtigungen wurden nicht erlaubt. Du kannst dies in den Handy-Einstellungen ändern.');
 pushStatus.textContent='Benachrichtigungen werden eingerichtet …';
 const {sdk,instance}=await messaging(),reg=await navigator.serviceWorker.ready;
 const deviceToken=await sdk.getToken(instance,{vapidKey:FISHAY_PUSH.vapidKey,serviceWorkerRegistration:reg});
 await pushRpc('register',deviceToken);localStorage.setItem('fishay-push-enabled','yes');pushStatus.textContent='Aktiv auf diesem Gerät. Neue Fänge der anderen werden gemeldet – auch bei geschlossener App.';
 }catch(e){pushStatus.textContent=e.message;}finally{pushButton.disabled=false;}
};
pushOff.onclick=async()=>{
 pushOff.disabled=true;
 try{const {sdk,instance}=await messaging(),reg=await navigator.serviceWorker.ready;
 if(Notification.permission==='granted'){const t=await sdk.getToken(instance,{vapidKey:FISHAY_PUSH.vapidKey,serviceWorkerRegistration:reg});try{await pushRpc('unregister',t);}catch(_){} }
 await sdk.deleteToken(instance);localStorage.removeItem('fishay-push-enabled');pushStatus.textContent='Benachrichtigungen auf diesem Gerät ausgeschaltet.';
 }catch(e){pushStatus.textContent=e.message;}finally{pushOff.disabled=false;}
};

let openCatchesPending=new URL(location.href).searchParams.has('catches');
function openPushCatchList(){
 openCup();
 if(!authFrame){openCatchesPending=true;return;}
 authFrame.postMessage({type:'fishay-open-catches',nonce:bridgeNonce},authOrigin);openCatchesPending=false;
}
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='fishay-open-catches')openPushCatchList();});
window.addEventListener('message',e=>{if(e.source===authFrame&&e.origin===authOrigin&&e.data?.type==='fishay-auth-request'&&e.data.nonce===bridgeNonce&&openCatchesPending)setTimeout(openPushCatchList,500);});

// Renew an already consented device token after successful login/restoration.
window.addEventListener('message',async e=>{
 if(e.source!==authFrame||e.origin!==authOrigin||e.data?.type!=='fishay-push-login'||e.data.nonce!==bridgeNonce||!isInstalled())return;
 try{
 if(localStorage.getItem('fishay-push-enabled')!=='yes'||!('Notification' in window)||Notification.permission!=='granted')return;
 const {sdk,instance}=await messaging(),reg=await navigator.serviceWorker.ready;
 const t=await sdk.getToken(instance,{vapidKey:FISHAY_PUSH.vapidKey,serviceWorkerRegistration:reg});await pushRpc('register',t);
 pushStatus.textContent='Benachrichtigungen sind auf diesem Gerät aktiv.';
 }catch(_){pushStatus.textContent='Benachrichtigungen bitte über „Aktivieren / erneuern“ erneut verbinden.';}
});
