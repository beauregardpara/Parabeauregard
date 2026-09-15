"use client";

import Link from "next/link";
import { useCompare } from "@/lib/compare-context";

export function CompareWidget() {
  const { count } = useCompare();
  if (count < 2) return null;

  return (
    <Link
      href="/comparateur"
      className="btn-3d fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full border border-para-200 bg-white/95 px-4 py-2.5 shadow-lift backdrop-blur sm:right-6"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-para-700" aria-hidden>
        <path d="M12 3v18" />
        <path d="M5 7h14" />
        <path d="M5 17h14" />
        <path d="M8 7v10" />
        <path d="M16 7v10" />
      </svg>
      <span className="text-sm font-bold text-para-900">Comparer ({count})</span>
    </Link>
  );
}
