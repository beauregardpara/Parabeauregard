using ParaBeauregard.Desktop;

static void Assert(bool ok, string message) { if (!ok) throw new Exception(message); }
static Sale S(DateTime day, decimal quantity, decimal buy, decimal sell) => new(Guid.NewGuid(), day, "Produit", "Marque", "Catégorie", "SKU", quantity, buy, sell, "Espèces", "");

var d1 = new DateTime(2026, 1, 1); var d2 = d1.AddDays(1); var d3 = d2.AddDays(1);
var r = GoalEngine.Calculate([S(d1, 1, 0, 150), S(d2, 1, 0, 270)], 200, d1, d3);
Assert(r[0].Target == 200 && r[0].Profit == 150 && r[0].CarriedDelay == 50, "Jour 1 : report attendu 50");
Assert(r[1].Target == 250 && r[1].Profit == 270 && r[1].CarriedDelay == 0, "Jour 2 : objectif 250 et report nul");
Assert(r[2].Target == 200 && r[2].Profit == 0 && r[2].CarriedDelay == 200, "Jour 3 sans vente : objectif 200 et report 200");
var multi = GoalEngine.Calculate([S(d1, 2, 100, 90), S(d1, 3, 10, 50)], 200, d1, d1).Single();
Assert(multi.Quantity == 5 && multi.Profit == 100 && multi.Revenue == 330 && multi.Cost == 230, "Quantités multiples et vente à perte");
var afterDelete = GoalEngine.Calculate([S(d1, 1, 0, 150), S(d2, 1, 0, 270)], 200, d1, d2);
Assert(afterDelete[1].Target == 250, "Historique initial");
var afterEdit = GoalEngine.Calculate([S(d1, 1, 0, 220), S(d2, 1, 0, 270)], 200, d1, d2);
Assert(afterEdit[0].CarriedDelay == 0 && afterEdit[1].Target == 200, "Modification ancienne vente");
var changed = GoalEngine.Calculate([S(d1, 1, 0, 150)], 250, d1, d1).Single();
Assert(changed.Target == 250 && changed.CarriedDelay == 100, "Changement objectif");
Console.WriteLine("OK — 6 scénarios de calcul validés");
