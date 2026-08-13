const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)],uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2),fmt=n=>Number(n).toLocaleString("de-DE",{maximumFractionDigits:2}),esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const {cleanIngredientName,normalizeUnit:normUnit,normalizeAmount:norm,canonicalIngredient:canon,aggregateIngredients,calculatePurchase}=CCShopping;
let S={r:[],d:[],e:[],x:[],shop:[]},editR=null,editD=null,editE=null;
async function db(){return new Promise((a,b)=>{let q=indexedDB.open("CC",1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains("s"))q.result.createObjectStore("s")};q.onsuccess=()=>a(q.result);q.onerror=()=>b(q.error)})}
function normalizeShopKey(key){
  const parts=String(key||"").split("|");
  if(parts.length<4)return"";
  const amount=Number(String(parts[3]).replace(",","."));
  if(!Number.isFinite(amount))return"";
  const normalized=norm(amount,parts[2]);
  return`${parts[0]}|${canon(parts[1])}|${normalized.u}|${normalized.a.toFixed(3)}`;
}
function normalizeState(next=S){
  const source=next&&typeof next==="object"?next:{};
  S={...source,
    r:Array.isArray(source.r)?source.r:[],d:Array.isArray(source.d)?source.d:[],
    e:Array.isArray(source.e)?source.e:[],x:Array.isArray(source.x)?source.x:[],
    shop:Array.isArray(source.shop)?source.shop:[]
  };
  S.r.forEach(r=>{
    r.buf=Number(r.buf||0);r.waste=Number(r.waste||0);r.active=Number(r.active??r.pm??0);
    r.passive=Number(r.passive||0);r.roundBatch=!!r.roundBatch;r.u=normUnit(r.u);
    r.a=Array.isArray(r.a)?r.a:[];
    r.a.forEach(i=>{
      i.n=cleanIngredientName(i.n);i.a=Number(i.a)||0;i.u=normUnit(i.u);
      i.pack=Number(i.pack||0);i.packUnit=normUnit(i.packUnit||i.u);
    });
  });
  S.d.forEach(d=>{d.c=Array.isArray(d.c)?d.c:[];d.c.forEach(c=>c.u=normUnit(c.u))});
  S.shop=[...new Set(S.shop.map(normalizeShopKey).filter(Boolean))];
  return S;
}
async function load(){try{let d=await db(),q=d.transaction("s").objectStore("s").get("m");S=await new Promise(a=>q.onsuccess=()=>a(q.result||S))}catch{}normalizeState(S)}

