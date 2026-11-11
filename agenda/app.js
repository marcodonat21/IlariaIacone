/* Agenda (Supabase) — tutte le funzioni dell'agenda Google */
(function(){
"use strict";
var SB_URL="https://afdpxhzxhfeumtjtfvui.supabase.co",SB_KEY="sb_publishable_PlEfnhOIIYzjwciVxKUnSA_wSwMy-7o";
var sb=supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,detectSessionInUrl:true,flowType:"implicit"}});
var $=function(i){return document.getElementById(i)},$$=function(q,r){return Array.prototype.slice.call((r||document).querySelectorAll(q))};
var ST=null,RUOLO="titolare",SEDI=[],PRES=[],ORARI=[],VIEW="home",CAL={},NP=null;
var GG=["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"],GC=["dom","lun","mar","mer","gio","ven","sab"],MESI=["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
var METODI=["POS","Contanti","Bonifico","Satispay","Altro"];
var IC={
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  nuovo:'<path d="M12 5v14M5 12h14"/>',
  paz:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  conf:'<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
  cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  attesa:'<path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10"/>',
  inc:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  stat:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  fatt:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'
};
var TEL='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>';
var WA='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.5 8.5 0 1 1 21 11.5z"/></svg>';
var VIEWS=[["home","Panoramica"],["nuovo","Nuovo appuntamento"],["paz","Pazienti"],["conf","Da confermare"],["cal","Calendario"],["attesa","Lista d’attesa"],["inc","Incassi"],["stat","Statistiche"],["fatt","Fatture"]];

/* ---------------- utilità ---------------- */
function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function pad(n){return(n<10?"0":"")+n}
function ymd(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
function pd(s){var p=String(s).slice(0,10).split("-");return new Date(+p[0],+p[1]-1,+p[2])}
function hm(d){return pad(d.getHours())+":"+pad(d.getMinutes())}
function addD(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x}
function sod(d){var x=new Date(d);x.setHours(0,0,0,0);return x}
function dlab(d){return GG[d.getDay()]+" "+d.getDate()+" "+MESI[d.getMonth()]}
function dmy(s){if(!s)return"";var p=String(s).slice(0,10).split("-");return p[2]+"/"+p[1]+"/"+p[0]}
function eur(n){return(Number(n)||0).toLocaleString("it-IT",{style:"currency",currency:"EUR"})}
function num(v){if(v==null||v==="")return null;var n=Number(String(v).replace(",","."));return isFinite(n)?n:null}
function waNum(t){t=String(t||"").replace(/[^\d+]/g,"");if(t.indexOf("+")===0)return t.slice(1);if(t.indexOf("00")===0)return t.slice(2);return t.length<=10?"39"+t:t}
function telHref(t){return "tel:"+String(t||"").replace(/[^\d+]/g,"")}
function nomeP(p){return p?[p.nome,p.cognome].filter(Boolean).join(" "):"—"}
function ini(p){var n=nomeP(p).split(" ");return((n[0]||"")[0]||"")+((n[1]||"")[0]||"")}
function toast(m){var t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);setTimeout(function(){t.remove()},2800)}
function err(e){console.error(e);toast("Qualcosa non ha funzionato: riprova.")}
function presOf(a){return PRES.filter(function(x){return x.id===a.prestazione_id})[0]}
function fam(a){var p=presOf(a);if(p)return "var(--"+p.famiglia+")";var v=String(a.tipo||"").toLowerCase();return "var(--"+(/sport/.test(v)?"t3":/^(adipometria|esame)/.test(v)?"t4":/controllo/.test(v)?"t2":"t1")+")"}
function sede(id){return SEDI.filter(function(x){return x.id===id})[0]}
function sedeNome(id){var s=sede(id);return s?s.nome:""}
function cfOk(cf){return /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(String(cf||"").toUpperCase())}
function durLab(m){return m<60?m+" minuti":m===60?"1 ora":Math.floor(m/60)+(m>=120?" ore":" ora")+(m%60?" e "+(m%60):"")}
function q(r){return r.then(function(x){if(x.error)throw x.error;return x.data})}
function own(){return RUOLO!=="contabile"}

/* ---------------- modalità notte (spenta di base) ---------------- */
function notte(on){document.documentElement.classList.toggle("notte",on);try{localStorage.setItem("notte",on?"1":"0")}catch(e){}
  $$(".notte-t").forEach(function(b){b.textContent="🌙 Modalità notte: "+(on?"accesa":"spenta")})}
try{notte(localStorage.getItem("notte")==="1")}catch(e){}
document.addEventListener("click",function(e){if(e.target.closest(".notte-t"))notte(!document.documentElement.classList.contains("notte"))});

/* ---------------- accesso ---------------- */
$("lform").onsubmit=function(e){e.preventDefault();var m=$("lmail").value.trim();if(!m)return;$("lbtn").disabled=true;$("lmsg").className="hint";$("lmsg").textContent="Invio in corso…";
  sb.auth.signInWithOtp({email:m,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}}).then(function(r){
    $("lbtn").disabled=false;
    if(r.error){$("lmsg").className="hint err";$("lmsg").textContent=/not allowed|not found|Signups/i.test(r.error.message)?"Questa email non è abilitata all'agenda.":/rate|seconds/i.test(r.error.message)?"Hai già chiesto un link da poco: aspetta un minuto e riprova.":"Non sono riuscito a mandare il link: riprova tra poco.";return}
    $("lmsg").className="hint ok";$("lmsg").textContent="Fatto! Apri la mail che ti ho mandato e tocca il link per entrare."})};
$("logout").onclick=function(){sb.auth.signOut().then(function(){location.reload()})};
sb.auth.onAuthStateChange(function(ev,session){if(ev==="SIGNED_IN"&&session&&!ST)start(session)});
sb.auth.getSession().then(function(r){if(r.data.session)start(r.data.session);else $("login").hidden=false});

function start(session){
  if(ST)return;ST={};
  $("umail").textContent=session.user.email;
  Promise.all([q(sb.from("studi").select("*").limit(1)),q(sb.from("membri").select("ruolo,studio_id").eq("user_id",session.user.id))]).then(function(rs){
    if(!rs[0].length){ST=null;$("login").hidden=false;$("lmsg").className="hint err";$("lmsg").textContent="Il tuo account non è collegato a nessuna agenda.";return}
    ST=rs[0][0];RUOLO=(rs[1].filter(function(m){return m.studio_id===ST.id})[0]||{}).ruolo||"titolare";
    $("snome").textContent=ST.nome;$("sprof").textContent=ST.professione||"";document.title="Agenda di "+ST.nome.split(" ")[0];
    return Promise.all([q(sb.from("sedi").select("*").eq("studio_id",ST.id).order("ordine")),q(sb.from("prestazioni").select("*").eq("studio_id",ST.id).order("ordine")),q(sb.from("orari").select("*").eq("studio_id",ST.id))]).then(function(rs){
      SEDI=rs[0];PRES=rs[1];ORARI=rs[2];
      buildNav();$("login").hidden=true;$("app").hidden=false;$("today").textContent=dlab(new Date());
      fillForm();var h=(location.hash||"").replace("#","");go(allowed().indexOf(h)>=0?h:(own()?"home":"fatt"));contaConf()})}).catch(function(e){ST=null;err(e);$("login").hidden=false})}

/* ---------------- navigazione ---------------- */
function allowed(){return own()?VIEWS.map(function(v){return v[0]}):["fatt"]}
function svg(k){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+IC[k]+'</svg>'}
function buildNav(){var a=allowed();
  $("sidenav").innerHTML=VIEWS.filter(function(v){return a.indexOf(v[0])>=0}).map(function(v){return '<button class="nav" data-v="'+v[0]+'">'+svg(v[0])+v[1]+(v[0]==="conf"?'<span class="cnt" data-cnt hidden></span>':'')+'</button>'}).join("");
  if(!own()){$$(".bnav,.tnew,.gsearch").forEach(function(x){x.hidden=true});$$("[data-own]").forEach(function(x){x.hidden=true})}}
function go(v){if(v==="altro")return altro();if(allowed().indexOf(v)<0)v=allowed()[0];VIEW=v;
  $$("[data-view]").forEach(function(s){s.hidden=s.dataset.view!==v});
  var main=["home","cal","nuovo","paz"];$$(".nav,.bnav button").forEach(function(b){b.classList.toggle("on",b.dataset.v===v||(b.dataset.v==="altro"&&main.indexOf(v)<0))});
  $("title").textContent=(VIEWS.filter(function(x){return x[0]===v})[0]||[])[1]||"";$("gres").hidden=true;
  try{history.replaceState(null,"","#"+v)}catch(e){}window.scrollTo(0,0);
  ({home:loadHome,conf:loadConf,cal:loadCal,paz:loadPaz,nuovo:resetNew,attesa:loadAttesa,inc:loadInc,stat:loadStat,fatt:loadFatt})[v]()}
document.addEventListener("click",function(e){var b=e.target.closest("[data-v],[data-go]");if(!b||b.closest(".sheet"))return;e.preventDefault();go(b.dataset.v||b.dataset.go)});
function altro(){var n=$("sidenav").querySelector("[data-cnt]");var c=n&&!n.hidden?n.textContent:"";
  sheet('<h2>Menu</h2>'+VIEWS.map(function(v){return '<button class="nav'+(VIEW===v[0]?" on":"")+'" data-m="'+v[0]+'">'+svg(v[0])+v[1]+(v[0]==="conf"&&c?'<span class="cnt">'+c+'</span>':'')+'</button>'}).join("")+
    '<div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px;display:flex;flex-direction:column;gap:6px"><button class="nav notte-t">🌙 Modalità notte: '+(document.documentElement.classList.contains("notte")?"accesa":"spenta")+'</button><a class="nav" href="https://www.nutrizionistaiacone.it" target="_blank" rel="noopener">Sito web ↗</a><button class="nav" data-out>Esci</button></div>',
    function(box,close){box.addEventListener("click",function(e){var b=e.target.closest("[data-m]");if(b){close();go(b.dataset.m)}if(e.target.closest("[data-out]"))$("logout").click()})})}

/* ---------------- fogli e conferme ---------------- */
function sheet(html,bind){var bg=document.createElement("div");bg.className="sheet-bg";bg.innerHTML='<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>'+html+'</div>';document.body.appendChild(bg);
  requestAnimationFrame(function(){bg.classList.add("on")});function close(){bg.classList.remove("on");setTimeout(function(){bg.remove()},220)}
  bg.addEventListener("click",function(e){if(e.target===bg)close()});bind&&bind(bg.firstChild,close);return close}
function ask(t,sub,ok,fn,ckMail){sheet('<h2>'+esc(t)+'</h2><div class="sub">'+esc(sub)+'</div>'+(ckMail?ckMail:'')+'<div class="acts2"><button class="btn block" data-y>'+esc(ok)+'</button><button class="btn ghost block" data-n>No</button></div>',function(box,close){
  box.querySelector("[data-y]").onclick=function(){var c=box.querySelector("#ckMail");close();fn(!!(c&&c.checked))};box.querySelector("[data-n]").onclick=close})}
/* mail ai pazienti (funzione "mail" su Supabase, con Resend) */
function ckMail(email,testo){return email?'<label class="ck" style="margin-top:12px"><input type="checkbox" id="ckMail" checked> ✉️ '+esc(testo||"Avvisa il paziente per mail")+' <small style="color:var(--muted)">('+esc(email)+')</small></label>':''}
function mail(tipo,id,prima){return sb.functions.invoke("mail",{body:{tipo:tipo,id:id,prima:prima||null}}).then(function(r){
  if(r.error||!r.data||!r.data.ok)return toast("Attenzione: la mail al paziente non è partita.");
  toast(r.data.inviate?"Mail inviata al paziente ✉️":"Nessuna mail inviata (manca l'indirizzo o è già stata mandata).")}).catch(function(){toast("Attenzione: la mail al paziente non è partita.")})}
function quandoTxt(d){return dlab(d)+" alle "+hm(d)}

/* ---------------- dati comuni ---------------- */
var SELAPP="*,paziente:pazienti(id,nome,cognome,telefono,email,cf,indirizzo,cap,citta,prov)";
function apps(da,a,tutti){var r=sb.from("appuntamenti").select(SELAPP).eq("studio_id",ST.id).gte("inizio",da.toISOString()).lt("inizio",a.toISOString()).order("inizio");if(!tutti)r=r.neq("stato","annullato");return q(r)}
function blocchi(da,a){return q(sb.from("blocchi").select("*").eq("studio_id",ST.id).lt("inizio",a.toISOString()).gt("fine",da.toISOString()).order("inizio"))}
function contaConf(){if(!own())return Promise.resolve(0);return sb.from("appuntamenti").select("id",{count:"exact",head:true}).eq("studio_id",ST.id).eq("stato","da_confermare").gte("inizio",new Date().toISOString())
  .then(function(r){var n=r.count||0;$$("[data-cnt]").forEach(function(c){c.hidden=!n;c.textContent=n});return n})}
function setStato(id,stato,msg,then,avvisa){sb.from("appuntamenti").update({stato:stato}).eq("id",id).then(function(r){if(r.error)return err(r.error);toast(msg);contaConf();then&&then();if(avvisa)mail(stato,id)})}
function refresh(){go(VIEW)}
function schedaLink(a){return location.origin+"/agenda/scheda.html?t="+a.token}
function waRem(a){var p=a.paziente||{},s=new Date(a.inizio),oggi=ymd(new Date()),g=ymd(s),qd=g===oggi?"oggi":g===ymd(addD(new Date(),1))?"domani":dlab(s),sd=sede(a.sede_id);
  var t="Ciao "+(p.nome||"")+", ti ricordo l’appuntamento con la dott.ssa "+ST.nome+" "+qd+" alle "+hm(s)+(sd?" a "+sd.nome+" ("+[sd.struttura,sd.indirizzo].filter(Boolean).join(", ")+")":"")+". Se hai bisogno di spostarlo scrivimi pure qui. A presto! 🌿";
  return "https://wa.me/"+waNum(p.telefono)+"?text="+encodeURIComponent(t)}
function rowHtml(a){var s=new Date(a.inizio),p=a.paziente,tel=p&&p.telefono,pr=a.presenza?'<span class="pres '+a.presenza+'">'+(a.presenza==="arrivato"?"arrivato":"assente")+'</span>':'';
  return '<div class="app-row'+(a.stato==="da_confermare"?" da":"")+(a.stato==="annullato"?" ann":"")+'" style="--c:'+fam(a)+'" data-app="'+a.id+'">'+
    '<div class="ora">'+hm(s)+'</div><div class="chi"><b>'+esc(nomeP(p))+'</b><small>'+esc(a.tipo||"")+' · '+esc(sedeNome(a.sede_id))+'</small></div>'+pr+
    (tel?'<a class="icb" href="'+telHref(tel)+'" aria-label="Chiama">'+TEL+'</a><a class="icb'+(a.promemoria_wa?" done":"")+'" href="'+esc(waRem(a))+'" target="_blank" rel="noopener" data-rem="'+a.id+'" aria-label="Promemoria WhatsApp">'+WA+'</a>':'')+'</div>'}
