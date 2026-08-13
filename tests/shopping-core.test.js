const assert=require("node:assert/strict");
const {
  cleanIngredientName,normalizeUnit,normalizeAmount,canonicalIngredient,
  aggregateIngredients,calculatePurchase
}=require("../shopping-core.js");

assert.equal(cleanIngredientName("  Kartoffeln\u200B   geschält "),"Kartoffeln geschält");
assert.equal(normalizeUnit(" Kilogramm "),"kg");
assert.deepEqual(normalizeAmount(500,"g"),{a:0.5,u:"kg"});
assert.equal(canonicalIngredient("Kartoffel"),"kartoffeln");
assert.equal(canonicalIngredient("Kartoffeln\u200B"),"kartoffeln");
assert.notEqual(canonicalIngredient("Süßkartoffeln"),canonicalIngredient("Kartoffeln"));

const combined=aggregateIngredients([
  {name:"Kartoffel",amount:12,unit:"kg",category:"Gemüse & Obst",pack:10,packUnit:"kg"},
  {name:" Kartoffeln\u200B ",amount:12000,unit:"Gramm",category:"Gemüse & Obst",pack:10000,packUnit:"g"}
]);
assert.equal(combined.length,1);
assert.equal(combined[0].name,"Kartoffeln");
assert.equal(combined[0].a,24);
assert.equal(combined[0].u,"kg");
assert.equal(combined[0].packOptions.length,1);

const order=calculatePurchase(combined[0].a,combined[0].u,combined[0].packOptions);
assert.equal(order.kind,"packed");
assert.equal(order.packs,3);
assert.equal(order.ordered,30);
assert.equal(order.over,6);

const exact=calculatePurchase(30,"kg",[{amount:10,unit:"kg"}]);
assert.equal(exact.packs,3);
assert.equal(exact.over,0);

const conflict=calculatePurchase(24,"kg",[{amount:10,unit:"kg"},{amount:5,unit:"kg"}]);
assert.equal(conflict.kind,"conflict");

const separate=aggregateIngredients([
  {name:"Kartoffeln",amount:2,unit:"kg"},
  {name:"Kartoffeln",amount:5,unit:"stk"}
]);
assert.equal(separate.length,2);

console.log("shopping-core: 19 checks passed");
