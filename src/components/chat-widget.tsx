"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ProductImage from "@/components/product-image";
import { useCart } from "@/lib/cart-context";
import { useEscapeClose } from "@/lib/use-escape-close";
import { isAssistantHiddenRoute } from "@/lib/chat/visibility";
import { MessageCircle, Send, X } from "lucide-react";

type ChatProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  promoPrice: number | null;
  imageUrl: string | null;
};

type Msg = { role: "user" | "assistant"; content: string; products?: ChatProduct[] };

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Bonjour 👋 Je suis l'assistant de Para Beauregard. Décrivez-moi votre besoin (ex. « une crème pour peau sèche, budget 150 DH ») et je vous recommande les meilleurs produits de notre catalogue.",
};

export function ChatWidget() {
  const pathname = usePathname();
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionKeyRef = useRef<string>("");
  const showFab = !cart.isOpen && !isAssistantHiddenRoute(pathname);
  const isProductRoute = /^\/produits\//.test(pathname);
  const isAdminRoute = /^\/admin(?:\/|$)/.test(pathname);

  useEscapeClose(open, () => setOpen(false));

  useEffect(() => {
    if (cart.isOpen) setOpen(false);
  }, [cart.isOpen]);

  useEffect(() => {
    const openFromMenu = () => setOpen(true);
    window.addEventListener("pb-open-chat", openFromMenu);
    return () => window.removeEventListener("pb-open-chat", openFromMenu);
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    let key = sessionStorage.getItem("pb_chat_key") ?? "";
    if (!key) {
      key =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem("pb_chat_key", key);
    }
    sessionKeyRef.current = key;

    try {
      const raw = sessionStorage.getItem("pb_chat");
      if (raw) setMessages(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    sessionStorage.setItem("pb_chat", JSON.stringify(messages.slice(-30)));
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, sessionKey: sessionKeyRef.current }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "Désolé, une erreur est survenue.", products: data.products },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Impossible de contacter l'assistant pour le moment." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showFab && <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
        className={`chat-fab ${isProductRoute ? "chat-fab-product" : ""} ${isAdminRoute ? "chat-fab-admin" : ""} fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-para-500 to-para-700 text-2xl text-white shadow-lift transition-transform hover:scale-105 active:scale-95 ${open ? "" : "pulse-ring"}`}
      >
        {open ? <X size={23} strokeWidth={2.2} /> : <MessageCircle size={24} strokeWidth={2.2} />}
      </button>}

      <div
        inert={!open}
        aria-modal="true"
        role="dialog"
        aria-label="Assistant Para Beauregard"
        className={`fixed bottom-[calc(var(--bn-height)+var(--bn-padding)+5.5rem)] right-4 z-[60] flex w-[min(94vw,400px)] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-para-100 bg-white shadow-2xl transition-all duration-300 lg:bottom-24 ${open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"}`}
      >
        <div className="bg-gradient-to-r from-para-600 to-para-500 px-5 py-3.5 text-white">
          <p className="font-display font-bold">Assistant Para Beauregard</p>
          <p className="flex items-center gap-1.5 text-xs opacity-90">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" /> En ligne — orientation produit, sans avis médical
          </p>
        </div>

        <div ref={listRef} aria-live="polite" className="max-h-[46vh] min-h-[240px] space-y-3 overflow-y-auto bg-mint/40 px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "rounded-br-md bg-gradient-to-br from-para-600 to-para-500 text-white"
                    : "rounded-bl-md border border-para-100 bg-white text-slate-700"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.products && m.products.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    {m.products.map((p) => (
                      <Link key={p.id} href={`/produits/${p.slug}`}
                        className="flex items-center gap-2.5 rounded-xl border border-para-100 bg-white p-2 transition hover:-translate-y-0.5 hover:shadow-md">
                        <ProductImage src={p.imageUrl} alt="" width={44} height={44} fallbackSeed={p.name} className="h-11 w-11 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">{p.name}</span>
                          <span className="text-[11px] text-slate-500">{p.brand}</span>
                        </span>
                        <span className="text-sm font-bold text-para-700">
                          {(p.promoPrice ?? p.price).toFixed(0)} DH
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-bl-md border border-para-100 bg-white px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-para-300" style={{ animationDelay: `${d * 150}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-para-100 px-3 pb-3 pt-2">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {["Peau sèche", "Anti-âge budget 200 DH", "Solaire enfant", "Cheveux qui tombent"].map((s) => (
              <button key={s} onClick={() => send(s)} disabled={loading}
                className="rounded-full border border-para-200 bg-white px-3 py-1 text-[11px] font-medium text-para-700 transition hover:bg-mint disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Décrivez votre besoin…"
              aria-label="Votre message"
              className="w-full rounded-full border border-para-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-para-400"
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="btn-shine btn-3d rounded-full bg-gradient-to-r from-para-500 to-para-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              aria-label="Envoyer"><Send size={16} /></button>
          </form>
          {/* Mention obligatoire en contexte parapharmacie. */}
          <p className="mt-2 text-center text-[11px] leading-snug text-slate-500">
            Les recommandations proposées ne remplacent pas l&apos;avis d&apos;un professionnel de santé.
          </p>
        </div>
      </div>
    </>
  );
}