function blkHtml(b){var s=new Date(b.inizio),f=new Date(b.fine),tutto=hm(s)==="00:00"&&(f-s)%86400000===0;
  return '<div class="app-row blk" data-blk="'+b.id+'"><div class="ora">'+(tutto?"🚫":hm(s))+'</div><div class="chi"><b>'+esc(b.motivo||"Non disponibile")+'</b><small>'+(tutto?"tutto il giorno":hm(s)+"–"+hm(f))+'</small></div><button class="icb" data-delblk="'+b.id+'" aria-label="Togli il blocco">✕</button></div>'}
function groupHtml(list,emptyMsg,noHead){if(!list.length)return '<div class="empty">'+emptyMsg+'</div>';var h="",last="";
  list.forEach(function(a){var d=ymd(new Date(a.inizio));if(d!==last&&!noHead){h+='<div class="day">'+dlab(new Date(a.inizio))+'</div>'}last=d;h+=rowHtml(a)});return h}
document.addEventListener("click",function(e){var r=e.target.closest("[data-rem]");if(!r)return;sb.from("appuntamenti").update({promemoria_wa:new Date().toISOString()}).eq("id",r.dataset.rem).then(function(){r.classList.add("done")})});
document.addEventListener("click",function(e){var r=e.target.closest("[data-app]");if(!r||e.target.closest("a,button"))return;openApp(r.dataset.app)});
document.addEventListener("click",function(e){var b=e.target.closest("[data-delblk]");if(!b)return;ask("Togliere il blocco?","Quegli orari torneranno prenotabili anche dal sito.","Sì, togli",function(){
  sb.from("blocchi").delete().eq("id",b.dataset.delblk).then(function(r){if(r.error)return err(r.error);toast("Blocco tolto.");refresh()})})});

/* ---------------- ricerca globale ---------------- */
var gT=null;$("gq").oninput=function(){clearTimeout(gT);var s=this.value.trim();if(s.length<2){$("gres").hidden=true;return}gT=setTimeout(function(){
  cerca(s).then(function(P){var ids=P.map(function(p){return p.id});
    var ra=ids.length?q(sb.from("appuntamenti").select(SELAPP).in("paziente_id",ids).neq("stato","annullato").gte("inizio",addD(new Date(),-365).toISOString()).order("inizio",{ascending:false}).limit(20)):Promise.resolve([]);
    ra.then(function(A){var oggi=new Date(),fut=A.filter(function(a){return new Date(a.inizio)>=oggi}).reverse(),pas=A.filter(function(a){return new Date(a.inizio)<oggi});
      $("gres").hidden=false;$("gres").innerHTML='<div class="hrow"><h2>Risultati</h2><button class="icb" id="gx">✕</button></div>'+
        (P.length?P.slice(0,6).map(function(p){return '<div class="prow" data-pz="'+p.id+'"><div class="av">'+esc(ini(p))+'</div><div class="chi"><b>'+esc(nomeP(p))+'</b><br><small>'+esc(p.telefono||"")+'</small></div></div>'}).join(""):'<div class="empty">Nessun paziente trovato.</div>')+
        (fut.length?'<div class="day">Prossimi appuntamenti</div>'+fut.map(rowHtml).join(""):"")+(pas.length?'<div class="day">Appuntamenti passati</div>'+pas.slice(0,6).map(rowHtml).join(""):"");
      $("gx").onclick=function(){$("gres").hidden=true;$("gq").value=""}})})},250)};
document.addEventListener("click",function(e){var r=e.target.closest("[data-pz]");if(!r||e.target.closest("a")||document.querySelector("#lPaz.selmode")&&r.closest("#lPaz"))return;openPaz(r.dataset.pz)});
function cerca(s){s=s.replace(/[%,()*]/g," ").trim();var parts=s.split(/\s+/),f;
  if(/^[\d+\s]+$/.test(s))f="telefono.ilike.%"+s.replace(/\s/g,"")+"%";else f=parts.map(function(w){return "nome.ilike.%"+w+"%,cognome.ilike.%"+w+"%"}).join(",");
  return q(sb.from("pazienti").select("id,nome,cognome,telefono,email,cf,indirizzo,cap,citta,prov").eq("studio_id",ST.id).or(f).order("cognome").limit(30)).then(function(L){
    if(parts.length>1&&!/^[\d+\s]+$/.test(s))L=L.filter(function(p){var n=nomeP(p).toLowerCase();return parts.every(function(w){return n.indexOf(w.toLowerCase())>=0})});return L})}

/* ---------------- panoramica ---------------- */
var EYE=false;try{EYE=localStorage.getItem("eye")==="1"}catch(e){}
$("kEye").onclick=function(e){e.stopPropagation();EYE=!EYE;try{localStorage.setItem("eye",EYE?"1":"0")}catch(x){}$("kInc").classList.toggle("blurred",!EYE)};
function loadHome(){var oggi=sod(new Date()),dom=ymd(addD(oggi,1));$("kInc").classList.toggle("blurred",!EYE);
  apps(oggi,addD(oggi,8)).then(function(L){var t=ymd(oggi);
    var o=L.filter(function(a){return ymd(new Date(a.inizio))===t}),pr=L.filter(function(a){return ymd(new Date(a.inizio))!==t}),dm=L.filter(function(a){return ymd(new Date(a.inizio))===dom&&a.paziente&&a.paziente.telefono});
    $("kOggi").textContent=o.length;$("kSett").textContent=pr.length;
    $("lOggi").innerHTML=groupHtml(o,"Nessun appuntamento oggi.",true);
    $("lProssimi").innerHTML=groupHtml(pr,"Nessun appuntamento nei prossimi 7 giorni.");
    $("remCard").hidden=!dm.length;var fatti=dm.filter(function(a){return a.promemoria_wa}).length;
    $("lRem").innerHTML=(dm.length?'<div class="sub" style="margin-bottom:6px">Inviati '+fatti+' su '+dm.length+'</div>':'')+dm.map(rowHtml).join("")}).catch(err);
  contaConf().then(function(n){$("kConf").textContent=n});
  var m0=new Date(oggi.getFullYear(),oggi.getMonth(),1);
  q(sb.from("incassi").select("importo").eq("studio_id",ST.id).gte("data",ymd(m0))).then(function(L){var s=0;L.forEach(function(x){s+=+x.importo});$("kInc").textContent=eur(s);$("kIncN").textContent=L.length+" incassi registrati"})}

/* ---------------- da confermare ---------------- */
function loadConf(){$("lConf").innerHTML='<div class="card glass"><span class="spin"></span></div>';
  q(sb.from("appuntamenti").select(SELAPP).eq("studio_id",ST.id).eq("stato","da_confermare").gte("inizio",new Date().toISOString()).order("inizio")).then(function(L){contaConf();
    if(!L.length){$("lConf").innerHTML='<div class="card glass"><div class="empty">Nessuna richiesta da confermare. 🎉</div></div>';return}
    $("lConf").innerHTML='<div class="card glass" style="display:flex;gap:14px;align-items:center"><div class="kpi" style="padding:0;cursor:default"><b style="color:#c0731f">'+L.length+'</b></div><div><b>richiest'+(L.length===1?"a":"e")+' da confermare</b><div class="sub">Chiama il paziente, poi premi Conferma: in calendario diventa definitivo.</div></div></div>'+
      L.map(function(a){var s=new Date(a.inizio),p=a.paziente||{},tel=p.telefono;
      return '<div class="card glass req" data-id="'+a.id+'" data-email="'+esc(p.email||"")+'"><div class="when">'+hm(s)+'<small>'+esc(sedeNome(a.sede_id))+'</small></div>'+
        '<div><b>'+esc(nomeP(p))+'</b><div class="sub" style="text-transform:capitalize">'+dlab(s)+'</div><span class="pill">'+esc(a.tipo||"")+'</span>'+
        (tel?'<div class="sub">'+esc(tel)+(p.email?' · '+esc(p.email):'')+'</div>':'')+(a.note?'<div class="sub">Note: '+esc(a.note)+'</div>':'')+'<div class="sub">Richiesta il '+dmy(a.creato)+' '+hm(new Date(a.creato))+'</div></div>'+
        '<div class="acts">'+(tel?'<a class="btn ghost small" href="'+telHref(tel)+'">📞 Chiama</a><a class="btn ghost small" target="_blank" rel="noopener" href="https://wa.me/'+waNum(tel)+'">💬 WhatsApp</a>':'')+
        '<button class="btn green small" data-ok>✓ Conferma</button><button class="btn ghost small" data-no>✕ Annulla</button></div></div>'}).join("")}).catch(err)}
$("lConf").addEventListener("click",function(e){var c=e.target.closest(".req");if(!c)return;var id=c.dataset.id;
  var em=c.dataset.email||"";
  if(e.target.closest("[data-ok]"))ask("Confermare l'appuntamento?","",'Sì, conferma',function(m){setStato(id,"confermato","Appuntamento confermato.",loadConf,m)},ckMail(em,"Manda la mail di conferma"));
  if(e.target.closest("[data-no]"))ask("Annullare la richiesta?","L'orario tornerà libero anche per le prenotazioni dal sito.","Sì, annulla",function(m){setStato(id,"annullato","Richiesta annullata.",loadConf,m)},ckMail(em))});

/* ---------------- calendario (come l'agenda Google) ---------------- */
var KH0=7,KH1=21,KPX=56;
CAL={v:window.innerWidth<900?"giorno":"sett",d:null,ym:null,q:"",tipi:{},scrolled:0,ev:[],bl:[]};
function lun(d){var x=sod(d);return addD(x,-((x.getDay()+6)%7))}
function kmin(t){var p=t.split(":");return +p[0]*60+ +p[1]}
function kh(m){return pad(Math.floor(m/60))+":"+pad(m%60)}
function famK(a){var p=presOf(a);if(p)return p.famiglia;var v=String(a.tipo||"").toLowerCase();return /sport/.test(v)?"t3":/^(adipometria|esame)/.test(v)?"t4":/controllo/.test(v)?"t2":"t1"}
function kdays(){if(CAL.v==="giorno")return[sod(CAL.d)];var l=lun(CAL.d),o=[];for(var i=0;i<7;i++)o.push(addD(l,i));return o}
$$("#cMode button").forEach(function(b){b.onclick=function(){CAL.v=b.dataset.m;loadCal()}});
$("cPrev").onclick=function(){CAL.d=addD(CAL.d,CAL.v==="giorno"?-1:-7);loadCal()};
$("cNext").onclick=function(){CAL.d=addD(CAL.d,CAL.v==="giorno"?1:7);loadCal()};
$("cToday").onclick=function(){CAL.d=sod(new Date());CAL.ym=null;CAL.scrolled=0;loadCal()};
$("kPrevM").onclick=function(){CAL.ym=new Date(CAL.ym.getFullYear(),CAL.ym.getMonth()-1,1);loadMini()};
$("kNextM").onclick=function(){CAL.ym=new Date(CAL.ym.getFullYear(),CAL.ym.getMonth()+1,1);loadMini()};
$("kQ").oninput=function(){CAL.q=this.value.trim().toLowerCase();kwrender()};
$("kLeg").addEventListener("change",function(e){if(e.target.dataset.t){CAL.tipi[e.target.dataset.t]=e.target.checked;kwrender()}});
$("kGrid").addEventListener("click",function(e){var b=e.target.closest("[data-g]");if(!b)return;CAL.d=pd(b.dataset.g);loadCal()});
function loadCal(){if(!CAL.d)CAL.d=sod(new Date());if(!CAL.ym||CAL.ym.getMonth()!==CAL.d.getMonth()||CAL.ym.getFullYear()!==CAL.d.getFullYear())CAL.ym=new Date(CAL.d.getFullYear(),CAL.d.getMonth(),1);
  $$("#cMode button").forEach(function(b){b.classList.toggle("on",b.dataset.m===CAL.v)});
  var ds=kdays(),da=ds[0],a=addD(ds[ds.length-1],1),e=ds[ds.length-1];
  $("cLab").textContent=CAL.v==="giorno"?dlab(da):(da.getMonth()===e.getMonth()?da.getDate()+" – "+e.getDate()+" "+MESI[e.getMonth()]+" "+e.getFullYear():da.getDate()+" "+MESI[da.getMonth()].slice(0,3)+" – "+e.getDate()+" "+MESI[e.getMonth()].slice(0,3)+" "+e.getFullYear());
  Promise.all([apps(da,a),blocchi(da,a)]).then(function(rs){CAL.ev=rs[0];CAL.bl=rs[1];CAL.days=ds;kwrender()}).catch(err);
  loadMini();sb.from("lista_attesa").select("id",{count:"exact",head:true}).eq("studio_id",ST.id).then(function(r){var n=r.count||0;$("kWcnt").hidden=!n;$("kWcnt").textContent=n})}
function loadMini(){var y=CAL.ym.getFullYear(),m=CAL.ym.getMonth(),da=new Date(y,m,1),a=new Date(y,m+1,1);$("kMese").textContent=MESI[m]+" "+y;
  q(sb.from("appuntamenti").select("inizio,stato").eq("studio_id",ST.id).neq("stato","annullato").gte("inizio",da.toISOString()).lt("inizio",a.toISOString())).then(function(L){
    var cnt={},dac={};L.forEach(function(x){var k=ymd(new Date(x.inizio));cnt[k]=(cnt[k]||0)+1;if(x.stato==="da_confermare")dac[k]=1});
    var off=(da.getDay()+6)%7,n=new Date(y,m+1,0).getDate(),oggi=ymd(new Date()),sel=ymd(CAL.d),h="";
    for(var i=0;i<off;i++)h+='<span class="kd out"></span>';
    for(var d=1;d<=n;d++){var g=y+"-"+pad(m+1)+"-"+pad(d);h+='<button class="kd'+(g===oggi?" today":"")+(g===sel?" sel":"")+'" data-g="'+g+'">'+d+(cnt[g]?'<i class="'+(dac[g]?"da":"")+'">'+cnt[g]+'</i>':'')+'</button>'}
    $("kGrid").innerHTML=h})}
