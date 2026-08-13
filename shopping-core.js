(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.CCShopping=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const UNIT_ALIASES={
    liter:"l",lt:"l",l:"l",milliliter:"ml",ml:"ml",
    kilogramm:"kg",kilo:"kg",kg:"kg",gramm:"g",gr:"g",g:"g",
    stück:"stk",stueck:"stk",st:"stk",stk:"stk",pax:"pax",cl:"cl",dl:"dl"
  };
  const NAME_ALIASES={
    kartoffel:"kartoffeln",kartoffeln:"kartoffeln",
    zwiebel:"zwiebeln",zwiebeln:"zwiebeln",
    karotte:"karotten",karotten:"karotten",moehre:"karotten",moehren:"karotten",
    tomate:"tomaten",tomaten:"tomaten",ei:"eier",eier:"eier"
  };
  const PREFERRED_NAMES={
    kartoffeln:"Kartoffeln",zwiebeln:"Zwiebeln",karotten:"Karotten",tomaten:"Tomaten",eier:"Eier"
  };

  function cleanIngredientName(name){
    return String(name||"")
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g,"")
      .replace(/\s+/g," ")
      .trim();
  }

  function normalizeUnit(unit){
    const value=String(unit||"").normalize("NFKC").trim().toLowerCase();
    return UNIT_ALIASES[value]||value;
  }

  function normalizeAmount(amount,unit){
    const value=Number(amount)||0;
    const normalizedUnit=normalizeUnit(unit);
    if(normalizedUnit==="g")return{a:value/1000,u:"kg"};
    if(normalizedUnit==="ml")return{a:value/1000,u:"l"};
    if(normalizedUnit==="cl")return{a:value/100,u:"l"};
    if(normalizedUnit==="dl")return{a:value/10,u:"l"};
    return{a:value,u:normalizedUnit};
  }

  function canonicalIngredient(name){
    const value=cleanIngredientName(name).toLowerCase()
      .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss");
    return NAME_ALIASES[value]||value;
  }

  function normalizePackOption(amount,unit){
    const rawAmount=Number(amount)||0;
    const rawUnit=normalizeUnit(unit);
    if(rawAmount<=0)return null;
    const normalized=normalizeAmount(rawAmount,rawUnit);
    return{amount:rawAmount,unit:rawUnit,normalizedAmount:normalized.a,normalizedUnit:normalized.u};
  }

  function aggregateIngredients(items){
    const grouped=new Map();
    (items||[]).forEach(item=>{
      const name=cleanIngredientName(item.name);
      const normalized=normalizeAmount(item.amount,item.unit);
      const canonical=canonicalIngredient(name);
      if(!name||!canonical||!normalized.u)return;
      const key=`${canonical}|${normalized.u}`;
      if(!grouped.has(key))grouped.set(key,{
        name:PREFERRED_NAMES[canonical]||name,canonical,a:0,u:normalized.u,
        category:String(item.category||"").trim(),packOptions:[]
      });
      const entry=grouped.get(key);
      entry.a+=normalized.a;
      if(!entry.category&&item.category)entry.category=String(item.category).trim();
      const pack=normalizePackOption(item.pack,item.packUnit||item.unit);
      if(pack&&!entry.packOptions.some(option=>
        option.normalizedUnit===pack.normalizedUnit&&Math.abs(option.normalizedAmount-pack.normalizedAmount)<1e-9
      ))entry.packOptions.push(pack);
    });
    return[...grouped.values()];
  }

  function calculatePurchase(amount,unit,packOptions){
    const need=normalizeAmount(amount,unit);
    const options=[];
    (packOptions||[]).forEach(option=>{
      const pack=option&&option.normalizedUnit
        ? option
        : normalizePackOption(option?.amount,option?.unit);
      if(pack&&!options.some(existing=>
        existing.normalizedUnit===pack.normalizedUnit&&Math.abs(existing.normalizedAmount-pack.normalizedAmount)<1e-9
      ))options.push(pack);
    });
    const compatible=options.filter(option=>option.normalizedUnit===need.u);
    if(options.length&&compatible.length!==options.length)return{kind:"conflict",need,options};
    if(compatible.length>1)return{kind:"conflict",need,options:compatible};
    if(!compatible.length)return{kind:"loose",need,options:[]};
    const pack=compatible[0];
    const packs=Math.ceil(Math.max(0,need.a-1e-9)/pack.normalizedAmount);
    const ordered=packs*pack.normalizedAmount;
    const over=Math.abs(ordered-need.a)<1e-9?0:Math.max(0,ordered-need.a);
    return{kind:"packed",need,pack,packs,ordered,over};
  }

  return{cleanIngredientName,normalizeUnit,normalizeAmount,canonicalIngredient,aggregateIngredients,calculatePurchase};
});
