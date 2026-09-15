"use client";

import { useState } from "react";
import ProductImage from "@/components/product-image";
import { uploadProductImageAction } from "@/lib/actions/admin";
import type { updateProductImagesAction } from "@/lib/actions/admin";

type Props = {
  productId: number;
  productName: string;
  images: { id: number; url: string; alt: string | null }[];
  actionFn: typeof updateProductImagesAction;
};

export function ProductImagesEditor({ productId, productName, images, actionFn }: Props) {
  const [items, setItems] = useState(images);
  const [newUrl, setNewUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setPending(true);
    setMsg(null);
    const res = await actionFn(
      productId,
      items.map((i) => i.url)
    );
    setPending(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Images enregistrées." });
      setItems((prev) => prev.filter((i) => i.url));
    } else {
      setMsg({ ok: false, text: res.error ?? "Erreur lors de l'enregistrement." });
    }
  }

  async function uploadFiles(files: File[]) {
    const selected = files.slice(0, Math.max(0, 12 - items.length));
    if (!selected.length) return;
    setPending(true);
    setMsg(null);
    let uploaded = 0;
    for (const file of selected) {
    const data = new FormData();
    data.set("productId", String(productId));
    data.set("file", file);
    const result = await uploadProductImageAction(data);
    if (!result.ok || !result.url) {
      setMsg({ ok: false, text: result.error ?? "Upload impossible." });
        continue;
      }
      uploaded += 1;
      setItems((prev) => [...prev, { id: Date.now() + uploaded, url: result.url!, alt: productName }]);
    }
    setPending(false);
    if (uploaded) setMsg({ ok: true, text: `${uploaded} image${uploaded > 1 ? "s" : ""} ajoutée${uploaded > 1 ? "s" : ""}.` });
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setItems(copy);
  }

  function add() {
    const url = newUrl.trim();
    if (!url || items.some((i) => i.url === url)) return;
    setItems([...items, { id: Date.now(), url, alt: productName }]);
    setNewUrl("");
  }

  function remove(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {items.map((img, i) => (
          <div key={img.id} className="relative h-28 w-24 overflow-hidden rounded-xl border border-slate-100 bg-white">
            <ProductImage src={img.url} alt="" fill fallbackSeed={productName} sizes="80px" className="object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Supprimer cette image"
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-[11px] font-bold text-red-500 shadow hover:bg-red-500 hover:text-white"
            >
              ✕
            </button>
            <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">{i === 0 ? "Principale" : `#${i + 1}`}</span>
            <div className="absolute bottom-1 right-1 flex gap-0.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Déplacer vers la gauche" className="grid h-5 w-5 place-items-center rounded bg-white/90 text-[10px] disabled:opacity-30">←</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Déplacer vers la droite" className="grid h-5 w-5 place-items-center rounded bg-white/90 text-[10px] disabled:opacity-30">→</button>
            </div>
          </div>
        ))}
        {productName && (
          <div className="grid h-20 w-20 place-items-center rounded-xl border border-dashed border-slate-300 text-center text-[10px] leading-tight text-slate-400">
            {items.length} image(s)
          </div>
        )}
      </div>

      <label
        className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-para-200 bg-para-50/40 px-4 py-5 text-center text-xs text-para-700 transition hover:bg-para-50"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); void uploadFiles(Array.from(event.dataTransfer.files)); }}
      >
        <span className="font-bold">Déposer une image ici ou choisir un fichier</span>
        <span className="mt-1 text-[11px] text-slate-400">JPEG, PNG ou WEBP · 5 Mo maximum</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { void uploadFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ""; }} />
      </label>

      <div className="mt-4 flex gap-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="URL d'une image à ajouter…"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-para-400"
        />
        <button
          type="button"
          onClick={add}
          disabled={!newUrl.trim()}
          className="btn-3d shrink-0 rounded-xl bg-para-50 px-4 py-2 text-sm font-bold text-para-700 hover:bg-para-100 disabled:opacity-40"
        >
          + Ajouter
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-3d shrink-0 rounded-xl bg-para-800 px-4 py-2 text-sm font-bold text-white hover:bg-para-900 disabled:opacity-40"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
      </div>

      {msg && (
        <p className={`mt-2 text-xs font-semibold ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Photo réelle si elle existe, sinon illustration de secours automatique. Ordre = affichage.
      </p>
    </div>
  );
}