function kwrender(){var ds=CAL.days||kdays(),oggi=ymd(new Date()),H=(KH1-KH0)*KPX,flt=Object.keys(CAL.tipi).filter(function(k){return CAL.tipi[k]}),gc="grid-template-columns:54px repeat("+ds.length+",minmax(0,1fr))";
  var h='<div class="kwh" style="'+gc+'"><span></span>'+ds.map(function(d){var g=ymd(d);return '<button class="kwd'+(g===oggi?" today":"")+'" data-day="'+g+'"><small>'+GC[d.getDay()]+'</small><b>'+d.getDate()+'</b></button>'}).join("")+'</div>';
  var tutto=function(b,d){var s=new Date(b.inizio),f=new Date(b.fine);return s<=sod(d)&&f>=addD(sod(d),1)};
  var ad=ds.map(function(d){return CAL.bl.filter(function(b){return tutto(b,d)})});
  if(ad.some(function(l){return l.length}))h+='<div class="kwa" style="'+gc+'"><span>tutto il giorno</span>'+ad.map(function(l){return '<div>'+l.map(function(b){return '<button class="kev blk bl" data-blk="'+b.id+'">🚫 '+esc(b.motivo||"Non disponibile")+'</button>'}).join("")+'</div>'}).join("")+'</div>';
  h+='<div class="kwb"><div class="kwg" style="'+gc+';height:'+H+'px"><div class="kwt">';
  for(var x=KH0;x<KH1;x++)h+='<span style="top:'+((x-KH0)*KPX)+'px">'+pad(x)+':00</span>';
  h+='</div>';
  ds.forEach(function(d){var g=ymd(d),col='<div class="kwc'+(g===oggi?" today":"")+'" data-day="'+g+'">';
    ORARI.filter(function(o){return o.giorno===d.getDay()}).forEach(function(o){var a=kmin(o.inizio)-KH0*60,b=kmin(o.fine)-KH0*60;col+='<i class="kwo" style="top:'+(a*KPX/60)+'px;height:'+((b-a)*KPX/60)+'px"></i>'});
    var l=CAL.ev.filter(function(a){return ymd(new Date(a.inizio))===g}).map(function(a){var s=new Date(a.inizio),f=new Date(a.fine);return{a:a,s:s.getHours()*60+s.getMinutes(),f:(ymd(f)===g?f.getHours()*60+f.getMinutes():24*60)}})
      .concat(CAL.bl.filter(function(b){return !tutto(b,d)&&new Date(b.inizio)<addD(d,1)&&new Date(b.fine)>d}).map(function(b){var s=new Date(b.inizio),f=new Date(b.fine);return{b:b,s:ymd(s)===g?s.getHours()*60+s.getMinutes():0,f:ymd(f)===g?f.getHours()*60+f.getMinutes():24*60}}))
      .sort(function(x,y){return x.s-y.s||y.f-x.f});
    var cols=[];l.forEach(function(o){if(o.f<=o.s)o.f=o.s+30;var c=0;while(cols[c]&&cols[c]>o.s)c++;cols[c]=o.f;o.c=c});
    l.forEach(function(o){var n=1;l.forEach(function(p){if(p.s<o.f&&p.f>o.s)n=Math.max(n,p.c+1)});o.n=n});
    l.forEach(function(o){var top=Math.max(0,(o.s-KH0*60)*KPX/60),ht=Math.max(20,(o.f-o.s)*KPX/60-2),pos='style="top:'+top+'px;height:'+ht+'px;left:calc('+(o.c*100/o.n)+'% + 2px);width:calc('+(100/o.n)+'% - 4px)"';
      if(o.b){col+='<button class="kev bl'+(ht<40?" sm":"")+'" data-blk="'+o.b.id+'" '+pos+'><small>'+kh(o.s)+" – "+kh(o.f)+'</small><b>🚫 '+esc(o.b.motivo||"Non disponibile")+'</b></button>';return}
      var a=o.a,nome=nomeP(a.paziente),f=famK(a),dim=(CAL.q&&nome.toLowerCase().indexOf(CAL.q)<0)||(flt.length&&flt.indexOf(f)<0);
      col+='<button class="kev '+f+(a.stato==="da_confermare"?" da":"")+(a.presenza==="arrivato"?" pa":a.presenza==="assente"?" pn":"")+(dim?" dim":"")+(ht<40?" sm":"")+'" data-kev="'+a.id+'" data-g="'+g+'" '+pos+' title="'+esc(kh(o.s)+" – "+kh(o.f)+" · "+nome+" · "+(a.tipo||""))+'">'+
        (a.presenza?'<em class="kpb">'+(a.presenza==="arrivato"?"✓":"✕")+'</em>':'')+'<small>'+kh(o.s)+" – "+kh(o.f)+(a.stato==="da_confermare"?" · da confermare":"")+'</small><b>'+esc(nome)+'</b><span>'+esc(a.tipo||"")+'</span></button>'});
    if(g===oggi){var nw=new Date(),m=nw.getHours()*60+nw.getMinutes()-KH0*60;if(m>0&&m<(KH1-KH0)*60)col+='<em class="kwn" style="top:'+(m*KPX/60)+'px"></em>'}
    h+=col+'</div>'});
  h+='</div></div>';$("kWeek").innerHTML=h;
  var bx=$("kWeek").querySelector(".kwb");if(bx&&!CAL.scrolled){bx.scrollTop=(8.5-KH0)*KPX;CAL.scrolled=1}}
/* clic: appuntamento -> scheda; giorno -> vista giorno; spazio vuoto -> nuovo appuntamento */
var DRAG=null;
$("kWeek").addEventListener("click",function(e){if(DRAG&&DRAG.moved)return;
  var ev=e.target.closest("[data-kev]");if(ev)return openApp(ev.dataset.kev);
  var bl=e.target.closest("[data-blk]");if(bl)return ask("Togliere il blocco?","Quegli orari torneranno prenotabili anche dal sito.","Sì, togli",function(){sb.from("blocchi").delete().eq("id",bl.dataset.blk).then(function(r){if(r.error)return err(r.error);toast("Blocco tolto.");loadCal()})});
  var d=e.target.closest(".kwd");if(d){CAL.v="giorno";CAL.d=pd(d.dataset.day);return loadCal()}
  var s=e.target.closest(".kslot");if(s)return knew(s.dataset.g,s.dataset.h);
  var old=$("kWeek").querySelector(".kslot");if(old)old.remove();
  var c=e.target.closest(".kwc");if(!c)return;var r=c.getBoundingClientRect(),mm=KH0*60+Math.floor((e.clientY-r.top)/KPX*4)*15;mm=Math.max(KH0*60,Math.min(KH1*60-30,mm));
  c.insertAdjacentHTML("beforeend",'<button class="kslot" data-g="'+c.dataset.day+'" data-h="'+kh(mm)+'" style="top:'+((mm-KH0*60)*KPX/60)+'px;height:'+(KPX/2-2)+'px">+ '+kh(mm)+' · nuovo appuntamento</button>')});
function knew(g,hh){go("nuovo");$("naData").value=g;$("naOra").value=hh;sedeDay();setTimeout(function(){$("npQ").focus()},150);toast("Giorno e ora inseriti: ora scegli il paziente.")}
/* trascina un appuntamento per spostarlo */
$("kWeek").addEventListener("pointerdown",function(e){var el=e.target.closest("[data-kev]");if(!el||e.button>0)return;var a=CAL.ev.filter(function(x){return x.id===el.dataset.kev})[0];if(!a)return;
  DRAG={el:el,a:a,y0:e.clientY,x0:e.clientX,top0:parseFloat(el.style.top),moved:false,col:el.parentNode,timer:null,ok:e.pointerType==="mouse"};
  if(!DRAG.ok)DRAG.timer=setTimeout(function(){if(DRAG){DRAG.ok=true;el.classList.add("drag");if(navigator.vibrate)navigator.vibrate(10)}},350)});
window.addEventListener("pointermove",function(e){if(!DRAG)return;var dy=e.clientY-DRAG.y0,dx=e.clientX-DRAG.x0;
  if(!DRAG.ok){if(Math.abs(dy)>8||Math.abs(dx)>8){clearTimeout(DRAG.timer);DRAG=null}return}
  if(!DRAG.moved&&Math.abs(dy)<6&&Math.abs(dx)<6)return;e.preventDefault();DRAG.moved=true;DRAG.el.classList.add("drag");
  var snap=KPX/4,nt=Math.max(0,Math.round((DRAG.top0+dy)/snap)*snap);DRAG.el.style.top=nt+"px";
  var under=document.elementsFromPoint(e.clientX,e.clientY).filter(function(x){return x.classList&&x.classList.contains("kwc")})[0];
  if(under&&under!==DRAG.el.parentNode){under.appendChild(DRAG.el)}},{passive:false});
window.addEventListener("pointerup",function(){if(!DRAG)return;clearTimeout(DRAG.timer);var d=DRAG;setTimeout(function(){DRAG=null},0);if(!d.moved){d.el.classList.remove("drag");return}
  var mm=KH0*60+Math.round(parseFloat(d.el.style.top)/KPX*60/15)*15,g=d.el.parentNode.dataset.day;moveAsk(d.a,g,kh(mm))});
function moveAsk(a,g,ora,confl){var s=new Date(a.inizio),dur=Math.round((new Date(a.fine)-s)/60000),o=ORARI.filter(function(x){return x.giorno===pd(g).getDay()})[0],sd=g===ymd(s)?a.sede_id:(o?o.sede_id:a.sede_id);
  if(g===ymd(s)&&ora===hm(s))return kwrender();
  sheet('<h2>Spostare l’appuntamento?</h2><div class="sub"><b>'+esc(nomeP(a.paziente))+'</b> · '+esc(a.tipo||"")+'</div>'+
    '<div class="gmove"><div><small>Prima</small><b>'+dlab(s)+'</b><span>ore '+hm(s)+'</span></div><i>→</i><div class="new"><small>Dopo</small><b>'+dlab(pd(g))+'</b><span>ore '+ora+' – '+kh(kmin(ora)+dur)+'</span></div></div>'+
    '<label>Sede</label><select id="mvS">'+SEDI.map(function(x){return '<option value="'+x.id+'"'+(x.id===sd?" selected":"")+'>'+esc(x.nome)+'</option>'}).join("")+'</select>'+
    (confl?'<div class="hint err">In quell’orario c’è già: '+esc(confl)+'</div>':'')+(a.stato!=="annullato"?ckMail(a.paziente&&a.paziente.email):'')+
    '<div class="acts2"><button class="btn ghost" data-n>Annulla</button><button class="btn" data-y>'+(confl?"Sposta comunque":"Sposta")+'</button></div>',function(box,close){
      var done=false;box.querySelector("[data-n]").onclick=function(){close()};
      box.querySelector("[data-y]").onclick=function(){var ini=new Date(g+"T"+ora),fin=new Date(ini.getTime()+dur*60000);
        var save=function(){done=true;var ck=box.querySelector("#ckMail"),av=ck&&ck.checked;sb.from("appuntamenti").update({inizio:ini.toISOString(),fine:fin.toISOString(),sede_id:box.querySelector("#mvS").value,promemoria_wa:null}).eq("id",a.id).then(function(r){if(r.error)return err(r.error);close();toast("Appuntamento spostato.");loadCal();if(av)mail("spostato",a.id,quandoTxt(s))})};
        if(confl)return save();
        q(sb.from("appuntamenti").select("inizio,paziente:pazienti(nome,cognome)").eq("studio_id",ST.id).neq("stato","annullato").neq("id",a.id).lt("inizio",fin.toISOString()).gt("fine",ini.toISOString())).then(function(L){
          if(!L.length)return save();done=true;close();moveAsk(a,g,ora,L.map(function(x){return hm(new Date(x.inizio))+" "+nomeP(x.paziente)}).join(", "))})};
      var obs=new MutationObserver(function(){if(!document.body.contains(box)){obs.disconnect();if(!done)kwrender()}});obs.observe(document.body,{childList:true})})}

/* blocchi: ore, giorno intero, ferie */
$("cBlock").onclick=function(){var d=ymd(CAL.d||new Date());
  sheet('<h2>Blocca orari / ferie</h2><div class="sub">Gli orari bloccati non si possono prenotare dal sito.</div>'+
    '<div class="seg" style="margin-top:12px" id="bTipo"><button data-t="ore" class="on">Alcune ore</button><button data-t="giorno">Giorno intero</button><button data-t="ferie">Più giorni</button></div>'+
    '<div class="row"><div><label>Dal giorno</label><input type="date" id="bDal" value="'+d+'"></div><div id="bAlBox" hidden><label>Al giorno</label><input type="date" id="bAl" value="'+d+'"></div></div>'+
    '<div class="row keep" id="bOre"><div><label>Dalle</label><input type="time" id="bDalle" value="09:00"></div><div><label>Alle</label><input type="time" id="bAlle" value="13:00"></div></div>'+
    '<label>Motivo (facoltativo)</label><input id="bMot" placeholder="Es. ferie, congresso, impegno">'+
    '<div class="hint" id="bMsg"></div><button class="btn block" id="bOk" style="margin-top:14px">Blocca</button>',function(box,close){
      var tipo="ore";$$("#bTipo button",box).forEach(function(b){b.onclick=function(){tipo=b.dataset.t;$$("#bTipo button",box).forEach(function(x){x.classList.toggle("on",x===b)});
        box.querySelector("#bOre").hidden=tipo!=="ore";box.querySelector("#bAlBox").hidden=tipo!=="ferie"}});
      box.querySelector("#bOk").onclick=function(){var d1=box.querySelector("#bDal").value,d2=tipo==="ferie"?box.querySelector("#bAl").value:d1,m=box.querySelector("#bMsg");
        if(!d1||!d2||d2<d1){m.className="hint err";m.textContent="Controlla le date: il secondo giorno non può essere prima del primo.";return}
        var s,f;if(tipo==="ore"){var h1=box.querySelector("#bDalle").value,h2=box.querySelector("#bAlle").value;if(!h1||!h2||h2<=h1){m.className="hint err";m.textContent="L'ora di fine deve essere dopo quella di inizio.";return}
          s=new Date(d1+"T"+h1);f=new Date(d1+"T"+h2)}else{s=pd(d1);f=addD(pd(d2),1)}
        var mot=box.querySelector("#bMot").value.trim()||(tipo==="ore"?"Non disponibile":"Ferie / giorno libero");
        apps(s,f).then(function(L){var go2=function(){sb.from("blocchi").insert({studio_id:ST.id,inizio:s.toISOString(),fine:f.toISOString(),motivo:mot}).then(function(r){if(r.error)return err(r.error);close();toast("Fatto: orari bloccati.");loadCal()})};
          if(L.length){m.className="hint warn";m.innerHTML="In quel periodo ci sono già "+L.length+" appuntamenti ("+L.slice(0,3).map(function(a){return esc(nomeP(a.paziente))+" "+hm(new Date(a.inizio))}).join(", ")+"). Blocco lo stesso? Gli appuntamenti restano.";
            box.querySelector("#bOk").textContent="Blocca lo stesso";box.querySelector("#bOk").onclick=go2}else go2()})}})};

