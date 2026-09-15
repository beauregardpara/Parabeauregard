import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { logoutAdmin } from "@/lib/actions/admin";
import { CartProvider } from "@/lib/cart-context";
import { ChatWidget } from "@/components/chat-widget";

export const metadata = { title: "Admin — Para Beauregard", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const admin = await db.adminUser.findUnique({ where: { id: session.sub } });
  if (!admin || !admin.active) redirect("/admin/login");

  return (
    <CartProvider>
      <AdminShell name={admin.name} role={admin.role}>
        <form action={logoutAdmin}>
          <button
            className="btn-3d fixed bottom-5 right-5 z-30 hidden rounded-full bg-white px-4 py-2.5 text-xs font-bold text-slate-500 shadow-lg ring-1 ring-slate-200 transition hover:text-red-600 lg:block"
            title="Fermer la session admin"
          >
            Déconnexion ⎋
          </button>
        </form>
        {children}
        <ChatWidget />
      </AdminShell>
    </CartProvider>
  );
}
