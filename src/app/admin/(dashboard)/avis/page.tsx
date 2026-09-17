import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { moderateReview, toggleVerifiedReview } from "@/lib/actions/admin";
import { StatusPill } from "@/components/status-pill";
import { PageHeader } from "@/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/auth";

export default async function AdminReviewsPage() {
  await requireAdminPagePermission("reviews:read");
  const reviews = await db.review.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { product: { select: { name: true, slug: true } } },
    take: 100,
  });

  return (
    <>
      <PageHeader title="Avis clients" subtitle="Modérez les avis avant publication sur les fiches produits." />

      <div className="space-y-3">
        {reviews.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-slate-400">
            Aucun avis à modérer.
          </p>
        )}
        {reviews.map((r) => (
          <article key={r.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xl text-amber-500" aria-label={`${r.rating}/5`}>{"★".repeat(r.rating)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm"><strong>{r.author}</strong> — {r.product?.name}</p>
              {r.comment && <p className="mt-0.5 text-sm text-slate-600">{r.comment}</p>}
              <p className="mt-1 text-xs text-slate-400">{formatDate(r.createdAt)}</p>
            </div>
            <StatusPill status={r.status} />
            {r.verifiedPurchase && (
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">✓ Achat vérifié</span>
            )}
            {r.status === "APPROVED" && (
              <form action={toggleVerifiedReview}>
                <input type="hidden" name="id" value={r.id} />
                <button className={`btn-3d rounded-lg px-3 py-1.5 text-xs font-bold ${r.verifiedPurchase ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-50" : "bg-slate-50 text-slate-500 hover:bg-emerald-50"}`}>
                  {r.verifiedPurchase ? "✓ Vérifié" : "Marquer vérifié"}
                </button>
              </form>
            )}
            {r.status !== "APPROVED" && (
              <form action={moderateReview}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="APPROVED" />
                <button className="btn-3d rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">✓ Approuver</button>
              </form>
            )}
            {r.status !== "REJECTED" && (
              <form action={moderateReview}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="REJECTED" />
                <button className="btn-3d rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100">✕ Rejeter</button>
              </form>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