function seedPlaceholderRecipes(){
  if(S.r.length)return;
  S.r=[
    {id:uid(),n:"Kartoffelpüree · Demo",st:"Entremetier",y:10,u:"kg",p:50,pd:1,active:35,passive:20,buf:5,waste:8,roundBatch:true,a:[
      {n:"Kartoffeln",a:8,u:"kg",c:"Gemüse & Obst",pack:10,packUnit:"kg"},
      {n:"Butter",a:0.8,u:"kg",c:"Molkerei",pack:2.5,packUnit:"kg"},
      {n:"Milch",a:2.5,u:"l",c:"Molkerei",pack:1,packUnit:"l"},
      {n:"Salz",a:0.12,u:"kg",c:"Trockenlager",pack:1,packUnit:"kg"}
    ]},
    {id:uid(),n:"Kalbsjus · Demo",st:"Saucier",y:10,u:"l",p:125,pd:2,active:60,passive:240,buf:10,waste:5,roundBatch:true,a:[
      {n:"Kalbsknochen",a:12,u:"kg",c:"Fleisch & Fisch",pack:5,packUnit:"kg"},
      {n:"Röstgemüse",a:3,u:"kg",c:"Gemüse & Obst",pack:0,packUnit:"kg"},
      {n:"Rotwein",a:3,u:"l",c:"Trockenlager",pack:0.75,packUnit:"l"},
      {n:"Kalbsfond",a:8,u:"l",c:"Trockenlager",pack:1,packUnit:"l"}
    ]},
    {id:uid(),n:"Glasierte Karotten · Demo",st:"Entremetier",y:10,u:"kg",p:100,pd:1,active:30,passive:15,buf:5,waste:10,roundBatch:true,a:[
      {n:"Karotten",a:10,u:"kg",c:"Gemüse & Obst",pack:5,packUnit:"kg"},
      {n:"Butter",a:0.5,u:"kg",c:"Molkerei",pack:2.5,packUnit:"kg"},
      {n:"Zucker",a:0.15,u:"kg",c:"Trockenlager",pack:1,packUnit:"kg"}
    ]},
    {id:uid(),n:"Crème brûlée · Demo",st:"Patisserie",y:20,u:"stk",p:20,pd:1,active:25,passive:50,buf:5,waste:0,roundBatch:true,a:[
      {n:"Sahne",a:2,u:"l",c:"Molkerei",pack:1,packUnit:"l"},
      {n:"Eigelb",a:20,u:"stk",c:"Molkerei",pack:0,packUnit:"stk"},
      {n:"Zucker",a:0.3,u:"kg",c:"Trockenlager",pack:1,packUnit:"kg"},
      {n:"Vanille",a:2,u:"stk",c:"Trockenlager",pack:0,packUnit:"stk"}
    ]},
    {id:uid(),n:"Tomaten-Vinaigrette · Demo",st:"Gardemanger",y:5,u:"l",p:100,pd:1,active:20,passive:0,buf:5,waste:0,roundBatch:false,a:[
      {n:"Tomaten",a:2,u:"kg",c:"Gemüse & Obst",pack:0,packUnit:"kg"},
      {n:"Olivenöl",a:2.5,u:"l",c:"Trockenlager",pack:1,packUnit:"l"},
      {n:"Essig",a:0.7,u:"l",c:"Trockenlager",pack:1,packUnit:"l"},
      {n:"Senf",a:0.2,u:"kg",c:"Trockenlager",pack:1,packUnit:"kg"}
    ]}
  ];
}
async function save(){let d=await db();return new Promise(a=>{let t=d.transaction("s","readwrite");t.objectStore("s").put(S,"m");t.oncomplete=a})}
const localISO=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,todayISO=()=>localISO(new Date());
function addDays(s,n){let d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return localISO(d)}function dayLabel(s){let t=todayISO();if(s===t)return"Heute";if(s===addDays(t,1))return"Morgen";return new Date(s+"T12:00:00").toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"})}
function parseIng(t){
  return t.split(/\r?\n/).map(l=>{
    let p=l.split("|").map(x=>x.trim());
    let a=parseFloat((p[1]||"").replace(",","."));
    let pack=parseFloat((p[4]||"").replace(",","."));
    if(!(p.length>=3&&p[0]&&isFinite(a)&&p[2]))return null;
    return {n:p[0],a,u:normUnit(p[2]),c:p[3]||"",pack:isFinite(pack)?pack:0,packUnit:normUnit(p[5]||p[2])};
  }).filter(Boolean)
}
function factor(r,target,u){if(u===r.u)return target/r.y;if(u==="pax"&&r.p)return target/r.p;if(u==="pax"&&r.u==="pax")return target/r.y;return null}
function eventTasks(e){let m={};e.ds.forEach(di=>{let d=S.d.find(x=>x.id===di);if(!d)return;d.c.forEach(c=>{let r=S.r.find(x=>x.id===c.id);if(!r)return;let k=r.id+"|"+c.u;if(!m[k])m[k]={r,target:0,u:c.u};m[k].target+=c.q*e.p})});return Object.values(m).map(z=>{let f=factor(z.r,z.target,z.u),pf=f==null?null:plannedFactor({...z,f});return{...z,f,pf,due:addDays(e.date,-(z.r.pd||0)),mins:pf==null?0:Math.round(pf*(z.r.active??z.r.pm??0)),passive:pf==null?0:Math.round(pf*(z.r.passive||0))}})}
function plannedFactor(t){let f=t.f;if(f==null)return null;let mult=1+(Number(t.r.buf||0)+Number(t.r.waste||0))/100;f*=mult;if(t.r.roundBatch)f=Math.ceil(f);return f}
function taskKey(e,t){return e.id+"_"+t.r.id+"_"+t.u}
function invalidateEventTasks(eventId){S.x=S.x.filter(k=>!k.startsWith(eventId+"_"))}
function invalidateRecipeTasks(recipeId){
  const dishIds=S.d.filter(d=>d.c.some(c=>c.id===recipeId)).map(d=>d.id);
  S.e.filter(e=>e.ds.some(id=>dishIds.includes(id))).forEach(e=>invalidateEventTasks(e.id));
}
function invalidateDishTasks(dishId){S.e.filter(e=>e.ds.includes(dishId)).forEach(e=>invalidateEventTasks(e.id))}
function roundDisplayAmount(a,u){return u==="stk"?Math.ceil(a):a}
function combinedBatchPlan(rawFactor,r){
  if(rawFactor==null)return null;
  let wasteFactor=1+(Number(r.waste||0)/100);
  let afterWaste=rawFactor*wasteFactor;
  let afterBuffer=afterWaste*(1+(Number(r.buf||0)/100));
  let finalFactor=r.roundBatch?Math.ceil(afterBuffer):afterBuffer;
  return {rawFactor,afterWaste,afterBuffer,finalFactor};
}

function groupedTasks(events,opts={}){
  const {stationFilter="",dueFrom="",dueTo=""}=opts;
  let grouped={};
  events.forEach(e=>eventTasks(e).forEach(t=>{
    if(stationFilter&&station(t.r)!==stationFilter)return;
    if(dueFrom&&t.due<dueFrom)return;
    if(dueTo&&t.due>dueTo)return;
    let key=station(t.r)+"|"+t.due+"|"+t.r.id+"|"+t.u;
    if(!grouped[key])grouped[key]={st:station(t.r),due:t.due,r:t.r,u:t.u,rawTarget:0,rawFactor:0,events:[],keys:[]};
    grouped[key].rawTarget+=t.target;
    if(t.f!=null)grouped[key].rawFactor+=t.f;
    grouped[key].events.push({id:e.id,n:e.n,p:e.p});
    grouped[key].keys.push(taskKey(e,t));
  }));
  return Object.values(grouped).map(x=>{
    let plan=combinedBatchPlan(x.rawFactor,x.r);
    let production=plan?plan.finalFactor*x.r.y:x.rawTarget;
    if(x.u==="stk")production=Math.ceil(production);
    return {...x,plan,production,
      active:plan?Math.round(plan.finalFactor*(x.r.active||0)):0,
      passive:plan?Math.round(plan.finalFactor*(x.r.passive||0)):0,
      done:x.keys.length>0&&x.keys.every(k=>S.x.includes(k))
    };
  });
}
function station(r){return(r.st||"").trim()||"Ohne Posten"}function inRange(date,range){let t=todayISO();return date>=t&&(range==="all"||date<=addDays(t,+range))}function future(range="all"){return S.e.filter(e=>inRange(e.date,range))}
function cat(n,c){if(c)return c;n=n.toLowerCase();if(/butter|milch|sahne|rahm|joghurt|quark|käse|parmesan/.test(n))return"Molkerei";if(/rind|kalb|schwein|huhn|ente|lamm|fleisch|fisch|lachs|zander/.test(n))return"Fleisch & Fisch";if(/kartoff|zwiebel|karott|tomat|paprika|pilz|salat|gurke|apfel|zitr|kräuter/.test(n))return"Gemüse & Obst";if(/mehl|zucker|reis|nudel|öl|essig|salz|pfeffer|fond|senf/.test(n))return"Trockenlager";return"Sonstiges"}

function nav(p){$$("nav button").forEach(b=>b.classList.toggle("on",b.dataset.p===p));$$(".page").forEach(x=>x.classList.toggle("on",x.id===p));window.scrollTo({top:0,behavior:"smooth"})}$$("nav button").forEach(b=>b.onclick=()=>nav(b.dataset.p));
function sub(p){$$(".subnav button").forEach(b=>b.classList.toggle("on",b.dataset.s===p));$$(".sub").forEach(x=>x.classList.toggle("on",x.id==="sub-"+p))}$$(".subnav button").forEach(b=>b.onclick=()=>sub(b.dataset.s));

function renderToday(){
  let t=todayISO(),items=groupedTasks(S.e,{dueFrom:t,dueTo:t}).filter(x=>!x.done);
  let mins=items.reduce((n,x)=>n+x.active,0),sts=[...new Set(items.map(x=>x.st))];
  $("todayTitle").textContent="Heute · "+new Date().toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long"});
  $("stats").innerHTML=`<div class=stat><small>Offen</small><b>${items.length}</b></div><div class=stat><small>Aktive Zeit</small><b>${Math.floor(mins/60)}h ${mins%60}m</b></div><div class=stat><small>Posten</small><b>${sts.length}</b></div><div class=stat><small>Events</small><b>${S.e.filter(e=>e.date>=t).length}</b></div>`;
  if(!items.length){$("todayOut").innerHTML="<div class=ok>Heute nichts offen.</div>";return}
  let by={};items.forEach(x=>(by[x.st]??=[]).push(x));
  $("todayOut").innerHTML=Object.entries(by).map(([st,v])=>`<div><div class=stationHead><h3>${esc(st)}</h3><span class=badge>${v.length} offen</span></div>${v.map(x=>{
    let enc=x.keys.map(encodeURIComponent).join(",");
    return`<label class=task><input class=tcheck data-k="${enc}" type=checkbox><span><b>${esc(x.r.n)}</b><div class=help>Bedarf ${fmt(roundDisplayAmount(x.rawTarget,x.u))} ${esc(x.u)} → Produktion ${fmt(roundDisplayAmount(x.production,x.u))} ${esc(x.u)} · ${x.events.map(e=>esc(e.n)).join(", ")} · aktiv ca. ${x.active} Min.${x.passive?` · Gar/Wartezeit ca. ${x.passive} Min.`:""}</div></span></label>`;
  }).join("")}</div>`).join("");
  $$(".tcheck").forEach(c=>c.onchange=async()=>{
    let keys=c.dataset.k.split(",").filter(Boolean).map(decodeURIComponent);
    if(c.checked)keys.forEach(k=>{if(!S.x.includes(k))S.x.push(k)});
    await save();renderAll()
  })
}

function renderEvents(){let view=$("eventView")?.value||"upcoming",t=todayISO(),eventList=S.e.filter(e=>view==="all"||(view==="upcoming"?e.date>=t:e.date<t));$("eventChoices").innerHTML=S.d.length?S.d.map(d=>`<label class=task><input class=dishPick type=checkbox value="${d.id}"><span><b>${esc(d.n)}</b><div class=help>${d.c.length} Komponenten</div></span></label>`).join(""):"<div class=warn>Erst ein Gericht anlegen.</div>";$("eventCards").innerHTML=eventList.length?eventList.slice().sort((a,b)=>view==="archived"?b.date.localeCompare(a.date):a.date.localeCompare(b.date)).map(e=>`<div class=mini><div class=row><div><b>${esc(e.n)}</b><div class=help>${dayLabel(e.date)} · ${e.date}${e.meta?.service?` · Service ${esc(e.meta.service)}`:""}${e.meta?.location?` · ${esc(e.meta.location)}`:""}</div></div><b>${e.p} Pax</b></div><div class=toolbar><button class=eedit data-id="${e.id}">Bearbeiten</button><button class=edup data-id="${e.id}">Duplizieren</button><button class="edel danger" data-id="${e.id}">Löschen</button></div></div>`).join(""):"<div class=card>Noch keine Events.</div>";$$(".eedit").forEach(b=>b.onclick=()=>startEventEdit(b.dataset.id));$$(".edup").forEach(b=>b.onclick=()=>dupEvent(b.dataset.id));$$(".edel").forEach(b=>b.onclick=()=>delEvent(b.dataset.id))}
function startEventEdit(id){let e=S.e.find(x=>x.id===id);if(!e)return;editE=id;$("en").value=e.n;$("ed").value=e.date;$("ep").value=e.p;$$(".dishPick").forEach(x=>x.checked=e.ds.includes(x.value));$("eventTitle").textContent="Event bearbeiten";$("eventBannerText").textContent="Bearbeitungsmodus: "+e.n;$("eventBanner").classList.add("on");$("saveEvent").textContent="Änderungen speichern";nav("events")}
function cancelEvent(){editE=null;$("en").value="";$("ed").value="";$("ep").value=100;$$(".dishPick").forEach(x=>x.checked=false);$("eventTitle").textContent="Neues Event";$("eventBanner").classList.remove("on");$("saveEvent").textContent="Event speichern"}$("cancelEvent").onclick=cancelEvent;
$("saveEvent").onclick=async()=>{let n=$("en").value.trim(),date=$("ed").value,p=+$("ep").value,ds=$$(".dishPick:checked").map(x=>x.value);if(!n||!date||!p||!ds.length){$("eventStatus").innerHTML="<div class=err>Bitte alle Pflichtfelder ausfüllen.</div>";return}let v={n,date,p,ds};if(editE){let i=S.e.findIndex(x=>x.id===editE);S.e[i]={...S.e[i],...v};invalidateEventTasks(S.e[i].id)}else S.e.push({id:uid(),...v});cancelEvent();await save();renderAll()};
async function dupEvent(id){let e=S.e.find(x=>x.id===id);if(!e)return;let c={...e,id:uid(),n:e.n+" – Kopie"};S.e.push(c);await save();renderAll();startEventEdit(c.id)}
async function delEvent(id){let e=S.e.find(x=>x.id===id);if(!e||!confirm(`Event „${e.n}“ löschen?`))return;S.e=S.e.filter(x=>x.id!==id);S.x=S.x.filter(x=>!x.startsWith(id+"_"));await save();renderAll()}

function renderProduction(){
  let range=$("prodRange").value,filter=$("prodStation").value;
  let sts=[...new Set(S.r.map(station))].sort(),old=$("prodStation").value;
  $("prodStation").innerHTML='<option value="">Alle Posten</option>'+sts.map(x=>`<option>${esc(x)}</option>`).join("");
  if(sts.includes(old))$("prodStation").value=old;

  let a=groupedTasks(future(range),{stationFilter:filter})
    .sort((x,y)=>x.due.localeCompare(y.due)||x.st.localeCompare(y.st)||x.r.n.localeCompare(y.r.n));

  if(!a.length){$("productionOut").innerHTML="<div class=card>Keine Produktion.</div>";return}
  let by={};a.forEach(x=>(by[x.st]??=[]).push(x));
  $("productionOut").innerHTML=Object.entries(by).map(([st,v])=>`<div class=card><div class=stationHead><h3>${esc(st)}</h3><span class=badge>${v.length} Positionen</span></div>${v.map(x=>{
    let enc=x.keys.map(encodeURIComponent).join(","),reserve=Math.max(0,x.production-x.rawTarget);
    return`<div class=due><div class=dueTitle>${dayLabel(x.due)} · ${x.due}</div><label class=task><input class=pcheck data-k="${enc}" type=checkbox ${x.done?"checked":""}><span><b>${esc(x.r.n)} · Produktion ${fmt(roundDisplayAmount(x.production,x.u))} ${esc(x.u)}</b><div class=help>Bedarf ${fmt(roundDisplayAmount(x.rawTarget,x.u))} ${esc(x.u)}${x.r.waste?` · Verschnitt ${x.r.waste}%`:""}${x.r.buf?` · Puffer ${x.r.buf}%`:""}${x.r.roundBatch?` · volle Chargen`:""}${reserve?` · Reserve ${fmt(roundDisplayAmount(reserve,x.u))} ${esc(x.u)}`:""} · aktiv ca. ${x.active} Min.${x.passive?` · Gar/Wartezeit ca. ${x.passive} Min.`:""} · ${x.events.map(e=>esc(e.n)).join(", ")}</div></span></label></div>`;
  }).join("")}</div>`).join("");
  $$(".pcheck").forEach(c=>c.onchange=async()=>{
    let ks=c.dataset.k.split(",").filter(Boolean).map(decodeURIComponent);
    if(c.checked)ks.forEach(k=>{if(!S.x.includes(k))S.x.push(k)});
    else S.x=S.x.filter(k=>!ks.includes(k));
    await save();renderAll()
  })
}

function renderShopping(){
  let range=$("shopRange").value,group={};
  future(range).forEach(e=>eventTasks(e).forEach(t=>{
    let key=t.r.id+"|"+t.u;
    if(!group[key])group[key]={r:t.r,rawFactor:0};
    if(t.f!=null)group[key].rawFactor+=t.f;
  }));
  let contributions=[];
  Object.values(group).forEach(g=>{
    let plan=combinedBatchPlan(g.rawFactor,g.r);if(!plan)return;
    g.r.a.forEach(i=>{
      contributions.push({
        name:i.n,amount:i.a*plan.finalFactor,unit:i.u,category:i.c,
        pack:i.pack||0,packUnit:i.packUnit||i.u
      });
    });
  });
  let a=aggregateIngredients(contributions).map(i=>({...i,cat:cat(i.name,i.category)}));
  if($("shopSort").value==="alpha")a.sort((x,y)=>x.name.localeCompare(y.name));else a.sort((x,y)=>x.cat.localeCompare(y.cat)||x.name.localeCompare(y.name));
  if(!a.length){$("shoppingOut").innerHTML="Kein Einkaufsbedarf.";S.shop=S.shop.filter(k=>!k.startsWith(`${range}|`));save();return}
  const activeKeys=[];
  const groupedByCategory=$("shopSort").value!=="alpha";
  let line=i=>{
    let amount=roundDisplayAmount(i.a,i.u),purchase=calculatePurchase(amount,i.u,i.packOptions);
    let primaryAmount=amount,primaryUnit=i.u,action="Bedarf",details=[],warning=false;
    if(!groupedByCategory)details.push(i.cat);
    if(purchase.kind==="packed"){
      primaryAmount=purchase.ordered;primaryUnit=purchase.need.u;action="bestellen";
      if(purchase.over)details.push(`Bedarf ${fmt(amount)} ${i.u}`);
      details.push(`${purchase.packs} × ${fmt(purchase.pack.amount)} ${purchase.pack.unit}`);
      if(purchase.over)details.push(`Überhang ${fmt(purchase.over)} ${purchase.need.u}`);
    }else if(purchase.kind==="conflict"){
      warning=true;
      details.push(`Gebinde prüfen: ${purchase.options.map(option=>`${fmt(option.amount)} ${option.unit}`).join(" / ")}`);
    }
    let k=`${range}|${i.canonical}|${primaryUnit}|${Number(primaryAmount).toFixed(3)}`;activeKeys.push(k);
    return`<label class="shopline${warning?" shopline-warning":""}"><input class=scheck data-k="${esc(k)}" type=checkbox ${S.shop.includes(k)?"checked":""}><span class=shopbody><b>${esc(i.name)}</b>${details.length?`<span class="help shopmeta">${details.map(esc).join(" · ")}</span>`:""}</span><span class=shopqty><b>${fmt(primaryAmount)} ${esc(primaryUnit)}</b><small>${action}</small></span></label>`;
  };
  if($("shopSort").value==="alpha")$("shoppingOut").innerHTML=a.map(line).join("");
  else{let by={};a.forEach(i=>(by[i.cat]??=[]).push(i));$("shoppingOut").innerHTML=Object.entries(by).map(([c,v])=>`<div class=category><h3>${esc(c)}</h3>${v.map(line).join("")}</div>`).join("")}
  S.shop=S.shop.filter(k=>!k.startsWith(`${range}|`)||activeKeys.includes(k));save();
  $$(".scheck").forEach(c=>c.onchange=async()=>{let k=c.dataset.k;if(c.checked&&!S.shop.includes(k))S.shop.push(k);if(!c.checked)S.shop=S.shop.filter(x=>x!==k);await save()})
}

function renderRecipes(){let q=($("recipeSearch")?.value||"").toLowerCase(),list=S.r.filter(r=>!q||r.n.toLowerCase().includes(q)||station(r).toLowerCase().includes(q));$("recipeCards").innerHTML=list.length?list.map(r=>`<div class=mini><div class=row><div><b>${esc(r.n)}</b><div class=help>${station(r)} · ${fmt(r.y)} ${esc(r.u)}</div></div><span class=badge>${r.a.length} Zutaten</span></div><div class=toolbar><button class=redit data-id="${r.id}">Bearbeiten</button><button class=rdup data-id="${r.id}">Duplizieren</button><button class="rdel danger" data-id="${r.id}">Löschen</button></div></div>`).join(""):"Noch keine Rezepte." ;$$(".redit").forEach(b=>b.onclick=()=>startRecipe(b.dataset.id));$$(".rdup").forEach(b=>b.onclick=()=>dupRecipe(b.dataset.id));$$(".rdel").forEach(b=>b.onclick=()=>delRecipe(b.dataset.id))}
function startRecipe(id){let r=S.r.find(x=>x.id===id);if(!r)return;editR=id;let affected=S.d.filter(d=>d.c.some(c=>c.id===id)).map(d=>d.id);let count=S.e.filter(e=>e.date>=todayISO()&&e.ds.some(x=>affected.includes(x))).length;if(count)alert(`Hinweis: Dieses Rezept beeinflusst ${count} kommende Event(s). Produktion und Einkauf werden nach dem Speichern neu berechnet.`);$("rn").value=r.n;$("rst").value=r.st||"";$("ry").value=r.y;$("ru").value=r.u;$("rp").value=r.p||"";$("rpd").value=r.pd||0;$("ractive").value=r.active??r.pm??0;$("rpassive").value=r.passive||0;$("rbuf").value=r.buf||0;$("rwaste").value=r.waste||0;$("rround").checked=!!r.roundBatch;$("ring").value=r.a.map(i=>`${i.n} | ${i.a} | ${i.u}${i.c||i.pack?` | ${i.c||""}`:""}${i.pack?` | ${i.pack} | ${i.packUnit||i.u}`:""}`).join("\n");$("recipeTitle").textContent="Rezept bearbeiten";$("recipeBannerText").textContent="Bearbeitungsmodus: "+r.n;$("recipeBanner").classList.add("on");$("saveRecipe").textContent="Änderungen speichern";sub("recipes")}
function cancelRecipe(){editR=null;$("rn").value="";$("rst").value="";$("ry").value=10;$("ru").value="kg";$("rp").value="";$("rpd").value=1;$("ractive").value=30;$("rpassive").value=0;$("rbuf").value=0;$("rwaste").value=0;$("rround").checked=false;$("ring").value="";$("recipeTitle").textContent="Neues Rezept";$("recipeBanner").classList.remove("on");$("saveRecipe").textContent="Rezept speichern"}$("cancelRecipe").onclick=cancelRecipe;
$("saveRecipe").onclick=async()=>{let n=$("rn").value.trim(),y=+$("ry").value,a=parseIng($("ring").value);if(!n||!y||!a.length)return $("recipeStatus").innerHTML="<div class=err>Name, Ausbeute und Zutaten fehlen.</div>";let v={n,st:$("rst").value.trim(),y,u:$("ru").value,p:+$("rp").value||null,pd:+$("rpd").value||0,active:+$("ractive").value||0,passive:+$("rpassive").value||0,buf:+$("rbuf").value||0,waste:+$("rwaste").value||0,roundBatch:$("rround").checked,a};if(editR){let i=S.r.findIndex(x=>x.id===editR);S.r[i]={...S.r[i],...v};invalidateRecipeTasks(S.r[i].id)}else S.r.push({id:uid(),...v});cancelRecipe();await save();renderAll()};
async function dupRecipe(id){let r=S.r.find(x=>x.id===id);if(!r)return;let c={...r,id:uid(),n:r.n+" – Kopie",a:r.a.map(x=>({...x}))};S.r.push(c);await save();renderAll();startRecipe(c.id)}
async function delRecipe(id){
  let r=S.r.find(x=>x.id===id);if(!r)return;
  if(S.d.some(d=>d.c.some(c=>c.id===id)))return alert("Rezept wird noch in mindestens einem Gericht verwendet.");
  if(confirm(`Rezept „${r.n}“ löschen?`)){S.r=S.r.filter(x=>x.id!==id);await save();renderAll()}
}

function renderDishes(){let dq=($("dishSearch")?.value||"").toLowerCase();$("dishComponents").innerHTML=S.r.length?S.r.map(r=>`<div class=componentRow><input class=cc type=checkbox value="${r.id}"><div><b>${esc(r.n)}</b><div class=help>${station(r)}</div></div><input class=cq type=number step=.001 placeholder="0,18"><select class=cu><option value=kg>kg</option><option value=l>Liter</option><option value=stk>Stück</option></select></div>`).join(""):"<div class=warn>Erst ein Rezept anlegen.</div>";$("dishCards").innerHTML=S.d.filter(d=>!dq||d.n.toLowerCase().includes(dq)).length?S.d.filter(d=>!dq||d.n.toLowerCase().includes(dq)).map(d=>`<div class=mini><div class=row><b>${esc(d.n)}</b><span class=badge>${d.c.length} Komponenten</span></div><div class=toolbar><button class=dedit data-id="${d.id}">Bearbeiten</button><button class=ddup data-id="${d.id}">Duplizieren</button><button class="ddel danger" data-id="${d.id}">Löschen</button></div></div>`).join(""):"Noch keine Gerichte.";$$(".dedit").forEach(b=>b.onclick=()=>startDish(b.dataset.id));$$(".ddup").forEach(b=>b.onclick=()=>dupDish(b.dataset.id));$$(".ddel").forEach(b=>b.onclick=()=>delDish(b.dataset.id))}
function startDish(id){let d=S.d.find(x=>x.id===id);if(!d)return;editD=id;let count=S.e.filter(e=>e.date>=todayISO()&&e.ds.includes(id)).length;if(count)alert(`Hinweis: Dieses Gericht wird in ${count} kommende(n) Event(s) verwendet. Produktion und Einkauf werden nach dem Speichern neu berechnet.`);$("dn").value=d.n;$$(".componentRow").forEach(r=>{let id=r.querySelector(".cc").value,c=d.c.find(x=>x.id===id);r.querySelector(".cc").checked=!!c;r.querySelector(".cq").value=c?c.q:"";if(c)r.querySelector(".cu").value=c.u});$("dishTitle").textContent="Gericht bearbeiten";$("dishBannerText").textContent="Bearbeitungsmodus: "+d.n;$("dishBanner").classList.add("on");$("saveDish").textContent="Änderungen speichern";sub("dishes")}
function cancelDish(){editD=null;$("dn").value="";$$(".componentRow").forEach(r=>{r.querySelector(".cc").checked=false;r.querySelector(".cq").value="";r.querySelector(".cu").value="kg"});$("dishTitle").textContent="Gericht bauen";$("dishBanner").classList.remove("on");$("saveDish").textContent="Gericht speichern"}$("cancelDish").onclick=cancelDish;
$("saveDish").onclick=async()=>{let n=$("dn").value.trim(),c=[];$$(".componentRow").forEach(r=>{let b=r.querySelector(".cc"),q=+r.querySelector(".cq").value,u=r.querySelector(".cu").value;if(b.checked&&q>0)c.push({id:b.value,q,u})});if(!n||!c.length)return $("dishStatus").innerHTML="<div class=err>Name und Komponente fehlen.</div>";if(editD){let i=S.d.findIndex(x=>x.id===editD);S.d[i]={...S.d[i],n,c};invalidateDishTasks(S.d[i].id)}else S.d.push({id:uid(),n,c});cancelDish();await save();renderAll()};
async function dupDish(id){let d=S.d.find(x=>x.id===id);if(!d)return;let c={...d,id:uid(),n:d.n+" – Kopie",c:d.c.map(x=>({...x}))};S.d.push(c);await save();renderAll();startDish(c.id)}
async function delDish(id){let d=S.d.find(x=>x.id===id);if(!d)return;if(S.e.some(e=>e.ds.includes(id)))return alert("Gericht wird noch in einem Event verwendet.");if(confirm(`Gericht „${d.n}“ löschen?`)){S.d=S.d.filter(x=>x.id!==id);await save();renderAll()}}

function renderStations(){
  let sts=[...new Set(S.r.map(station))].sort(),old=$("stationFilter").value;
  $("stationFilter").innerHTML='<option value="">Alle</option>'+sts.map(x=>`<option>${esc(x)}</option>`).join("");
  if(sts.includes(old))$("stationFilter").value=old;
  let f=$("stationFilter").value,r=$("stationRange").value,t=todayISO(),from=t,to=t;
  if(r==="tomorrow")from=to=addDays(t,1);
  if(r==="week")to=addDays(t,6);
  let a=groupedTasks(S.e,{stationFilter:f,dueFrom:from,dueTo:to})
    .sort((x,y)=>x.due.localeCompare(y.due)||x.st.localeCompare(y.st)||x.r.n.localeCompare(y.r.n));
  $("stationOut").innerHTML=a.length?a.map(x=>{
    let enc=x.keys.map(encodeURIComponent).join(",");
    return`<label class=task><input class=stcheck data-k="${enc}" type=checkbox ${x.done?"checked":""}><span><b>${esc(x.r.n)}</b><div class=help>${x.st} · Bedarf ${fmt(roundDisplayAmount(x.rawTarget,x.u))} ${esc(x.u)} → Produktion ${fmt(roundDisplayAmount(x.production,x.u))} ${esc(x.u)} · ${x.events.map(e=>esc(e.n)).join(", ")} · ${dayLabel(x.due)}</div></span></label>`;
  }).join(""):"Keine Aufgaben.";
  $$(".stcheck").forEach(c=>c.onchange=async()=>{
    let ks=c.dataset.k.split(",").filter(Boolean).map(decodeURIComponent);
    if(c.checked)ks.forEach(k=>{if(!S.x.includes(k))S.x.push(k)});
    else S.x=S.x.filter(k=>!ks.includes(k));
    await save();renderAll()
  })
}


function normalizeTextLine(s){return String(s||"").replace(/\s+/g," ").trim()}
function parseDateValue(v){
  v=normalizeTextLine(v);
  let m=v.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if(m)return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  m=v.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/);
  if(m){let y=m[3].length===2?"20"+m[3]:m[3];return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`}
  return "";
}
function splitMenu(v){return String(v||"").split(/[;|\n•]+/).map(normalizeTextLine).filter(Boolean)}
function parseFunction(t){
  let o={n:"",date:"",p:null,d:[],service:"",location:"",contact:"",allergies:"",notes:""};
  let lines=String(t||"").split(/\r?\n/).map(normalizeTextLine).filter(Boolean);
  let noteLines=[];
  lines.forEach((l,idx)=>{
    let m;
    if(!o.n&&(m=l.match(/^(?:event|function|veranstaltung|veranstaltungsname|anlass|booking)\s*[:\-]\s*(.+)$/i)))o.n=m[1].trim();
    if(!o.date&&(m=l.match(/^(?:datum|date|veranstaltungsdatum)\s*[:\-]\s*(.+)$/i)))o.date=parseDateValue(m[1]);
    if(!o.p&&(m=l.match(/^(?:pax|gäste|gaeste|personen|teilnehmer|anzahl)\s*[:\-]\s*(\d{1,5})/i)))o.p=+m[1];
    if(!o.service&&(m=l.match(/^(?:service|essen|essenszeit|dinner|lunch|start|beginn)\s*[:\-]\s*(.+)$/i)))o.service=m[1].trim();
    if(!o.location&&(m=l.match(/^(?:ort|location|raum|venue)\s*[:\-]\s*(.+)$/i)))o.location=m[1].trim();
    if(!o.contact&&(m=l.match(/^(?:ansprechpartner|kontakt|contact|kunde)\s*[:\-]\s*(.+)$/i)))o.contact=m[1].trim();
    if(!o.allergies&&(m=l.match(/^(?:allergien|allergene|sonderkost|dietary|unverträglichkeiten|unvertraeglichkeiten)\s*[:\-]\s*(.+)$/i)))o.allergies=m[1].trim();
    if((m=l.match(/^(?:menü|menu|gerichte?|speisen|food)\s*[:\-]\s*(.+)$/i)))o.d.push(...splitMenu(m[1]));
    if((m=l.match(/^(?:notiz|notizen|bemerkung|bemerkungen|hinweis|hinweise|info)\s*[:\-]\s*(.+)$/i)))noteLines.push(m[1].trim());
  });
  if(!o.date){let all=lines.join(" ");let m=all.match(/\b(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4})\b/);if(m)o.date=parseDateValue(m[1])}
  if(!o.p){let all=lines.join(" ");let m=all.match(/\b(\d{2,4})\s*(?:pax|personen|gäste|gaeste)\b/i);if(m)o.p=+m[1]}
  o.d=[...new Set(o.d)];
  o.notes=noteLines.join("\n");
  return o;
}
function normalizeDishName(s){
  return String(s||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/&/g," und ").replace(/[^a-z0-9äöüß ]/g," ")
    .replace(/\b(mit|und|vom|von|der|die|das|an|auf|im|in)\b/g," ")
    .replace(/\s+/g," ").trim();
}
function dishSimilarity(a,b){
  a=normalizeDishName(a);b=normalizeDishName(b);
  if(!a||!b)return 0;
  if(a===b)return 1;
  if(a.includes(b)||b.includes(a))return .86;
  let A=new Set(a.split(" ").filter(x=>x.length>2)),B=new Set(b.split(" ").filter(x=>x.length>2));
  let inter=[...A].filter(x=>B.has(x)).length,union=new Set([...A,...B]).size;
  return union?inter/union:0;
}
function bestDishMatch(name){
  let scored=S.d.map(d=>({d,score:dishSimilarity(name,d.n)})).sort((a,b)=>b.score-a.score);
  return scored[0]||null;
}
function renderFunctionReview(o){
  $("functionReview").style.display="block";
  $("frName").value=o.n||"";
  $("frDate").value=o.date||"";
  $("frPax").value=o.p||"";
  $("frService").value=o.service||"";
  $("frLocation").value=o.location||"";
  $("frContact").value=o.contact||"";
  $("frAllergies").value=o.allergies||"";
  $("frNotes").value=o.notes||"";
  let menu=o.d||[];
  $("functionDishReview").innerHTML=menu.length?menu.map((name,i)=>{
    let best=bestDishMatch(name),score=best?.score||0,cls=score>=.78?"ok":score>=.45?"warn":"err";
    let opts=['<option value="">Nicht zugeordnet</option>',...S.d.map(d=>`<option value="${d.id}" ${best&&best.d.id===d.id&&score>=.45?"selected":""}>${esc(d.n)}</option>`)].join("");
    return `<div class="mini functionDishRow" data-source="${esc(name)}"><div class=row><div><b>${esc(name)}</b><div class=help>${score>=.78?"Sicher erkannt":score>=.45?"Ähnliche Zuordnung gefunden":"Kein passendes Gericht gefunden"}</div></div><span class="${cls}">${Math.round(score*100)}%</span></div><select class=functionDishSelect data-i="${i}">${opts}</select></div>`;
  }).join(""):'<div class=warn>Kein Menü erkannt. Du kannst das Event trotzdem anlegen und Gerichte später ergänzen.</div>';
  $("functionResult").innerHTML=`<div class=ok>Analyse fertig: ${o.d.length} Menüposition(en) gefunden. Bitte kurz prüfen.</div>`;
}
async function extractFunctionFile(file){
  if(file.type.startsWith("text/")||/\.(txt|csv)$/i.test(file.name))return await file.text();
  if(file.type.startsWith("image/")){
    if(typeof Tesseract==="undefined")throw new Error("OCR konnte nicht geladen werden.");
    $("functionFileStatus").textContent="Bild wird erkannt …";
    let r=await Tesseract.recognize(file,"deu+eng",{logger:m=>{if(m.status==="recognizing text")$("functionFileStatus").textContent=`Bild wird erkannt … ${Math.round((m.progress||0)*100)} %`}});
    return r?.data?.text||"";
  }
  if(file.type==="application/pdf"||/\.pdf$/i.test(file.name)){
    $("functionFileStatus").textContent="PDF wird gelesen …";
    const pdfjs=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
    let pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise,text="";
    for(let p=1;p<=pdf.numPages;p++){
      let page=await pdf.getPage(p),content=await page.getTextContent();
      text+=content.items.map(i=>i.str).join(" ")+"\n";
      $("functionFileStatus").textContent=`PDF wird gelesen … ${p}/${pdf.numPages}`;
    }
    return text;
  }
  throw new Error("Dateiformat wird noch nicht unterstützt.");
}
$("functionFile").onchange=async e=>{
  let f=e.target.files?.[0];if(!f)return;
  $("functionFileStatus").textContent=`${f.name} · ${Math.round(f.size/1024)} KB`;
  try{
    let text=await extractFunctionFile(f);
    $("functionText").value=text;
    $("functionFileStatus").textContent=`✓ ${f.name} gelesen`;
    renderFunctionReview(parseFunction(text));
  }catch(err){
    $("functionFileStatus").innerHTML=`<span class=err>${esc(err.message||String(err))}</span>`;
  }
};
$("parseFunction").onclick=()=>renderFunctionReview(parseFunction($("functionText").value));
$("createFunctionEvent").onclick=async()=>{
  let n=$("frName").value.trim(),date=$("frDate").value,p=+$("frPax").value;
  if(!n||!date||!p){$("functionCreateStatus").innerHTML='<div class=err>Name, Datum und Pax müssen vorhanden sein.</div>';return}
  let ds=$$(".functionDishSelect").map(x=>x.value).filter(Boolean);
  let meta={
    service:$("frService").value.trim(),
    location:$("frLocation").value.trim(),
    contact:$("frContact").value.trim(),
    allergies:$("frAllergies").value.trim(),
    notes:$("frNotes").value.trim()
  };
  S.e.push({id:uid(),n,date,p,ds,meta});
  await save();renderAll();
  $("functionCreateStatus").innerHTML='<div class=ok>✓ Event angelegt.</div>';
  nav("events");
};
$("exportBtn").onclick=()=>{let b=new Blob([JSON.stringify(S,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="CateringCompanion_Backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
$("importFile").onchange=e=>{let f=e.target.files?.[0];if(!f)return;let r=new FileReader;r.onload=async()=>{try{let d=JSON.parse(String(r.result||"{}"));normalizeState(d);await save();renderAll()}catch{alert("Backup ungültig")}};r.readAsText(f)}
$("prodRange").onchange=renderProduction;$("prodStation").onchange=renderProduction;$("shopRange").onchange=renderShopping;$("shopSort").onchange=renderShopping;$("stationFilter").onchange=renderStations;$("stationRange").onchange=renderStations;
function renderAll(){renderToday();renderEvents();renderProduction();renderShopping();renderRecipes();renderDishes();renderStations()}(async()=>{await load();if(!S.r.length){seedPlaceholderRecipes();await save()}renderAll()})();
$("recipeSearch").oninput=renderRecipes;$("dishSearch").oninput=renderDishes;$("eventView").onchange=renderEvents;
