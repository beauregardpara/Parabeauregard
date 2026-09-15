import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { createAdminUser, toggleAdminActive, changeAdminRole } from "@/lib/actions/admin";
import { PageHeader } from "@/components/admin-shell";

export default async function AdminUsersPage() {
  const users = await db.adminUser.findMany({ orderBy: { createdAt: "asc" } });

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-para-400";

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super-admin",
    CATALOG_MANAGER: "Gestionnaire catalogue",
    ORDER_MANAGER: "Gestionnaire commandes",
  };

  return (
    <>
      <PageHeader title="Utilisateurs admin" subtitle="Rôles et droits d'accès au panel (réservé au super-admin)." />

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className={`transition hover:bg-mint/30 ${!u.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-semibold">{u.name}</td>
                  <td className="px-4 text-slate-500">{u.email}</td>
                  <td className="px-4">
                    <form action={changeAdminRole} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-para-400">
                        {Object.entries(ROLE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <button className="btn-3d rounded-lg bg-para-50 px-2.5 py-1.5 text-xs font-bold text-para-700 hover:bg-para-100" aria-label={`Changer rôle ${u.email}`}>✓</button>
                    </form>
                  </td>
                  <td className="px-4">
                    <form action={toggleAdminActive}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className={`btn-3d rounded-lg px-3 py-1.5 text-xs font-bold ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        {u.active ? "Actif" : "Inactif"}
                      </button>
                    </form>
                  </td>
                  <td className="whitespace-nowrap px-4 text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-8 xl:self-start">
          <h2 className="mb-4 font-display font-bold">Nouvel administrateur</h2>
          <form action={createAdminUser} className="space-y-3">
            <input name="name" required placeholder="Nom complet *" className={inputCls} />
            <input name="email" type="email" required placeholder="Email *" className={inputCls} />
            <input name="password" type="password" required minLength={6} placeholder="Mot de passe (min. 6) *" className={inputCls} />
            <select name="role" className={inputCls} aria-label="Rôle">
              {Object.entries(ROLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button type="submit" className="btn-shine btn-3d w-full rounded-xl bg-gradient-to-r from-para-500 to-para-700 py-2.5 font-bold text-white">
              + Créer le compte
            </button>
          </form>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            Sécurité : mots de passe hachés (scrypt), sessions signées HMAC. Activez le 2FA sur votre
            hébergeur en production.
          </p>
        </aside>
      </div>
    </>
  );
}
