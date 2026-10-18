'use strict';
const $=id=>document.getElementById(id);
let installPrompt=null, started=false;
let appUrl=null;
try { const u=new URL(window.FISHAY_CONFIG.webAppUrl); if(u.origin==='https://script.google.com' && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname) && !u.search && !u.hash) appUrl=u; } catch (_) {}
$('status').textContent=appUrl?'Bereit für euren Cup.':'Die Google-Verbindung ist noch nicht eingerichtet. Der Verwalter muss den /exec-Link in config.js eintragen.';
$('open').disabled=!appUrl;
if(appUrl) $('direct').href=appUrl.href;
window.addEventListener('message',e=>{
  // Google serves HtmlService from an isolated googleusercontent frame.
  if(e.data==='fishay-frame-ready' && /^https:\/\/[a-z0-9-]+(?:-script)?\.googleusercontent\.com$/.test(e.origin) && e.source) e.source.postMessage('fishay-host-ready',e.origin);
});
function openCup(){
  if(!appUrl)return;
  if(!navigator.onLine){$('status').textContent='Bitte zuerst eine Internetverbindung herstellen.';return;}
  $('landing').hidden=true;$('cup').hidden=false;
  if(!started){const u=new URL(appUrl);u.searchParams.set('embed','1');$('frame').src=u.href;started=true;}
  $('fallback').hidden=false;
}
$('open').onclick=openCup;
$('home').onclick=()=>{$('landing').hidden=false;$('cup').hidden=true;};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
$('install').onclick=async()=>{
  if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;}
  else {$('help').open=true;$('help').scrollIntoView({behavior:'smooth'});}
};
function installed(){ $('install').hidden=true; }
window.addEventListener('appinstalled',installed);
const standalone=matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if(standalone){installed();openCup();}
$('share').onclick=async()=>{
  const url=new URL('./',location.href).href;
  try{if(navigator.share)await navigator.share({title:'FISHAY Predator Cup installieren',url});else{await navigator.clipboard.writeText(url);$('status').textContent='Installationslink kopiert.';}}catch(e){if(e.name!=='AbortError')$('status').textContent='Bitte den Link aus der Adresszeile kopieren: '+url;}
};
function network(){ $('offline').hidden=navigator.onLine; }
window.addEventListener('online',network);window.addEventListener('offline',network);network();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{$('status').textContent='Offline-Start nicht verfügbar. Bitte die Seite über HTTPS neu öffnen.';});
