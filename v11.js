(()=> {
const CATS=["Vorspeise","Hauptgang","Dessert","Sauce","Beilage","Suppe","Salat","Gebäck","Basis","Sonstiges"];

function smartUnit(amount, unit){
  amount=Number(amount)||0; unit=String(unit||"").toLowerCase();
  if(unit==="g" && Math.abs(amount)>=1000) return [fmt(amount/1000),"kg"];
  if(unit==="ml" && Math.abs(amount)>=1000) return [fmt(amount/1000),"l"];
  if(unit==="kg" && Math.abs(amount)>0 && Math.abs(amount)<1) return [fmt(amount*1000),"g"];
  if(unit==="l" && Math.abs(amount)>0 && Math.abs(amount)<1) return [fmt(amount*1000),"ml"];
  return [fmt(amount),unit];
}
function inferCategory(r){
  const n=(r.n||"").toLowerCase();
  if(/dessert|crème|creme|mousse|tarte|kuchen|eis|parfait/.test(n)) return "Dessert";
  if(/jus|sauce|vinaigrette|fond|dressing/.test(n)) return "Sauce";
  if(/suppe|consomm|velout/.test(n)) return "Suppe";
  if(/salat/.test(n)) return "Salat";
  if(/brot|bröt|brioche|gebäck/.test(n)) return "Gebäck";
  if(/püree|puree|kartoff|gemüse|karotte|reis|nudel|polenta/.test(n)) return "Beilage";
  return "Sonstiges";
}
function ensureV11UI(){
  const ver=document.querySelector(".ver");
  if(ver) ver.textContent="V11.1";
  document.title="CateringCompanion V11.1";

  if(!$("rcat")){
    const stationLabel=$("rst")?.parentElement;
    const host=stationLabel?.parentElement;
    if(host){
      const label=document.createElement("label");
      label.innerHTML=`Kategorie<select id="rcat">${CATS.map(c=>`<option>${c}</option>`).join("")}</select>`;
      host.appendChild(label);
      $("rcat").value="Sonstiges";
    }
  }
  if(!$("recipeCategory") && $("recipeSearch")){
    const bar=document.createElement("div");
    bar.className="v11filters";
    bar.innerHTML=`<select id="recipeCategory"><option value="">Alle Kategorien</option>${CATS.map(c=>`<option>${c}</option>`).join("")}</select>
      <label class="v11favfilter"><input id="recipeFavOnly" type="checkbox"> Nur Favoriten</label>`;
    $("recipeSearch").insertAdjacentElement("afterend",bar);
    $("recipeCategory").onchange=()=>renderRecipes();
    $("recipeFavOnly").onchange=()=>renderRecipes();
  }
}
function migrateV11(){
  let dirty=false;
  (S.r||[]).forEach(r=>{
    if(!r.catg){r.catg=inferCategory(r);dirty=true;}
    if(typeof r.fav!=="boolean"){r.fav=false;dirty=true;}
  });
  return dirty;
}
function scaledIngredients(r,target){
  const factor=r.p ? target/(Number(r.p)||1) : target/(Number(r.y)||1);
  return (r.a||[]).map(i=>{
    const [a,u]=smartUnit((Number(i.a)||0)*factor,i.u);
    return `<div class="v11ing"><span>${esc(i.n)}</span><b>${a} ${esc(u)}</b></div>`;
  }).join("") || `<div class="help">Keine Zutaten hinterlegt.</div>`;
}

const originalStartRecipe = startRecipe;
startRecipe = function(id){
  originalStartRecipe(id);
  const r=S.r.find(x=>x.id===id);
  if(r && $("rcat")) $("rcat").value=r.catg||"Sonstiges";
};

const originalCancelRecipe = cancelRecipe;
cancelRecipe = function(){
  originalCancelRecipe();
  if($("rcat")) $("rcat").value="Sonstiges";
};
$("cancelRecipe").onclick=cancelRecipe;

dupRecipe = async function(id){
  const r=S.r.find(x=>x.id===id);
  if(!r)return;
  const c={...r,id:uid(),n:r.n+" – Kopie",fav:false,a:r.a.map(x=>({...x}))};
  S.r.push(c);
  await save();
  renderAll();
  startRecipe(c.id);
};

renderRecipes = function(){
  ensureV11UI();
  const search=($("recipeSearch")?.value||"").trim().toLowerCase();
  const category=$("recipeCategory")?.value||"";
  const favoritesOnly=!!$("recipeFavOnly")?.checked;

  const list=(S.r||[]).filter(r=>{
    const hay=[r.n,station(r),r.catg,(r.a||[]).map(i=>i.n).join(" ")].join(" ").toLowerCase();
    return (!search||hay.includes(search)) && (!category||r.catg===category) && (!favoritesOnly||r.fav);
  }).sort((a,b)=>Number(!!b.fav)-Number(!!a.fav)||String(a.n).localeCompare(String(b.n),"de"));

  $("recipeCards").innerHTML=list.length ? list.map(r=>`
    <div class="mini v11recipe">
      <div class="row">
        <div>
          <div class="v11title"><b>${esc(r.n)}</b>${r.fav?'<span class="v11star">★</span>':''}</div>
          <div class="help">${esc(r.catg||"Sonstiges")} · ${esc(station(r))} · Basis ${fmt(r.y)} ${esc(r.u)}${r.p?` = ${fmt(r.p)} Pax`:""}</div>
        </div>
        <span class="badge">${r.a.length} Zutaten</span>
      </div>
      <div class="toolbar">
        <button class="rfav" data-id="${r.id}">${r.fav?"★ Favorit":"☆ Favorit"}</button>
        <button class="rscale" data-id="${r.id}">Skalieren</button>
        <button class="redit" data-id="${r.id}">Bearbeiten</button>
        <button class="rdup" data-id="${r.id}">Duplizieren</button>
        <button class="rdel danger" data-id="${r.id}">Löschen</button>
      </div>
      <div class="v11scale" id="scale-${r.id}" hidden>
        <div class="g2">
          <label>${r.p?"Ziel-Pax":"Ziel-Ausbeute"}<input class="v11target" type="number" min="0" step=".01" value="${r.p||r.y}"></label>
          <label>Basis<span class="v11basis">${r.p?`${fmt(r.p)} Pax`:`${fmt(r.y)} ${esc(r.u)}`}</span></label>
        </div>
        <div class="v11ingredients"></div>
      </div>
    </div>`).join("") : `<div class="card"><div class="help">Keine Rezepte für diesen Filter.</div></div>`;

  $$(".redit").forEach(b=>b.onclick=()=>startRecipe(b.dataset.id));
  $$(".rdup").forEach(b=>b.onclick=()=>dupRecipe(b.dataset.id));
  $$(".rdel").forEach(b=>b.onclick=()=>delRecipe(b.dataset.id));
  $$(".rfav").forEach(b=>b.onclick=async()=>{
    const r=S.r.find(x=>x.id===b.dataset.id);
    if(!r)return;
    r.fav=!r.fav;
    await save();
    renderRecipes();
  });
  $$(".rscale").forEach(b=>b.onclick=()=>{
    const r=S.r.find(x=>x.id===b.dataset.id);
    const box=$("scale-"+b.dataset.id);
    if(!r||!box)return;
    box.hidden=!box.hidden;
    if(box.hidden)return;
    const inp=box.querySelector(".v11target");
    const out=box.querySelector(".v11ingredients");
    const draw=()=>out.innerHTML=scaledIngredients(r,+inp.value||0);
    inp.oninput=draw;
    draw();
  });
};

$("saveRecipe").onclick=async()=>{
  const n=$("rn").value.trim(), y=+$("ry").value, a=parseIng($("ring").value);
  if(!n||!y||!a.length){
    $("recipeStatus").innerHTML="<div class=err>Name, Ausbeute und Zutaten fehlen.</div>";
    return;
  }
  const v={
    n, st:$("rst").value.trim(), catg:$("rcat")?.value||"Sonstiges",
    y, u:$("ru").value, p:+$("rp").value||null, pd:+$("rpd").value||0,
    active:+$("ractive").value||0, passive:+$("rpassive").value||0,
    buf:+$("rbuf").value||0, waste:+$("rwaste").value||0,
    roundBatch:$("rround").checked, a
  };
  if(editR){
    const i=S.r.findIndex(x=>x.id===editR);
    S.r[i]={...S.r[i],...v};
    invalidateRecipeTasks(S.r[i].id);
  } else {
    S.r.push({id:uid(),fav:false,...v});
  }
  cancelRecipe();
  await save();
  renderAll();
};

$("recipeSearch").oninput=()=>renderRecipes();

const originalRenderAll=renderAll;
renderAll=function(){
  const dirty=migrateV11();
  originalRenderAll();
  if(dirty)save();
};

ensureV11UI();
if(migrateV11())save();
renderRecipes();
})();