/* ---------------- dettaglio appuntamento ---------------- */
function openApp(id){q(sb.from("appuntamenti").select("*,paziente:pazienti(*)").eq("id",id).single()).then(function(a){var s=new Date(a.inizio),f=new Date(a.fine),p=a.paziente||{},sd=sede(a.sede_id);
  var st={da_confermare:"Da confermare",confermato:"Confermato",annullato:"Annullato",svolto:"Svolto",assente:"Non presentato"}[a.stato];
  var manca=!(p.cf&&p.indirizzo&&p.cap&&p.citta);
  sheet('<h2>'+esc(nomeP(p))+'</h2><span class="pill">'+esc(a.tipo||"")+'</span>'+(a.stato==="da_confermare"?'<span class="pill o">da confermare</span>':'')+(a.presenza?'<span class="pill '+(a.presenza==="arrivato"?"g":"")+'">'+a.presenza+'</span>':'')+
    '<div class="kv"><span>Quando</span><b style="text-transform:capitalize">'+dlab(s)+', '+hm(s)+'–'+hm(f)+'</b><span>Dove</span><div>'+esc(sd?sd.nome+(sd.struttura?" · "+sd.struttura:""):"")+'</div><span>Stato</span><div>'+st+'</div>'+
    (p.telefono?'<span>Telefono</span><div>'+esc(p.telefono)+'</div>':'')+(p.email?'<span>Email</span><div>'+esc(p.email)+'</div>':'')+(a.note?'<span>Note</span><div>'+esc(a.note)+'</div>':'')+
    '<span>Dati fattura</span><div>'+(manca?'<span class="hint warn" style="margin:0">mancano CF o residenza</span>':'completi ✓')+'</div></div>'+
    (a.stato!=="annullato"?'<div class="seg" id="pres"><button data-p="">In attesa</button><button data-p="arrivato">✓ Arrivato</button><button data-p="assente">✕ Assente</button></div>':'')+
    '<div class="acts2">'+(p.telefono?'<a class="btn ghost small" data-rem="'+a.id+'" href="'+esc(waRem(Object.assign({},a,{paziente:p})))+'" target="_blank" rel="noopener">💬 Promemoria WhatsApp</a><a class="btn ghost small" href="'+telHref(p.telefono)+'">📞 Chiama</a>':'')+
    (manca&&p.telefono?'<a class="btn ghost small" target="_blank" rel="noopener" href="https://wa.me/'+waNum(p.telefono)+'?text='+encodeURIComponent("Ciao "+(p.nome||"")+", per la fattura mi servono codice fiscale e indirizzo di residenza: puoi inserirli qui, in modo sicuro? "+schedaLink(a)+" Grazie! 🌿")+'">🧾 Chiedi i dati per la fattura</a>':'')+
    (p.email&&a.stato!=="annullato"&&s>new Date()?'<button class="btn ghost small" data-mail="promemoria">✉️ Promemoria mail</button>':'')+
    (manca&&p.email&&a.stato!=="annullato"?'<button class="btn ghost small" data-mail="scheda">🧾 Chiedi i dati per mail</button>':'')+
    (a.stato==="da_confermare"?'<button class="btn green small" data-s="confermato">✓ Conferma</button>':'')+
    (a.stato!=="annullato"?'<button class="btn ghost small" data-edit>✎ Modifica o sposta</button><button class="btn ghost small" data-s="annullato">Annulla appuntamento</button>':'')+
    (p.id?'<button class="btn ghost small" data-pz="'+p.id+'">Scheda paziente</button>':'')+'</div>',function(box,close){
      $$("#pres button",box).forEach(function(b){b.classList.toggle("on",(a.presenza||"")===b.dataset.p);b.onclick=function(){var v=b.dataset.p||null;
        sb.from("appuntamenti").update({presenza:v}).eq("id",a.id).then(function(r){if(r.error)return err(r.error);$$("#pres button",box).forEach(function(x){x.classList.toggle("on",x===b)});toast(v?"Segnato: "+v+".":"Presenza tolta.");refresh()})}});
      box.addEventListener("click",function(e){var b=e.target.closest("[data-s]");if(b){var v=b.dataset.s;
          if(v==="annullato")ask("Annullare l'appuntamento?","L'orario tornerà libero anche sul sito.","Sì, annulla",function(m){close();setStato(a.id,v,"Appuntamento annullato.",refresh,m)},ckMail(p.email));
          else ask("Confermare l'appuntamento?","","Sì, conferma",function(m){close();setStato(a.id,v,"Appuntamento confermato.",refresh,m)},ckMail(p.email,"Manda la mail di conferma"))}
        if(e.target.closest("[data-mail]")){var t=e.target.closest("[data-mail]").dataset.mail;ask(t==="promemoria"?"Mandare il promemoria per mail?":"Chiedere i dati per la fattura per mail?","A "+p.email,"Sì, manda",function(){mail(t,a.id)})}
        if(e.target.closest("[data-edit]")){close();editApp(a)}
        if(e.target.closest("[data-pz]"))close()})})}).catch(err)}
function editApp(a){var s=new Date(a.inizio),dur=Math.round((new Date(a.fine)-s)/60000);
  sheet('<h2>Modifica appuntamento</h2><div class="sub">'+esc(nomeP(a.paziente))+'</div>'+
    '<label>Tipo di visita</label><select id="eTipo">'+PRES.map(function(p){return '<option value="'+p.id+'"'+(p.id===a.prestazione_id?" selected":"")+'>'+esc(p.nome)+'</option>'}).join("")+'</select>'+
    '<div class="row keep"><div><label>Giorno</label><input type="date" id="eData" value="'+ymd(s)+'"></div><div><label>Ora</label><input type="time" id="eOra" step="300" value="'+hm(s)+'"></div></div>'+
    '<div class="row keep"><div><label>Sede</label><select id="eSede">'+SEDI.map(function(x){return '<option value="'+x.id+'"'+(x.id===a.sede_id?" selected":"")+'>'+esc(x.nome)+'</option>'}).join("")+'</select></div><div><label>Durata</label><select id="eDur">'+durOpts(dur)+'</select></div></div>'+
    '<label>Note</label><textarea id="eNote">'+esc(a.note||"")+'</textarea>'+(a.stato!=="annullato"?ckMail(a.paziente&&a.paziente.email,"Se cambiano giorno o ora, avvisa il paziente per mail"):'')+'<div class="hint" id="eMsg"></div><button class="btn block" id="eOk" style="margin-top:14px">Salva</button>',function(box,close){
      box.querySelector("#eTipo").onchange=function(){var p=PRES.filter(function(x){return x.id===this.value},this)[0];if(p){var sel=box.querySelector("#eDur");if(!$$("option",sel).some(function(o){return +o.value===p.durata_min}))sel.add(new Option(durLab(p.durata_min),p.durata_min));sel.value=String(p.durata_min)}};
      var forza=false;box.querySelector("#eOk").onclick=function(){var ini=new Date(box.querySelector("#eData").value+"T"+box.querySelector("#eOra").value),fin=new Date(ini.getTime()+(+box.querySelector("#eDur").value)*60000),m=box.querySelector("#eMsg");
        if(isNaN(ini))return toast("Scegli giorno e ora.");var p=PRES.filter(function(x){return x.id===box.querySelector("#eTipo").value})[0];
        var save=function(){sb.from("appuntamenti").update({inizio:ini.toISOString(),fine:fin.toISOString(),sede_id:box.querySelector("#eSede").value,prestazione_id:p.id,tipo:p.nome,note:box.querySelector("#eNote").value.trim()||null,promemoria_wa:null}).eq("id",a.id)
          .then(function(r){if(r.error)return err(r.error);var ck=box.querySelector("#ckMail");close();toast("Appuntamento aggiornato.");if(VIEW==="cal"){CAL.d=sod(ini)}refresh();if(ck&&ck.checked&&ini.getTime()!==s.getTime())mail("spostato",a.id,quandoTxt(s))})};
        if(forza)return save();
        q(sb.from("appuntamenti").select("inizio,paziente:pazienti(nome,cognome)").eq("studio_id",ST.id).neq("stato","annullato").neq("id",a.id).lt("inizio",fin.toISOString()).gt("fine",ini.toISOString())).then(function(L){
          if(!L.length)return save();forza=true;m.className="hint warn";m.textContent="In quell'orario c'è già "+L.map(function(x){return nomeP(x.paziente)+" alle "+hm(new Date(x.inizio))}).join(", ")+". Premi di nuovo per salvare lo stesso.";box.querySelector("#eOk").textContent="Salva lo stesso"})}})}
function durOpts(sel){var d=[20,30,40,45,60,90,100,120];if(d.indexOf(sel)<0)d.push(sel);d.sort(function(x,y){return x-y});return d.map(function(m){return '<option value="'+m+'"'+(m===sel?" selected":"")+'>'+durLab(m)+'</option>'}).join("")}

/* ---------------- nuovo appuntamento ---------------- */
function fillForm(){$("naTipo").innerHTML=PRES.filter(function(p){return p.attiva}).map(function(p){return '<option value="'+p.id+'">'+esc(p.nome)+' · '+p.durata_min+' min</option>'}).join("");
  $("naSede").innerHTML=SEDI.map(function(s){return '<option value="'+s.id+'">'+esc(s.nome)+'</option>'}).join("");$("naDur").innerHTML=durOpts(60)}
function resetNew(){NP=null;$("npChosen").hidden=true;$("npSearch").hidden=false;$("npForm").hidden=true;$("npQ").value="";$("npList").hidden=true;["npN","npC","npT","npE"].forEach(function(i){$(i).value=""});
  $("naData").value=ymd(addD(new Date(),1));$("naOra").value="09:00";$("naNote").value="";$("naHint").textContent="";tipoDur();sedeDay()}
function tipoDur(){var p=PRES.filter(function(x){return x.id===$("naTipo").value})[0];if(!p)return;$("naDur").innerHTML=durOpts(p.durata_min);check()}
function sedeDay(){var v=$("naData").value;if(!v)return;var o=ORARI.filter(function(x){return x.giorno===pd(v).getDay()})[0];if(o)$("naSede").value=o.sede_id;check()}
$("naTipo").onchange=tipoDur;$("naData").onchange=sedeDay;$("naOra").onchange=check;$("naDur").onchange=check;
var chkT=null;function check(){clearTimeout(chkT);chkT=setTimeout(function(){var r=rangeNew();if(!r)return;
  Promise.all([q(sb.from("appuntamenti").select("inizio,paziente:pazienti(nome,cognome)").eq("studio_id",ST.id).neq("stato","annullato").lt("inizio",r[1].toISOString()).gt("fine",r[0].toISOString())),blocchi(r[0],r[1])]).then(function(x){
    var L=x[0],B=x[1],dentro=ORARI.some(function(o){return o.giorno===r[0].getDay()&&hm(r[0])>=o.inizio.slice(0,5)&&hm(r[1])<=o.fine.slice(0,5)});
    if(L.length){$("naHint").className="hint err";$("naHint").textContent="Attenzione: in quell'orario c'è già "+nomeP(L[0].paziente)+" alle "+hm(new Date(L[0].inizio))+"."}
    else if(B.length){$("naHint").className="hint warn";$("naHint").textContent="Attenzione: quell'orario è bloccato ("+(B[0].motivo||"non disponibile")+")."}
    else if(!dentro){$("naHint").className="hint warn";$("naHint").textContent="Orario libero, ma fuori dagli orari di ricevimento."}
    else{$("naHint").className="hint ok";$("naHint").textContent="Orario libero."}})},250)}
function rangeNew(){var d=$("naData").value,t=$("naOra").value;if(!d||!t)return null;var s=new Date(d+"T"+t);return[s,new Date(s.getTime()+(+$("naDur").value)*60000)]}
var npT=null;$("npQ").oninput=function(){clearTimeout(npT);var s=this.value.trim();if(s.length<2){$("npList").hidden=true;return}npT=setTimeout(function(){cerca(s).then(function(L){
  $("npList").hidden=false;$("npList").innerHTML=L.length?L.map(function(p){return '<button data-p="'+p.id+'"><b>'+esc(nomeP(p))+'</b> <span class="muted">'+esc(p.telefono||"")+'</span></button>'}).join(""):'<div class="empty" style="padding:10px 12px">Nessun paziente trovato.</div>';
  $("npList").onclick=function(e){var b=e.target.closest("[data-p]");if(!b)return;choose(L.filter(function(p){return p.id===b.dataset.p})[0])}})},200)};
function choose(p){NP=p;$("npSearch").hidden=true;$("npChosen").hidden=false;$("npNome").textContent=nomeP(p);$("npAv").textContent=ini(p)}
$("npChange").onclick=function(){NP=null;$("npChosen").hidden=true;$("npSearch").hidden=false};
$("npNew").onclick=function(){$("npForm").hidden=!$("npForm").hidden;if(!$("npForm").hidden)$("npN").focus()};
$("naSave").onclick=function(){var r=rangeNew();if(!r)return toast("Scegli giorno e ora.");var b=this;
  var pr=NP?Promise.resolve(NP):(function(){var n=$("npN").value.trim(),t=$("npT").value.trim();if(!n||!t){toast("Scegli un paziente o inserisci nome e cellulare.");return Promise.reject()}
    return q(sb.from("pazienti").insert({studio_id:ST.id,nome:n,cognome:$("npC").value.trim()||null,telefono:t.replace(/[^\d+]/g,""),email:$("npE").value.trim().toLowerCase()||null}).select().single())})();
  b.disabled=true;pr.then(function(p){var pres=PRES.filter(function(x){return x.id===$("naTipo").value})[0];
    return q(sb.from("appuntamenti").insert({studio_id:ST.id,paziente_id:p.id,sede_id:$("naSede").value,prestazione_id:pres.id,tipo:pres.nome,inizio:r[0].toISOString(),fine:r[1].toISOString(),stato:"confermato",origine:"agenda",note:$("naNote").value.trim()||null}))})
  .then(function(){b.disabled=false;toast("Appuntamento aggiunto.");CAL.d=sod(r[0]);go("cal")},function(e){b.disabled=false;if(e)err(e)})};

/* ---------------- pazienti ---------------- */
var pT=null,SEL={};$("pQ").oninput=function(){clearTimeout(pT);pT=setTimeout(loadPaz,200)};
function loadPaz(){var s=$("pQ").value.trim();var req=s.length>=2?cerca(s):q(sb.from("pazienti").select("id,nome,cognome,telefono,email").eq("studio_id",ST.id).order("cognome").order("nome").limit(500));
  req.then(function(L){$("lPaz").innerHTML=L.length?L.map(function(p){return '<div class="prow'+(SEL[p.id]?" sel":"")+'" data-pz="'+p.id+'"><span class="ck"></span><div class="av">'+esc(ini(p))+'</div><div class="chi"><b>'+esc(nomeP(p))+'</b><br><small>'+esc(p.telefono||"")+(p.email?' · '+esc(p.email):'')+'</small></div>'+
    (p.telefono?'<a class="icb" href="https://wa.me/'+waNum(p.telefono)+'" target="_blank" rel="noopener" aria-label="WhatsApp">'+WA+'</a>':'')+'</div>'}).join(""):'<div class="empty">'+(s?"Nessun paziente trovato.":"La rubrica è vuota: i pazienti si aggiungono da soli quando prenotano dal sito, oppure con + Paziente.")+'</div>';
    $("lPaz").dataset.ids=L.map(function(p){return p.id}).join(",");if(PZ){$$("#lPaz .prow").forEach(function(r){r.classList.toggle("on",r.dataset.pz===PZ)});if(!$("pDet").querySelector(".phead"))openPaz(PZ)}}).catch(err)}
