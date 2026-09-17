import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin-shell";
import { AdminProductForm } from "@/components/admin-product-form";
import { requireAdminPagePermission } from "@/lib/auth";

export default async function NewAdminProductPage() {
  await requireAdminPagePermission("products:write");
  const categories = await db.category.findMany({ orderBy: [{ parentId: "asc" }, { order: "asc" }] });
  return (
    <>
      <PageHeader title="Ajouter un produit" subtitle="Créez une fiche contrôlée et préparez sa publication." action={<Link href="/admin/produits" className="text-sm font-semibold text-para-700">← Retour aux produits</Link>} />
      <AdminProductForm categories={categories} />
    </>
  );
}
