import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { saveCoupon, toggleCoupon } from "@/lib/actions/admin";
import { PageHeader } from "@/components/admin-shell";

export default async function AdminCouponsPage() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-para-400";

  return (
    <>
      <PageHeader title="Codes promo" subtitle="Réductions en pourcentage ou montant fixe." />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Valeur</th>
                <th className="px-4 py-3">Min. commande</th>
                <th className="px-4 py-3">Utilisations</th>
                <th className="px-4 py-3">Valide du → au</th>
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {coupons.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Aucun code promo actif.</td></tr>
              )}
              {coupons.map((c) => {
                const now = new Date();
                const expired = c.endsAt != null && now > c.endsAt;
                const notStarted = c.startsAt != null && now < c.startsAt;
                return (
                <tr key={c.id} className={`transition hover:bg-mint/30 ${!c.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-mono font-bold text-para-800">{c.code}</td>
                  <td className="px-4">{c.type === "PERCENT" ? "%" : "DH"}</td>
                  <td className="px-4 font-bold">{c.type === "PERCENT" ? `-${c.value}%` : formatPrice(c.value)}</td>
                  <td className="px-4">{c.minOrder > 0 ? formatPrice(c.minOrder) : "—"}</td>
                  <td className="px-4">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                  <td className="whitespace-nowrap px-4 text-xs">
                    {c.endsAt || c.startsAt ? (
                      <span className={`${expired ? "text-red-500" : notStarted ? "text-amber-600" : "text-slate-400"}`}>
                        {c.startsAt ? formatDate(c.startsAt) : "—"} → {c.endsAt ? formatDate(c.endsAt) : "∞"}
                        {expired && " (expiré)"}
                        {notStarted && " (pas encore actif)"}
                      </span>
                    ) : "Illimité"}
                  </td>
                  <td className="whitespace-nowrap px-4 text-xs text-slate-400">{formatDate(c.createdAt)}</td>
                  <td className="px-4">
                    <form action={toggleCoupon}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className={`btn-3d rounded-lg px-3 py-1.5 text-xs font-bold ${c.active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                        {c.active ? "Désactiver" : "Activer"}
                      </button>
                    </form>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-8 xl:self-start">
          <h2 className="mb-4 font-display font-bold">Nouveau code promo</h2>
          <form action={saveCoupon} className="space-y-3">
            <input name="code" required placeholder="CODE2026 *" className={`${inputCls} font-mono uppercase`} />
            <select name="type" className={inputCls} aria-label="Type de réduction">
              <option value="PERCENT">Pourcentage (%)</option>
              <option value="FIXED">Montant fixe (DH)</option>
            </select>
            <input name="value" type="number" step="0.01" min="0.01" required placeholder="Valeur *" className={inputCls} />
            <input name="minOrder" type="number" step="0.01" min="0" placeholder="Commande minimum (DH)" className={inputCls} />
            <input name="usageLimit" type="number" min="1" placeholder="Limite d'utilisations" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-400">Début (optionnel)</span>
                <input name="startsAt" type="datetime-local" className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-400">Fin (optionnel)</span>
                <input name="endsAt" type="datetime-local" className={inputCls} />
              </label>
            </div>
            <button type="submit" className="btn-shine btn-3d w-full rounded-xl bg-gradient-to-r from-para-500 to-para-700 py-2.5 font-bold text-white">
              + Créer le code
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