$("pSel").onclick=function(){SEL={};$("lPaz").classList.add("selmode");$("pSelBar").hidden=false;selN()};
$("pSelEnd").onclick=function(){SEL={};$("lPaz").classList.remove("selmode");$("pSelBar").hidden=true;$$("#lPaz .prow").forEach(function(r){r.classList.remove("sel")})};
$("pSelAll").onclick=function(){($("lPaz").dataset.ids||"").split(",").filter(Boolean).forEach(function(i){SEL[i]=1});$$("#lPaz .prow").forEach(function(r){r.classList.add("sel")});selN()};
function selN(){$("pSelN").textContent=Object.keys(SEL).length+" selezionati"}
$("lPaz").addEventListener("click",function(e){if(!$("lPaz").classList.contains("selmode"))return;var r=e.target.closest("[data-pz]");if(!r||e.target.closest("a"))return;e.stopPropagation();var id=r.dataset.pz;if(SEL[id])delete SEL[id];else SEL[id]=1;r.classList.toggle("sel",!!SEL[id]);selN()},true);
$("pSelDel").onclick=function(){var ids=Object.keys(SEL);if(!ids.length)return toast("Seleziona almeno un paziente.");
  ask("Eliminare "+ids.length+" pazient"+(ids.length===1?"e":"i")+"?","Vengono cancellate anche le loro misurazioni. Gli appuntamenti e gli incassi restano, senza il nome collegato. Non si può annullare.","Sì, elimina",function(){
    sb.from("pazienti").delete().in("id",ids).then(function(r){if(r.error)return err(r.error);toast("Eliminati.");$("pSelEnd").click();loadPaz()})})};
$("pAdd").onclick=function(){pazForm({},function(){loadPaz()})};
function pazFields(p){return '<div class="row"><div><label>Nome *</label><input data-f="nome" value="'+esc(p.nome||"")+'"></div><div><label>Cognome</label><input data-f="cognome" value="'+esc(p.cognome||"")+'"></div></div>'+
  '<div class="row"><div><label>Cellulare</label><input data-f="telefono" type="tel" value="'+esc(p.telefono||"")+'"></div><div><label>Email</label><input data-f="email" type="email" value="'+esc(p.email||"")+'"></div></div>'+
  '<div class="row"><div><label>Codice fiscale</label><input data-f="cf" value="'+esc(p.cf||"")+'" style="text-transform:uppercase"></div><div><label>Data di nascita</label><input data-f="nascita" type="date" value="'+esc(p.nascita||"")+'"></div></div>'+
  '<label>Indirizzo di residenza</label><input data-f="indirizzo" value="'+esc(p.indirizzo||"")+'">'+
  '<div class="row3"><div><label>Città</label><input data-f="citta" value="'+esc(p.citta||"")+'"></div><div><label>CAP</label><input data-f="cap" inputmode="numeric" value="'+esc(p.cap||"")+'"></div><div><label>Prov.</label><input data-f="prov" maxlength="2" value="'+esc(p.prov||"")+'" style="text-transform:uppercase"></div></div>'+
  '<label>Note</label><textarea data-f="note">'+esc(p.note||"")+'</textarea>'}
function readPaz(box){var u={};$$("[data-f]",box).forEach(function(i){var v=i.value.trim();if(i.dataset.f==="telefono")v=v.replace(/[^\d+]/g,"");if(i.dataset.f==="email")v=v.toLowerCase();u[i.dataset.f]=v===""?null:(i.dataset.f==="cf"||i.dataset.f==="prov"?v.toUpperCase():v)});return u}
function pazForm(p,done){sheet('<h2>'+(p.id?"Modifica paziente":"Nuovo paziente")+'</h2>'+pazFields(p)+'<div class="hint" id="pfMsg"></div><button class="btn block" data-save style="margin-top:14px">Salva</button>',function(box,close){
  box.querySelector("[data-save]").onclick=function(){var u=readPaz(box),m=box.querySelector("#pfMsg");if(!u.nome){m.className="hint err";m.textContent="Il nome è obbligatorio.";return}
    if(u.cf&&!cfOk(u.cf)){m.className="hint err";m.textContent="Il codice fiscale non sembra corretto.";return}
    var r=p.id?sb.from("pazienti").update(u).eq("id",p.id):sb.from("pazienti").insert(Object.assign({studio_id:ST.id},u));
    r.then(function(x){if(x.error)return err(x.error);toast("Paziente salvato.");close();done&&done()})}})}
var MK=[["peso","Peso","kg"],["altezza","Altezza","cm"],["bmi","BMI",""],["vita","Vita","cm"],["fianchi","Fianchi","cm"],["massa_grassa","Massa grassa","%"],["massa_magra","Massa magra","kg"],["massa_muscolare","Massa muscolare","kg"],["acqua","Acqua corporea","%"],["grasso_viscerale","Grasso viscerale",""],["metabolismo","Metabolismo basale","kcal"]];
function bmiTxt(b){b=+b;if(!b)return"";return b<18.5?"sottopeso":b<25?"normopeso":b<30?"sovrappeso":"obesità"}
function nf(v){return v==null||v===""?"–":String(Math.round(v*10)/10).replace(".",",")}
var PZ=null,PK="peso";
function openPaz(id){PZ=id;if(VIEW!=="paz"){go("paz");return}
  $$("#lPaz .prow").forEach(function(r){r.classList.toggle("on",r.dataset.pz===id)});
  document.querySelector('[data-view="paz"]').classList.add("pdmode");
  $("pDet").innerHTML='<div class="card glass"><span class="spin"></span></div>';
  Promise.all([q(sb.from("pazienti").select("*").eq("id",id).single()),q(sb.from("appuntamenti").select("*").eq("paziente_id",id).order("inizio",{ascending:false}).limit(50)),
    q(sb.from("misurazioni").select("*").eq("paziente_id",id).order("data").order("creato")),q(sb.from("incassi").select("*").eq("paziente_id",id).order("data",{ascending:false}))]).then(function(rs){
    if(PZ!==id)return;renderPaz(rs[0],rs[1],rs[2],rs[3])}).catch(err)}
function renderPaz(p,A,M,I){var D=$("pDet");
  function last(k){for(var i=M.length-1;i>=0;i--)if(M[i][k]!=null)return M[i][k];return null}
  function first(k){for(var i=0;i<M.length;i++)if(M[i][k]!=null)return M[i][k];return null}
  var pw=last("peso"),pw0=first("peso"),dv=pw!=null&&pw0!=null&&M.length>1?Math.round((pw-pw0)*10)/10:null,b=last("bmi"),g=last("massa_grassa");
  var av=MK.filter(function(k){return M.some(function(m){return m[k[0]]!=null})}),met=av.filter(function(k){return k[0]!=="altezza"});
  if(met.length&&!met.some(function(k){return k[0]===PK}))PK=met[0][0];
  var passati=A.filter(function(a){return a.stato!=="annullato"&&new Date(a.inizio)<new Date()}),ult=passati[0],pros=A.filter(function(a){return a.stato!=="annullato"&&new Date(a.inizio)>=new Date()}).reverse();
  var addr=p.indirizzo?p.indirizzo+(p.citta?", "+(p.cap?p.cap+" ":"")+p.citta+(p.prov?" ("+p.prov+")":""):""):"";
  D.innerHTML='<button class="btn ghost small pback" data-pback>‹ Pazienti</button>'+
    '<div class="card glass phead"><div class="av">'+esc(ini(p))+'</div><div class="pinfo"><h2 style="margin:0">'+esc(nomeP(p))+'</h2>'+
      [p.telefono,p.email,p.cf?"C.F. "+p.cf:"",addr,p.nascita?"Nato/a il "+dmy(p.nascita):"",ult?"Ultima visita: "+dmy(ult.inizio)+" · "+(ult.tipo||""):"",pros[0]?"Prossima: "+dmy(pros[0].inizio)+" alle "+hm(new Date(pros[0].inizio)):""].filter(Boolean).map(function(x){return '<small>'+esc(x)+'</small>'}).join("")+
      (p.note?'<small>📝 '+esc(p.note)+'</small>':'')+'</div>'+
      '<div class="pacts">'+(p.telefono?'<a class="icb" href="'+telHref(p.telefono)+'" title="Chiama">'+TEL+'</a><a class="icb" href="https://wa.me/'+waNum(p.telefono)+'" target="_blank" rel="noopener" title="WhatsApp">'+WA+'</a>':'')+'<button class="icb" data-pedit title="Modifica dati">✎</button></div></div>'+
    '<div class="kpis"><div class="kpi glass red" style="cursor:default"><small>Peso attuale</small><b>'+(pw!=null?nf(pw)+" kg":"–")+'</b><span>'+(M.length?"al "+dmy(M[M.length-1].data):"")+'</span></div>'+
      '<div class="kpi glass green" style="cursor:default"><small>Variazione peso</small><b>'+(dv!=null?(dv>0?"+":"")+nf(dv)+" kg":"–")+'</b><span>'+(M.length>1?"dal "+dmy(M[0].data):"")+'</span></div>'+
      '<div class="kpi glass" style="cursor:default"><small>BMI</small><b>'+nf(b)+'</b><span>'+bmiTxt(b)+'</span></div>'+
      '<div class="kpi glass orange" style="cursor:default"><small>Massa grassa</small><b>'+(g!=null?nf(g)+" %":"–")+'</b><span></span></div></div>'+
    '<div class="card glass"><div class="chead"><h2>Andamento</h2><div class="seg" id="pMet">'+met.map(function(k){return '<button data-k="'+k[0]+'"'+(k[0]===PK?' class="on"':'')+'>'+k[1]+'</button>'}).join("")+'</div></div>'+
      '<div id="pChart">'+(M.length?chartSvg(M,PK):'<div class="empty">Ancora nessuna misurazione: aggiungi la prima qui sotto e il grafico si disegna da solo.</div>')+'</div>'+
      (M.length?'<div class="acts2"><button class="btn ghost small" data-mpdf>📄 Report PDF</button>'+(p.email?'<button class="btn ghost small" data-mmail>✉️ Manda il report per mail</button>':'')+'</div>':'')+'</div>'+
    '<div class="card glass"><h2>Nuova misurazione</h2><div class="mform"><div><label>Data</label><input type="date" id="mData" value="'+ymd(new Date())+'"></div>'+
      MK.map(function(k){var v=k[0]==="altezza"?last("altezza"):null;return '<div><label>'+k[1]+(k[2]?" ("+k[2]+")":"")+'</label><input id="m_'+k[0]+'" inputmode="decimal" autocomplete="off"'+(v!=null?' value="'+v+'"':'')+(k[0]==="bmi"?' placeholder="si calcola da solo"':'')+'></div>'}).join("")+
      '</div><label>Note</label><input id="mNote" autocomplete="off"><button class="btn" id="mSave" style="margin-top:14px">Salva misurazione</button></div>'+
    '<div class="card glass"><h2>Storico misurazioni</h2>'+(M.length?'<div class="scroll"><table class="mtab"><tr><th>Data</th>'+av.map(function(k){return '<th>'+k[1]+(k[2]?'<small>'+k[2]+'</small>':'')+'</th>'}).join("")+'<th>Note</th><th></th></tr>'+
      M.slice().reverse().map(function(m){return '<tr><td>'+dmy(m.data)+'</td>'+av.map(function(k){return '<td>'+nf(m[k[0]])+'</td>'}).join("")+'<td class="mn">'+esc(m.note||"")+'</td><td><button class="x" data-mdel="'+m.id+'" title="Elimina">✕</button></td></tr>'}).join("")+'</table></div>':'<div class="empty">Nessuna misurazione registrata.</div>')+'</div>'+
    '<div class="card glass"><div class="chead"><h2>Appuntamenti</h2><button class="btn small" data-pnew>+ Nuovo</button></div>'+(A.length?A.map(function(a){var s=new Date(a.inizio);return '<div class="app-row'+(a.stato==="annullato"?" ann":"")+(a.stato==="da_confermare"?" da":"")+'" style="--c:'+fam(a)+'" data-app="'+a.id+'"><div class="ora">'+pad(s.getDate())+'/'+pad(s.getMonth()+1)+'</div><div class="chi"><b>'+esc(a.tipo||"")+'</b><small>'+s.getFullYear()+' · '+hm(s)+' · '+esc(sedeNome(a.sede_id))+(a.stato==="annullato"?" · annullato":"")+(a.presenza?" · "+a.presenza:"")+'</small></div></div>'}).join(""):'<div class="empty">Nessun appuntamento.</div>')+'</div>'+
    '<div class="card glass"><h2>Pagamenti</h2>'+(I.length?I.map(function(x){return '<div class="irow"><div class="chi"><b>'+dmy(x.data)+' · '+esc(x.descrizione||"")+'</b><small>'+esc(x.metodo)+(x.fattura_num?' · fattura '+esc(x.fattura_num):' · fattura da emettere')+'</small></div><div class="imp">'+eur(x.importo)+'</div></div>'}).join(""):'<div class="empty">Nessun pagamento registrato.</div>')+'</div>'+
    '<div class="acts2"><button class="btn ghost small" data-pdel>Elimina paziente</button></div>';
  function reload(){openPaz(p.id)}
  $$("#pMet button",D).forEach(function(b){b.onclick=function(){PK=b.dataset.k;$$("#pMet button",D).forEach(function(x){x.classList.toggle("on",x===b)});$("pChart").innerHTML=chartSvg(M,PK)}});
  D.querySelector("#mSave").onclick=function(){var o={studio_id:ST.id,paziente_id:p.id,data:$("mData").value,note:$("mNote").value.trim()||null},any=false;
    MK.forEach(function(k){var v=num($("m_"+k[0]).value);o[k[0]]=v;if(v!=null&&k[0]!=="altezza")any=true});
    if(o.bmi==null&&o.peso&&o.altezza)o.bmi=Math.round(o.peso/Math.pow(o.altezza/100,2)*10)/10;if(o.metabolismo!=null)o.metabolismo=Math.round(o.metabolismo);
    if(!any)return toast("Inserisci almeno una misura.");if(!o.data)return toast("Scegli la data.");
    sb.from("misurazioni").insert(o).then(function(r){if(r.error)return err(r.error);toast("Misurazione salvata.");reload()})};
  D.onclick=function(e){var x=e.target.closest("[data-mdel]");if(x)ask("Eliminare questa misurazione?","Non si può annullare.","Sì, elimina",function(){sb.from("misurazioni").delete().eq("id",x.dataset.mdel).then(function(r){if(r.error)return err(r.error);reload()})});
    if(e.target.closest("[data-mpdf]"))misReport(p,M);
    if(e.target.closest("[data-mmail]"))mailDoc("misure",p.id,p.email,misHtml(p,M),"Misurazioni "+nomeP(p));
    if(e.target.closest("[data-pedit]"))pazForm(p,function(){reload();loadPaz()});
    if(e.target.closest("[data-pback]")){PZ=null;document.querySelector('[data-view="paz"]').classList.remove("pdmode");$$("#lPaz .prow").forEach(function(r){r.classList.remove("on")});window.scrollTo(0,0)}
    if(e.target.closest("[data-pnew]")){go("nuovo");choose(p)}
    if(e.target.closest("[data-pdel]"))ask("Eliminare "+nomeP(p)+"?","Vengono cancellate anche le misurazioni. Gli appuntamenti e gli incassi restano. Non si può annullare.","Sì, elimina",function(){
      sb.from("pazienti").delete().eq("id",p.id).then(function(r){if(r.error)return err(r.error);toast("Paziente eliminato.");PZ=null;D.innerHTML="";document.querySelector('[data-view="paz"]').classList.remove("pdmode");loadPaz()})})};
  if(window.innerWidth<900)window.scrollTo(0,0)}
