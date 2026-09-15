import type { Metadata } from "next";
import { CartClient } from "@/components/cart-client";
import { ProductRail } from "@/components/product-rail";

export const metadata: Metadata = { title: "Mon panier" };

export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <>
      <CartClient />
      <div className="mx-auto max-w-7xl px-4 pb-[calc(var(--bn-height)+var(--bn-padding)+1.5rem)] lg:pb-20">
        <ProductRail
          title="Vous pourriez aussi aimer"
          subtitle="Complétez votre panier avec nos best-sellers."
          limit={8}
        />
      </div>
    </>
  );
}
