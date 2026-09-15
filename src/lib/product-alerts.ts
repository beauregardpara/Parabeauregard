import { db } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";

/**
 * Notifie les clients ayant posé une alerte « produit de nouveau en stock ».
 * Dédupliqué : l'alerte est consommée (notifiedAt) une seule fois.
 */
export async function notifyStockAlerts(productId: number): Promise<number> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { name: true, slug: true, stock: true, unlimitedStock: true, status: true },
  });
  if (!product || product.status !== "PUBLISHED") return 0;
  if (!product.unlimitedStock && product.stock <= 0) return 0;

  const alerts = await db.productAlert.findMany({
    where: { productId, notifiedAt: null },
    select: { id: true, email: true },
    take: 200,
  });
  if (alerts.length === 0) return 0;

  let notified = 0;
  for (const alert of alerts) {
    await sendTransactionalEmail({
      to: alert.email,
      template: "stock-alert",
      data: { productName: product.name, slug: product.slug },
    });
    await db.productAlert.update({ where: { id: alert.id }, data: { notifiedAt: new Date() } });
    notified++;
  }
  return notified;
}