function chartSvg(M,k){var u=(MK.filter(function(x){return x[0]===k})[0]||[])[2]||"",pts=M.filter(function(m){return m[k]!=null});
  if(!pts.length)return '<div class="empty">Nessun valore per questa misura.</div>';
  var W=640,H=230,L=44,R=30,T=24,Bm=34,vals=pts.map(function(m){return +m[k]}),mn=Math.min.apply(0,vals),mx=Math.max.apply(0,vals),pad2=(mx-mn)*.15||1;mn-=pad2;mx+=pad2;
  var x=function(i){return pts.length===1?(L+W-R)/2:L+i*(W-L-R)/(pts.length-1)},y=function(v){return T+(mx-v)*(H-T-Bm)/(mx-mn)};
  var grid="";for(var gI=0;gI<=3;gI++){var gv=mn+(mx-mn)*gI/3,gy=y(gv);grid+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+gy+'" y2="'+gy+'" stroke="rgba(120,120,128,.18)"/><text x="'+(L-6)+'" y="'+(gy+4)+'" text-anchor="end">'+nf(gv)+'</text>'}
  var d=pts.map(function(m,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(+m[k]).toFixed(1)}).join(" "),area=pts.length>1?d+" L"+x(pts.length-1)+" "+(H-Bm)+" L"+x(0)+" "+(H-Bm)+" Z":"";
  var step=Math.ceil(pts.length/8);
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'"><defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#B62432" stop-opacity=".22"/><stop offset="1" stop-color="#B62432" stop-opacity="0"/></linearGradient></defs>'+grid+
    (area?'<path d="'+area+'" fill="url(#cg)"/>':'')+'<path d="'+d+'" fill="none" stroke="#B62432" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'+
    pts.map(function(m,i){return '<circle cx="'+x(i)+'" cy="'+y(+m[k])+'" r="4.5" fill="#fff" stroke="#B62432" stroke-width="2.5"/><text x="'+x(i)+'" y="'+(y(+m[k])-10)+'" text-anchor="middle" style="font-weight:700;fill:#B62432">'+nf(m[k])+'</text>'+(i%step===0||i===pts.length-1?'<text x="'+x(i)+'" y="'+(H-12)+'" text-anchor="middle">'+dmy(m.data).slice(0,5)+'/'+String(m.data).slice(2,4)+'</text>':'')}).join("")+
    (u?'<text x="'+L+'" y="12" text-anchor="start">'+u+'</text>':'')+'</svg>'}
