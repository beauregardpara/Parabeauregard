"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useEscapeClose } from "@/lib/use-escape-close";
import { BrandLogo } from "@/components/brand-logo";
import { canAccessAdminSection } from "@/lib/admin-permissions";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Database, FolderTree, Globe2, KeyRound, MessageCircle, Package, ScrollText, Settings, ShieldCheck, ShoppingBag, Star, TicketPercent, Undo2, Users } from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon; roles?: string[] }[] = [
  { href: "/admin", label: "Tableau de bord", icon: BarChart3 },
  { href: "/admin/produits", label: "Produits", icon: Package },
  { href: "/admin/categories", label: "Catégories", icon: FolderTree },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/retours", label: "Retours", icon: Undo2 },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/avis", label: "Avis clients", icon: Star },
  { href: "/admin/promotions", label: "Codes promo", icon: TicketPercent },
  { href: "/admin/scraper", label: "Scraper & sources", icon: Database },
  { href: "/admin/quality", label: "Qualité catalogue", icon: ShieldCheck },
  { href: "/admin/system", label: "Système & santé", icon: Settings },
  { href: "/admin/chat", label: "Chat IA", icon: MessageCircle },
  { href: "/admin/reputation", label: "Réputation Web", icon: Globe2 },
  {
    href: "/admin/utilisateurs",
    label: "Utilisateurs",
    icon: KeyRound,
    roles: ["SUPER_ADMIN"],
  },
  { href: "/admin/journal", label: "Journal d'activité", icon: ScrollText },
];

export function AdminShell({
  children,
  name,
  role,
}: {
  children: React.ReactNode;
  name: string;
  role: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEscapeClose(open, () => setOpen(false));

  return (
    <div className="flex min-h-dvh bg-[#faf8f6]">
      {/* Sidebar */}
      <aside
        inert={!open}
        aria-label="Navigation admin"
        className={`fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto bg-gradient-to-b from-para-950 to-para-900 text-white transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="leading-tight">
            <BrandLogo dark />
            <p className="ml-12 text-[11px] text-para-300">Panel d'administration</p>
          </div>
        </div>

        <nav className="space-y-0.5 px-3 pb-6" aria-label="Navigation admin">
          {NAV.filter((n) => (!n.roles || n.roles.includes(role)) && canAccessAdminSection(role, n.href)).map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition ${
                  active
                    ? "bg-white/15 font-bold text-white shadow-inner"
                    : "text-para-100/80 hover:bg-white/8 hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} strokeWidth={1.7} aria-hidden /> {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 mb-6 rounded-2xl bg-white/8 p-4 text-xs leading-relaxed">
          <p className="font-bold">{name}</p>
          <p className="mt-0.5 text-para-300">{role.replace("_", " ").toLowerCase()}</p>
          <Link href="/" target="_blank" className="mt-3 inline-block rounded-lg bg-white/15 px-3 py-1.5 font-semibold transition hover:bg-white/25">
            ↗ Voir le site
          </Link>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-xl hover:bg-para-50" aria-label="Ouvrir le menu">☰</button>
          <p className="font-display font-bold text-para-900">Admin</p>
        </header>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-para-950">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
