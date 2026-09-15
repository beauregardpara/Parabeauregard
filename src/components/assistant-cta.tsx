"use client";

import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";

export function AssistantCta({ children = "Demander conseil" }: { children?: ReactNode }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("pb-open-chat"))}
      className="btn-shine btn-3d inline-flex items-center gap-2 rounded-full bg-para-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-para-700">
      <MessageCircle size={16} strokeWidth={1.8} aria-hidden />{children}
    </button>
  );
}