function misReport(p,M){$("print").innerHTML=misHtml(p,M);window.print()}
function misHtml(p,M){var f=M[0],l=M[M.length-1],X=ST.fiscale||{};
  var LB={vita:"Circonferenza vita",fianchi:"Circonferenza fianchi"},lab=function(k){return LB[k[0]]||k[1]};
  var ks=MK.filter(function(k){return k[0]!=="altezza"&&M.some(function(m){return m[k[0]]!=null})});
  var lastV=function(k){for(var i=M.length-1;i>=0;i--)if(M[i][k]!=null)return M[i][k];return null},firstV=function(k){for(var i=0;i<M.length;i++)if(M[i][k]!=null)return M[i][k];return null};
  var nm=function(v){return v==null?"–":(Math.round(v*10)/10).toLocaleString("it-IT",{maximumFractionDigits:1,useGrouping:Math.abs(v)>=10000})};
  var addr=p.indirizzo?p.indirizzo+(p.citta?", "+(p.cap?p.cap+" ":"")+p.citta+(p.prov?" ("+p.prov+")":""):""):"";
  var wa=ST.whatsapp||X.tel||"",sito=(ST.sito||"www.nutrizionistaiacone.it").replace(/^https?:\/\//,"").replace(/\/$/,"");
  var head=function(dx){return '<div class="rhd"><img src="/img/logo-i.svg" alt=""><div class="rbr"><b>'+esc(ST.nome||"Ilaria Iacone")+'</b><span>'+esc(ST.professione||X.qualifica||"")+'</span></div><div class="rdx">'+dx+'</div></div>'};
  var cell=function(t,v){return '<div><small>'+t+'</small><div>'+esc(v||"–")+'</div></div>'};
  var tiles=ks.map(function(k){var a=firstV(k[0]),b=lastV(k[0]),d=a!=null&&b!=null&&M.length>1?Math.round((b-a)*10)/10:null;
    return '<div class="rtile"><small>'+lab(k)+'</small><b>'+nm(b)+(k[2]?'<i>'+k[2]+'</i>':'')+'</b><span>'+(d==null?"&nbsp;":(d>0?"+":d<0?"-":"±")+nm(Math.abs(d))+(k[2]?" "+k[2]:"")+" dalla prima visita")+'</span></div>'}).join("");
  var charts=M.length>1?ks.map(function(k){return '<div class="rcard"><b>'+lab(k)+(k[2]?" ("+k[2]+")":"")+'</b>'+miniChart(M,k[0])+'</div>'}).join(""):"";
  var th=ks.map(function(k){return '<th>'+({vita:"Circ.<br>vita",fianchi:"Circ.<br>fianchi"}[k[0]]||lab(k).replace(/ /g,"<br>"))+(k[2]?'<small>'+k[2]+'</small>':'')+'</th>'}).join("");
  var rows=M.slice().reverse().map(function(m,i){return '<tr'+(i===0?' class="last"':'')+'><td class="d">'+dmy(m.data)+(i===0?'<small>ULTIMA</small>':'')+'</td>'+ks.map(function(k){return '<td>'+(m[k[0]]==null?"":nm(m[k[0]]))+'</td>'}).join("")+'<td class="n">'+esc(m.note||"")+'</td></tr>'}).join("");
  return '<div class="rep"><div class="rp">'+head('Riepilogo al <b>'+dmy(l.data)+'</b>')+
    '<span class="rtag">I TUOI PROGRESSI</span><h1 class="rt">Le misurazioni di <em>'+esc(nomeP(p))+'</em></h1>'+
    '<div class="rinfo">'+cell("Paziente",nomeP(p))+cell("Codice fiscale",p.cf)+cell("Telefono",p.telefono)+cell("Indirizzo",addr)+cell("Email",p.email)+cell("Visite",M.length+(M.length>1?" · dal "+dmy(f.data)+" al "+dmy(l.data):" · "+dmy(f.data)))+'</div>'+
    '<h2 class="rs">Ultima misurazione <em>· '+dmy(l.data)+'</em></h2><div class="rtiles">'+tiles+'</div>'+
    (charts?'<h2 class="rs">Il tuo andamento <em>· visita dopo visita</em></h2><div class="rcharts">'+charts+'</div>':'')+'</div>'+
    '<div class="html2pdf__page-break"></div>'+
    '<div class="rp">'+head('Pagina 2 · Storico completo')+'<span class="rtag">STORICO</span><h1 class="rt">Tutte le <em>misurazioni</em></h1>'+
    '<table class="rtab"><thead><tr><th>Data</th>'+th+'<th>Note</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div class="rft">'+esc([sito,wa?"WhatsApp "+wa:"","Documento riservato al paziente"].filter(Boolean).join("  ·  "))+'</div></div></div>'}
function miniChart(M,k){var pts=M.filter(function(m){return m[k]!=null});if(!pts.length)return "";
  var W=300,H=136,L=44,R=14,T=14,B=38,v=pts.map(function(m){return +m[k]}),mn=Math.min.apply(0,v),mx=Math.max.apply(0,v);
  var span=(mx-mn)||Math.abs(mx)*.1||1,raw=span*1.2,mag=Math.pow(10,Math.floor(Math.log10(raw))),st=[1,2,2.5,5,10].map(function(s){return s*mag}).filter(function(s){return s>=raw/2})[0]||mag*10;
  var lo=Math.floor((mn-span*.6)/st)*st,hi=Math.ceil((mx+span*.6)/st)*st;if(lo<0&&mn>=0)lo=0;if(hi===lo)hi=lo+st;
  var x=function(i){return pts.length===1?(L+W-R)/2:L+8+i*(W-L-R-16)/(pts.length-1)},y=function(z){return T+(hi-z)*(H-T-B)/(hi-lo)};
  var fm=function(z){return (Math.round(z*10)/10).toLocaleString("it-IT")};
  var g='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(hi)+'" y2="'+y(hi)+'" stroke="#e3e3e6"/><line x1="'+L+'" x2="'+(W-R)+'" y1="'+y((hi+lo)/2)+'" y2="'+y((hi+lo)/2)+'" stroke="#efeff1"/><line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(lo)+'" y2="'+y(lo)+'" stroke="#bdbdc2"/>'+
    '<text x="'+(L-6)+'" y="'+(y(hi)+4)+'" text-anchor="end">'+fm(hi)+'</text><text x="'+(L-6)+'" y="'+(y(lo)+4)+'" text-anchor="end">'+fm(lo)+'</text>';
  var d=pts.map(function(m,i){return(i?"L":"M")+x(i).toFixed(1)+" "+y(+m[k]).toFixed(1)}).join(" ");
  var step=Math.ceil(pts.length/8);
  return '<svg class="mch" viewBox="0 0 '+W+' '+H+'" font-family="Inter,Helvetica,Arial,sans-serif" font-size="12" fill="#555">'+g+'<path d="'+d+'" fill="none" stroke="#B62432" stroke-width="2.6" stroke-linejoin="round"/>'+
    pts.map(function(m,i){var s=String(m.data);return '<circle cx="'+x(i)+'" cy="'+y(+m[k])+'" r="5.5" fill="#B62432"/>'+(i%step===0||i===pts.length-1?'<text x="'+x(i)+'" y="'+(H-B+17+(i%2?14:0))+'" text-anchor="middle">'+s.slice(8,10)+'/'+s.slice(5,7)+'</text>':'')}).join("")+'</svg>'}

/* ---------------- lista d'attesa ---------------- */
var LIBERI=[];
function loadAttesa(){sb.rpc("slot_liberi",{p_slug:ST.slug,p_durata:30}).then(function(r){LIBERI=[];var g=(r.data||{}).giorni||{};Object.keys(g).sort().forEach(function(d){g[d].forEach(function(x){if(LIBERI.length<12)LIBERI.push({giorno:d,ora:x.ora,sede:x.sede})})});
    $("wLiberi").innerHTML=LIBERI.length?LIBERI.map(function(x){return '<span class="chip">'+GC[pd(x.giorno).getDay()]+' '+pd(x.giorno).getDate()+' · '+x.ora+'<small>'+esc(x.sede)+'</small></span>'}).join(""):'<div class="empty">Nessun posto libero nelle prossime settimane.</div>';renderAttesa()});
  q(sb.from("lista_attesa").select("*,paziente:pazienti(nome,cognome,telefono)").eq("studio_id",ST.id).order("creato")).then(function(L){ATT=L;renderAttesa()}).catch(err)}
var ATT=null;
function renderAttesa(){if(!ATT)return;var f=LIBERI[0];
  $("lAttesa").innerHTML=ATT.length?ATT.map(function(w){var nome=w.paziente?nomeP(w.paziente):w.nome,tel=(w.paziente&&w.paziente.telefono)||w.telefono;
    var txt="Ciao "+String(nome||"").split(" ")[0]+", sono "+ST.nome+". Si è liberato un posto"+(f?" "+dlab(pd(f.giorno))+" alle "+f.ora+(f.sede?" a "+f.sede:""):" in agenda")+": ti andrebbe bene? Fammi sapere e te lo tengo. 🌿";
    return '<div class="irow"><div class="chi"><b>'+esc(nome)+'</b><small>'+esc([w.preferenze,w.sede,w.note].filter(Boolean).join(" · "))+' · in lista dal '+dmy(w.creato)+'</small></div>'+
      (tel?'<a class="icb" href="'+telHref(tel)+'">'+TEL+'</a><a class="icb" target="_blank" rel="noopener" href="https://wa.me/'+waNum(tel)+'?text='+encodeURIComponent(txt)+'" title="Proponi il primo posto libero">'+WA+'</a>':'')+
      '<button class="x" data-wdel="'+w.id+'" aria-label="Togli dalla lista">✕</button></div>'}).join(""):'<div class="empty">Nessuno in lista d’attesa.</div>'}
$("lAttesa").addEventListener("click",function(e){var x=e.target.closest("[data-wdel]");if(!x)return;ask("Togliere dalla lista d'attesa?","","Sì, togli",function(){sb.from("lista_attesa").delete().eq("id",x.dataset.wdel).then(function(r){if(r.error)return err(r.error);loadAttesa()})})});
$("wAdd").onclick=function(){var chosen=null;sheet('<h2>Aggiungi alla lista d’attesa</h2><div class="search"><input id="waQ" placeholder="Cerca paziente in rubrica (facoltativo)"></div><div class="list-pick" id="waL" hidden></div>'+
  '<div class="row"><div><label>Nome e cognome *</label><input id="waN"></div><div><label>Telefono</label><input id="waT" type="tel"></div></div>'+
  '<div class="row"><div><label>Preferenze</label><input id="waP" placeholder="Es. martedì pomeriggio"></div><div><label>Sede</label><select id="waS"><option value="">Qualsiasi</option>'+SEDI.map(function(s){return '<option>'+esc(s.nome)+'</option>'}).join("")+'</select></div></div>'+
  '<label>Note</label><input id="waNo"><button class="btn block" id="waOk" style="margin-top:14px">Aggiungi</button>',function(box,close){var t=null;
    box.querySelector("#waQ").oninput=function(){clearTimeout(t);var s=this.value.trim(),L=box.querySelector("#waL");if(s.length<2){L.hidden=true;return}t=setTimeout(function(){cerca(s).then(function(P){L.hidden=false;
      L.innerHTML=P.map(function(p){return '<button data-p="'+p.id+'">'+esc(nomeP(p))+' <span class="muted">'+esc(p.telefono||"")+'</span></button>'}).join("")||'<div class="empty" style="padding:10px">Nessuno trovato.</div>';
      L.onclick=function(e){var b=e.target.closest("[data-p]");if(!b)return;chosen=P.filter(function(p){return p.id===b.dataset.p})[0];box.querySelector("#waN").value=nomeP(chosen);box.querySelector("#waT").value=chosen.telefono||"";L.hidden=true}})},200)};
    box.querySelector("#waOk").onclick=function(){var n=box.querySelector("#waN").value.trim();if(!n)return toast("Inserisci nome e cognome.");
      sb.from("lista_attesa").insert({studio_id:ST.id,paziente_id:chosen?chosen.id:null,nome:n,telefono:box.querySelector("#waT").value.replace(/[^\d+]/g,"")||null,preferenze:box.querySelector("#waP").value.trim()||null,sede:box.querySelector("#waS").value||null,note:box.querySelector("#waNo").value.trim()||null})
      .then(function(r){if(r.error)return err(r.error);close();toast("Aggiunto alla lista d'attesa.");loadAttesa()})}})};

/* ---------------- incassi ---------------- */
function loadInc(){if(!$("iMese").value){var d=new Date();$("iMese").value=d.getFullYear()+"-"+pad(d.getMonth()+1)}var m=$("iMese").value,da=m+"-01",p=m.split("-"),a=ymd(new Date(+p[0],+p[1],1));
  q(sb.from("incassi").select("*").eq("studio_id",ST.id).gte("data",da).lt("data",a).order("data",{ascending:false}).order("creato",{ascending:false})).then(function(L){var t=0,pos=0;L.forEach(function(x){t+=+x.importo;if(x.metodo==="POS")pos+=+x.importo});
    $("iTot").textContent=eur(t);$("iPos").textContent=eur(pos);$("iAltro").textContent=eur(t-pos);
    $("lInc").innerHTML=L.length?L.map(function(x){return '<div class="irow"><div class="chi"><b>'+esc(x.nome||"—")+'</b><small>'+dmy(x.data)+' · '+esc(x.descrizione||"")+' · '+esc(x.metodo)+(x.bollo?" · bollo":"")+(x.fattura_num?' · fattura '+esc(x.fattura_num):'')+'</small></div><div class="imp">'+eur(x.importo)+'</div><button class="x" data-idel="'+x.id+'" aria-label="Elimina">✕</button></div>'}).join(""):'<div class="empty">Nessun incasso in questo mese.</div>'}).catch(err);
  var o=sod(new Date());apps(o,addD(o,1)).then(function(L){L=L.filter(function(x){return x.paziente});$("iOggiCard").hidden=!L.length;
    $("iOggi").innerHTML=L.map(function(x){return '<button class="chip" data-ia="'+x.id+'">'+hm(new Date(x.inizio))+' · '+esc(nomeP(x.paziente))+'</button>'}).join("");$("iOggi").onclick=function(e){var b=e.target.closest("[data-ia]");if(b)incForm(L.filter(function(x){return x.id===b.dataset.ia})[0])}})}
$("iMese").onchange=loadInc;$("iAdd").onclick=function(){incForm(null)};
$("lInc").addEventListener("click",function(e){var x=e.target.closest("[data-idel]");if(!x)return;ask("Eliminare l'incasso?","Non si può annullare.","Sì, elimina",function(){sb.from("incassi").delete().eq("id",x.dataset.idel).then(function(r){if(r.error)return err(r.error);toast("Incasso eliminato.");loadInc()})})});
function incForm(app){var P=app&&app.paziente?app.paziente:null,pres=app?presOf(app):null;
  sheet('<h2>Registra un incasso</h2>'+(P?'<div class="chosen"><div class="av">'+esc(ini(P))+'</div><b>'+esc(nomeP(P))+'</b></div>':'<div class="search"><input id="iQ" placeholder="Cerca paziente in rubrica"></div><div class="list-pick" id="iL" hidden></div><label>Nome e cognome *</label><input id="iN">')+
    '<div class="row keep"><div><label>Data</label><input type="date" id="iD" value="'+ymd(new Date())+'"></div><div><label>Importo (€) *</label><input id="iI" inputmode="decimal" value="'+(pres&&pres.prezzo?pres.prezzo:"")+'"></div></div>'+
    '<label>Prestazione</label><select id="iV"><option value="">—</option>'+PRES.map(function(p){return '<option value="'+esc(p.nome)+'" data-pr="'+(p.prezzo||"")+'"'+(pres&&pres.id===p.id?" selected":"")+'>'+esc(p.nome)+(p.prezzo?" · "+eur(p.prezzo):"")+'</option>'}).join("")+'</select>'+
    '<label>Metodo di pagamento</label><div class="chips" id="iM">'+METODI.map(function(m,i){return '<button class="chip'+(i?"":" on")+'" data-m="'+m+'">'+m+'</button>'}).join("")+'</div>'+
    '<label class="ck" style="margin-top:14px"><input type="checkbox" id="iTS"> Il paziente si oppone all’invio dei dati al Sistema Tessera Sanitaria</label>'+
    '<label>Note</label><input id="iNo"><div class="hint" id="iMsg"></div><button class="btn block" id="iOk" style="margin-top:14px">Salva incasso</button>',function(box,close){
      var met="POS",paz=P,t=null;
      $$("#iM .chip",box).forEach(function(b){b.onclick=function(){met=b.dataset.m;$$("#iM .chip",box).forEach(function(x){x.classList.toggle("on",x===b)})}});
      box.querySelector("#iV").onchange=function(){var o=this.selectedOptions[0];if(o&&o.dataset.pr)box.querySelector("#iI").value=o.dataset.pr};
      var iq=box.querySelector("#iQ");if(iq)iq.oninput=function(){clearTimeout(t);var s=this.value.trim(),L=box.querySelector("#iL");if(s.length<2){L.hidden=true;return}t=setTimeout(function(){cerca(s).then(function(R){L.hidden=false;
        L.innerHTML=R.map(function(p){return '<button data-p="'+p.id+'">'+esc(nomeP(p))+' <span class="muted">'+esc(p.telefono||"")+'</span></button>'}).join("")||'<div class="empty" style="padding:10px">Nessuno trovato.</div>';
        L.onclick=function(e){var b=e.target.closest("[data-p]");if(!b)return;paz=R.filter(function(p){return p.id===b.dataset.p})[0];box.querySelector("#iN").value=nomeP(paz);L.hidden=true}})},200)};
      box.querySelector("#iOk").onclick=function(){var imp=num(box.querySelector("#iI").value),nome=P?nomeP(P):box.querySelector("#iN").value.trim(),m=box.querySelector("#iMsg");
        if(!nome){m.className="hint err";m.textContent="Scegli o scrivi il nome del paziente.";return}if(!(imp>0)){m.className="hint err";m.textContent="Inserisci l'importo.";return}
        var o={studio_id:ST.id,paziente_id:paz?paz.id:null,appuntamento_id:app?app.id:null,data:box.querySelector("#iD").value,importo:imp,metodo:met,descrizione:box.querySelector("#iV").value||null,
          nome:nome,cf:paz&&paz.cf||null,indirizzo:paz&&paz.indirizzo||null,cap:paz&&paz.cap||null,citta:paz&&paz.citta||null,prov:paz&&paz.prov||null,telefono:paz&&paz.telefono||null,email:paz&&paz.email||null,
          bollo:imp>(+ST.soglia_bollo||77.47),opposizione_ts:box.querySelector("#iTS").checked,note:box.querySelector("#iNo").value.trim()||null};
        sb.from("incassi").insert(o).then(function(r){if(r.error)return err(r.error);close();
          var manca=!(o.cf&&o.indirizzo&&o.cap&&o.citta);toast(manca?"Incasso salvato. Mancano CF o residenza per la fattura: chiedili dalla scheda dell'appuntamento.":"Incasso salvato.");if(VIEW==="inc")loadInc();else if(VIEW==="home")loadHome()})}})}

/* ---------------- statistiche ---------------- */
function loadStat(){sb.rpc("statistiche",{p_studio:ST.id}).then(function(r){if(r.error)return err(r.error);var S=r.data,M=S.mesi||[];
  function bars(k,cls,fmt){var mx=Math.max.apply(0,M.map(function(m){return +m[k]||0}))||1;return '<div class="bars '+(cls||"")+'">'+M.map(function(m){var v=+m[k]||0;return '<div><b>'+(fmt?fmt(v):v)+'</b><i style="height:'+Math.max(3,v/mx*100)+'%"></i><small>'+MESI[+m.mese.slice(5)-1].slice(0,3)+'</small></div>'}).join("")+'</div>'}
  function hb(o){var k=Object.keys(o||{}).sort(function(a,b){return o[b]-o[a]}),mx=Math.max.apply(0,k.map(function(x){return o[x]}))||1;return k.length?k.map(function(x){return '<div class="hb"><span>'+esc(x)+'</span><i style="width:'+(o[x]/mx*100)+'%"></i><b>'+o[x]+'</b></div>'}).join(""):'<div class="empty">Nessun dato questo mese.</div>'}
  var c=M[M.length-1]||{},tot=c.arrivati+c.assenti;
  $("stBox").innerHTML='<div class="kpis"><div class="kpi glass red"><small>Visite questo mese</small><b>'+(c.visite||0)+'</b></div><div class="kpi glass"><small>Prime visite</small><b>'+(c.prime||0)+'</b></div><div class="kpi glass green"><small>Nuovi pazienti</small><b>'+(c.nuovi||0)+'</b></div><div class="kpi glass orange"><small>Assenze</small><b>'+(tot?Math.round(c.assenti/tot*100)+"%":"–")+'</b><span>'+(c.assenti||0)+' su '+(tot||0)+' segnati</span></div></div>'+
    '<div class="stgrid"><div class="card glass"><h2>Visite</h2>'+bars("visite")+'</div><div class="card glass"><h2>Incassi</h2>'+bars("inc","g",function(v){return v?Math.round(v)+"€":"0"})+'</div>'+
    '<div class="card glass"><h2>Nuovi pazienti</h2>'+bars("nuovi","g")+'</div><div class="card glass"><h2>Prime visite</h2>'+bars("prime")+'</div>'+
    '<div class="card glass"><h2>Tipi di visita (questo mese)</h2>'+hb(S.tipi)+'</div><div class="card glass"><h2>Sedi (questo mese)</h2>'+hb(S.sedi)+'</div></div>'})}

/* ---------------- fatture ---------------- */
var FM="da";$$("#fMode button").forEach(function(b){b.onclick=function(){FM=b.dataset.f;$$("#fMode button").forEach(function(x){x.classList.toggle("on",x===b)});loadFatt()}});
function fisc(){return ST.fiscale||{}}
function studioOk(){var s=fisc();return !!(s.piva&&s.indirizzo&&s.citta)}
function loadFatt(){var B=$("fBox");B.innerHTML='<div class="card glass"><span class="spin"></span></div>';
  if(FM==="da"){var lim=ymd(addD(new Date(),-120));
    q(sb.from("incassi").select("*,paziente:pazienti(cf,indirizzo,cap,citta,prov,email,telefono)").eq("studio_id",ST.id).gte("data",lim).order("data",{ascending:false})).then(function(L){
      L.forEach(function(x){var p=x.paziente||{};["cf","indirizzo","cap","citta","prov","email","telefono"].forEach(function(k){if(!x[k]&&p[k])x[k]=p[k]})});
      var da=L.filter(function(x){return !x.fattura_num}),fatte=L.filter(function(x){return x.fattura_num}).slice(0,15);
      B.innerHTML='<div class="kpis k3"><div class="kpi glass orange"><small>Da emettere</small><b>'+da.length+'</b><span>'+eur(da.reduce(function(s,x){return s+ +x.importo},0))+'</span></div><div class="kpi glass green"><small>Emesse</small><b>'+L.filter(function(x){return x.fattura_num}).length+'</b><span>ultimi 4 mesi</span></div><div class="kpi glass"><small>Di cui POS</small><b>'+da.filter(function(x){return x.metodo==="POS"}).length+'</b><span>da emettere</span></div></div>'+
        '<div class="card glass"><h2>Da emettere</h2>'+(da.length?da.map(fRow).join(""):'<div class="empty">Nessuna fattura da emettere. 🎉</div>')+'</div>'+
        (fatte.length?'<div class="card glass"><h2>Emesse di recente</h2>'+fatte.map(fRow).join("")+'</div>':'');
      B.onclick=function(e){var b=e.target.closest("[data-fi]");if(!b)return;var x=L.filter(function(i){return i.id===b.dataset.fi})[0];
        if(b.dataset.act==="crea")fattForm(x);if(b.dataset.act==="segna")segnaForm(x);if(b.dataset.act==="togli")ask("Segnare come non ancora emessa?","","Sì",function(){sb.from("incassi").update({fattura_num:null}).eq("id",x.id).then(function(r){if(r.error)return err(r.error);loadFatt()})});
        if(b.dataset.act==="copia"){navigator.clipboard&&navigator.clipboard.writeText(b.dataset.txt).then(function(){toast("Copiato.")})}}}).catch(err)}
  if(FM==="emesse"){var anno=new Date().getFullYear();q(sb.from("fatture").select("*").eq("studio_id",ST.id).order("anno",{ascending:false}).order("numero",{ascending:false})).then(function(L){
    var anni={};anni[anno]=1;L.forEach(function(f){anni[f.anno]=1});var sel=+($("fAnno")&&$("fAnno").value)||anno,LL=L.filter(function(f){return f.anno===sel}),ult=LL[0];
    B.innerHTML='<div class="card glass"><div class="hrow"><h2>Fatture '+sel+'</h2><select id="fAnno" class="mpick">'+Object.keys(anni).sort().reverse().map(function(a){return '<option'+(+a===sel?" selected":"")+'>'+a+'</option>'}).join("")+'</select></div>'+
      (own()?'<button class="btn block" data-new style="margin-bottom:10px">+ Nuova fattura</button>':'')+
      (LL.length?LL.map(function(f){return '<div class="irow"><div class="chi"><b>n. '+f.numero+'/'+f.anno+' · '+esc(f.nome)+'</b><small>'+dmy(f.data)+' · '+esc(f.metodo)+(f.bollo>0?" · bollo "+eur(f.bollo):"")+'</small></div><div class="imp">'+eur(+f.importo+ +f.bollo)+'</div><button class="btn ghost small" data-pdf="'+f.id+'">PDF</button>'+(f.email?'<button class="btn ghost small" data-fmail="'+f.id+'" title="'+esc(f.email)+'">'+(f.inviata?"✓ Inviata":"✉️ Invia")+'</button>':'')+(own()&&ult&&ult.id===f.id?'<button class="x" data-fdel="'+f.id+'" aria-label="Elimina">✕</button>':'')+'</div>'}).join(""):'<div class="empty">Nessuna fattura in questo anno.</div>')+'</div>';
    $("fAnno").onchange=loadFatt;
    B.onclick=function(e){var p=e.target.closest("[data-pdf]");if(p)fattPdf(L.filter(function(f){return f.id===p.dataset.pdf})[0]);
      var fm=e.target.closest("[data-fmail]");if(fm){var ff=L.filter(function(f){return f.id===fm.dataset.fmail})[0];mailDoc("fattura",ff.id,ff.email,fattHtml(ff),"Fattura "+ff.numero+"-"+ff.anno+" "+ff.nome)}if(e.target.closest("[data-new]"))fattForm(null);
      var d=e.target.closest("[data-fdel]");if(d)ask("Eliminare l'ultima fattura?","Si può eliminare solo l'ultima, per non lasciare buchi nella numerazione.","Sì, elimina",function(){var f=L.filter(function(x){return x.id===d.dataset.fdel})[0];
        sb.from("fatture").delete().eq("id",f.id).then(function(r){if(r.error)return err(r.error);if(f.incasso_id)sb.from("incassi").update({fattura_num:null}).eq("id",f.incasso_id).then(function(){});toast("Fattura eliminata.");loadFatt()})})}}).catch(err)}
  if(FM==="studio"){var s=fisc(),F=[["nome","Nome e titolo"],["qualifica","Qualifica"],["indirizzo","Indirizzo dello studio"],["citta","Città"],["cap","CAP"],["prov","Provincia"],["piva","Partita IVA"],["cf","Codice fiscale"],["albo","Iscrizione all'albo"],["tel","Telefono"],["email","Email"],["iban","IBAN"]];
    B.innerHTML='<div class="card glass"><h2>Dati dello studio</h2><div class="sub">Compaiono in ogni fattura. '+(studioOk()?"":'<b class="hint err">Servono almeno partita IVA, indirizzo e città.</b>')+'</div><div class="row">'+F.map(function(f){return '<div><label>'+f[1]+'</label><input data-s="'+f[0]+'" value="'+esc(s[f[0]]||"")+'"></div>'}).join("")+'</div>'+
      '<label>Nota fiscale 1</label><textarea data-s="nota1">'+esc(s.nota1||"")+'</textarea><label>Nota fiscale 2</label><textarea data-s="nota2">'+esc(s.nota2||"")+'</textarea><button class="btn block" id="sSave" style="margin-top:14px">Salva</button></div>';
    $("sSave").onclick=function(){var o={};$$("[data-s]",B).forEach(function(i){o[i.dataset.s]=i.value.trim()});o.piva=o.piva.replace(/\s/g,"");o.cf=o.cf.toUpperCase().replace(/\s/g,"");o.iban=o.iban.toUpperCase().replace(/\s/g,"");o.prov=o.prov.toUpperCase();
      sb.from("studi").update({fiscale:o}).eq("id",ST.id).then(function(r){if(r.error)return err(r.error);ST.fiscale=o;toast("Dati dello studio salvati.");loadFatt()})}}}
function fRow(x){var dati=[x.nome,x.cf,[x.indirizzo,[x.cap,x.citta,x.prov?"("+x.prov+")":""].filter(Boolean).join(" ")].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  var manca=!(x.cf&&x.indirizzo&&x.citta);
  return '<div class="irow" style="align-items:flex-start"><div class="chi"><b>'+esc(x.nome||"—")+'</b><small>'+dmy(x.data)+' · '+esc(x.descrizione||"")+' · '+esc(x.metodo)+(x.bollo?" · marca da bollo 2 €":"")+(x.opposizione_ts?" · opposizione TS":"")+'</small>'+
    '<div class="sub" style="font-size:.82rem">'+esc(x.cf||"CF mancante")+' · '+esc(x.indirizzo?[x.indirizzo,x.cap,x.citta,x.prov].filter(Boolean).join(" "):"residenza mancante")+(x.email?" · "+esc(x.email):"")+'<button class="copy" data-fi="'+x.id+'" data-act="copia" data-txt="'+esc(dati)+'">copia dati</button></div>'+
    (x.fattura_num?'<span class="pill g">fattura '+esc(x.fattura_num)+'</span>':manca?'<span class="pill o">mancano dati</span>':'')+'</div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><div class="imp">'+eur(x.importo)+'</div>'+
    (x.fattura_num?'<button class="btn ghost small" data-fi="'+x.id+'" data-act="togli">Annulla segno</button>':(own()?'<button class="btn small" data-fi="'+x.id+'" data-act="crea">Crea fattura</button>':'')+'<button class="btn ghost small" data-fi="'+x.id+'" data-act="segna">Segna emessa</button>')+'</div></div>'}
function segnaForm(x){sheet('<h2>Segna la fattura come emessa</h2><div class="sub">'+esc(x.nome)+' · '+eur(x.importo)+' · '+dmy(x.data)+'</div><label>Numero della fattura (facoltativo)</label><input id="sgN" placeholder="Es. 12/2026"><button class="btn block" id="sgOk" style="margin-top:14px">Segna emessa</button>',function(box,close){
  box.querySelector("#sgOk").onclick=function(){sb.from("incassi").update({fattura_num:box.querySelector("#sgN").value.trim()||"Emessa"}).eq("id",x.id).then(function(r){if(r.error)return err(r.error);close();toast("Segnata come emessa.");loadFatt()})}})}
function fattForm(x){if(!studioOk()){toast("Prima completa i dati dello studio (partita IVA, indirizzo e città).");FM="studio";$$("#fMode button").forEach(function(b){b.classList.toggle("on",b.dataset.f==="studio")});return loadFatt()}
  var anno=new Date().getFullYear();q(sb.from("fatture").select("numero").eq("studio_id",ST.id).eq("anno",anno).order("numero",{ascending:false}).limit(1)).then(function(L){var next=(L[0]?L[0].numero:0)+1;x=x||{};
    sheet('<h2>Nuova fattura</h2><div class="row keep"><div><label>Numero</label><input id="fN" inputmode="numeric" value="'+next+'"></div><div><label>Data</label><input type="date" id="fD" value="'+ymd(new Date())+'"></div></div>'+
      '<label>Nome e cognome *</label><input id="fNo" value="'+esc(x.nome||"")+'"><div class="row"><div><label>Codice fiscale</label><input id="fCf" value="'+esc(x.cf||"")+'" style="text-transform:uppercase"></div><div><label>Email</label><input id="fE" value="'+esc(x.email||"")+'"></div></div>'+
      '<label>Indirizzo</label><input id="fI" value="'+esc(x.indirizzo||"")+'"><div class="row3"><div><label>Città</label><input id="fC" value="'+esc(x.citta||"")+'"></div><div><label>CAP</label><input id="fCap" value="'+esc(x.cap||"")+'"></div><div><label>Prov.</label><input id="fP" maxlength="2" value="'+esc(x.prov||"")+'"></div></div>'+
      '<label>Descrizione</label><input id="fDe" value="'+esc(x.descrizione?"Prestazione professionale: "+x.descrizione:"Prestazione professionale di consulenza nutrizionale")+'">'+
      '<div class="row keep"><div><label>Importo (€) *</label><input id="fIm" inputmode="decimal" value="'+(x.importo||"")+'"></div><div><label>Metodo</label><select id="fM">'+METODI.map(function(m){return '<option'+(m===(x.metodo||"POS")?" selected":"")+'>'+m+'</option>'}).join("")+'</select></div></div>'+
      '<label class="ck" style="margin-top:12px"><input type="checkbox" id="fB" checked> Marca da bollo da 2 € (sopra '+eur(ST.soglia_bollo||77.47)+')</label><label class="ck"><input type="checkbox" id="fTs"'+(x.opposizione_ts?" checked":"")+'> Opposizione all’invio al Sistema Tessera Sanitaria</label>'+
      '<div class="hint" id="fMsg"></div><button class="btn block" id="fOk" style="margin-top:14px">Crea fattura</button>',function(box,close){
        box.querySelector("#fOk").onclick=function(){var v=function(i){return box.querySelector(i).value.trim()},imp=num(v("#fIm")),cf=v("#fCf").toUpperCase(),m=box.querySelector("#fMsg"),n=parseInt(v("#fN"),10),d=v("#fD");
          if(!v("#fNo")){m.className="hint err";m.textContent="Scrivi il nome del paziente.";return}if(!(imp>0)){m.className="hint err";m.textContent="Inserisci l'importo.";return}
          if(cf&&!cfOk(cf)){m.className="hint err";m.textContent="Il codice fiscale non sembra corretto.";return}if(!(n>0)||!d){m.className="hint err";m.textContent="Controlla numero e data.";return}
          var f={studio_id:ST.id,numero:n,anno:+d.slice(0,4),data:d,paziente_id:x.paziente_id||null,incasso_id:x.id||null,nome:v("#fNo"),cf:cf||null,indirizzo:v("#fI")||null,cap:v("#fCap")||null,citta:v("#fC")||null,prov:v("#fP").toUpperCase()||null,email:v("#fE")||null,
            descrizione:v("#fDe")||"Prestazione professionale di consulenza nutrizionale",importo:imp,bollo:imp>(+ST.soglia_bollo||77.47)&&box.querySelector("#fB").checked?2:0,metodo:v("#fM"),opposizione_ts:box.querySelector("#fTs").checked};
          sb.from("fatture").insert(f).select().single().then(function(r){if(r.error){if(/duplicate|unique/i.test(r.error.message)){m.className="hint err";m.textContent="La fattura n. "+n+"/"+f.anno+" esiste già.";return}return err(r.error)}
            if(x.id)sb.from("incassi").update({fattura_num:n+"/"+f.anno}).eq("id",x.id).then(function(){});close();toast("Fattura n. "+n+"/"+f.anno+" creata.");fattPdf(r.data);loadFatt()})}})})}
function fattPdf(f){$("print").innerHTML=fattHtml(f);window.print()}
function fattHtml(f){var s=fisc(),tot=+f.importo+ +f.bollo;
  return '<div class="doc"><div class="hd"><div><h1>'+esc(s.nome||ST.nome)+'</h1><div>'+esc(s.qualifica||"")+'</div><small>'+esc([s.indirizzo,[s.cap,s.citta,s.prov?"("+s.prov+")":""].filter(Boolean).join(" ")].filter(Boolean).join(", "))+'<br>P. IVA '+esc(s.piva||"")+(s.cf?' · C.F. '+esc(s.cf):'')+(s.albo?'<br>'+esc(s.albo):'')+'<br>'+esc([s.tel,s.email].filter(Boolean).join(" · "))+'</small></div>'+
    '<div style="text-align:right"><h1 style="font-size:16pt;color:#111">Fattura n. '+f.numero+'/'+f.anno+'</h1><div>del '+dmy(f.data)+'</div></div></div>'+
    '<div><small>Spett.le</small><br><b>'+esc(f.nome)+'</b><br>'+esc([f.indirizzo,[f.cap,f.citta,f.prov?"("+f.prov+")":""].filter(Boolean).join(" ")].filter(Boolean).join(", "))+(f.cf?'<br>C.F. '+esc(f.cf):'')+'</div>'+
    '<table><tr><th>Descrizione</th><th class="r">Importo</th></tr><tr><td>'+esc(f.descrizione)+'</td><td class="r">'+eur(f.importo)+'</td></tr>'+(f.bollo>0?'<tr><td>Imposta di bollo assolta sull’originale</td><td class="r">'+eur(f.bollo)+'</td></tr>':'')+'<tr class="tot"><td>Totale</td><td class="r">'+eur(tot)+'</td></tr></table>'+
    '<div>Pagamento: '+esc(f.metodo)+(f.metodo==="Bonifico"&&s.iban?" · IBAN "+esc(s.iban):"")+'</div>'+(f.opposizione_ts?'<div><small>Il paziente si è opposto alla trasmissione dei dati al Sistema Tessera Sanitaria.</small></div>':'')+
    '<div class="note">'+esc(s.nota1||"")+'<br>'+esc(s.nota2||"")+'</div></div>'}
/* PDF vero (non la stampa) da allegare alla mail */
var H2P=null;function h2p(){return H2P||(H2P=new Promise(function(ok,ko){var sc=document.createElement("script");sc.src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";sc.onload=function(){ok(window.html2pdf)};sc.onerror=function(){H2P=null;ko(new Error("Non riesco a preparare il PDF: controlla la connessione."))};document.head.appendChild(sc)}))}
function toPng(src,w,h){return new Promise(function(ok){var im=new Image();im.onload=function(){var c=document.createElement("canvas");c.width=Math.round(w*3);c.height=Math.round(h*3);var x=c.getContext("2d");x.scale(3,3);x.drawImage(im,0,0,w,h);try{ok(c.toDataURL("image/png"))}catch(e){ok(null)}};im.onerror=function(){ok(null)};im.src=src})}
function rast(el){var J=[].map.call(el.querySelectorAll("svg"),function(sv){var r=sv.getBoundingClientRect(),c=sv.cloneNode(true);c.setAttribute("xmlns","http://www.w3.org/2000/svg");c.setAttribute("width",r.width);c.setAttribute("height",r.height);
    return toPng("data:image/svg+xml;charset=utf-8,"+encodeURIComponent(new XMLSerializer().serializeToString(c)),r.width,r.height).then(function(u){if(!u)return;var im=document.createElement("img");im.src=u;im.style.cssText="display:block;width:"+r.width+"px;height:"+r.height+"px";sv.parentNode.replaceChild(im,sv)})})
  .concat([].map.call(el.querySelectorAll('img[src$=".svg"]'),function(im){var r=im.getBoundingClientRect();return toPng(im.src,r.width,r.height).then(function(u){if(u)im.src=u})}));
  return Promise.all(J).then(function(){return new Promise(function(ok){setTimeout(ok,60)})})}
function pdfB64(html){return h2p().then(function(h){return (document.fonts&&document.fonts.ready||Promise.resolve()).then(function(){return h})}).then(function(h){var el=document.createElement("div");el.className="pdfbox";el.innerHTML=html;document.body.appendChild(el);
  return rast(el).then(function(){return h().set({margin:[12,12,12,12],image:{type:"jpeg",quality:.95},html2canvas:{scale:2,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"],avoid:["tr",".rcard",".rtile",".rinfo","h3"]}}).from(el.firstChild).outputPdf("datauristring")
    .then(function(u){el.remove();return u.split(",")[1]},function(e){el.remove();throw e})})})}
function mailDoc(tipo,id,email,html,file){ask(tipo==="misure"?"Mandare il report per mail?":"Mandare la fattura per mail?","A "+email+", con il PDF allegato.","Sì, manda",function(){toast("Preparo il PDF…");
  pdfB64(html).then(function(b64){return sb.functions.invoke("mail",{body:{tipo:tipo,id:id,pdf:b64,file:file}})}).then(function(r){
    if(r.error||!r.data||!r.data.ok)return toast("Attenzione: la mail non è partita.");toast("Mail con il PDF inviata ✉️");if(tipo==="fattura"&&FM==="emesse")loadFatt()}).catch(function(e){toast(e&&e.message?e.message:"Attenzione: la mail non è partita.")})})}
})();
