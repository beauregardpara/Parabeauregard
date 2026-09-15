"use client";

import { useCallback, useEffect, useState } from "react";
import ProductImage from "@/components/product-image";

export function Gallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [{ url: "", alt: name }];

  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const close = useCallback(() => {
    setLightbox(false);
    setZoomed(false);
  }, []);

  const next = useCallback(() => {
    setZoomed(false);
    setActive((i) => (i + 1) % list.length);
  }, [list.length]);

  const prev = useCallback(() => {
    setZoomed(false);
    setActive((i) => (i - 1 + list.length) % list.length);
  }, [list.length]);

  // Verrouiller le scroll + fermer sur Echap / flèches
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = original;
    };
  }, [lightbox, close, next, prev]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="zoom-frame relative block aspect-video w-full overflow-hidden rounded-3xl border border-para-100 bg-mint shadow-soft lg:aspect-square"
        aria-label={`Agrandir la photo ${active + 1} de ${name}`}
      >
        <ProductImage src={list[active].url} alt={list[active].alt} fill priority fallbackSeed={name} sizes="(max-width:1024px) 100vw, 560px" className="object-cover" />
        <p className="absolute bottom-3 right-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-para-700 backdrop-blur">
          🔍 Touchez pour agrandir
        </p>
      </button>

      {list.length > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`btn-3d relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                i === active ? "border-para-500 shadow" : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Voir l'image ${i + 1}`}
            >
              <ProductImage src={img.url} alt="" fill fallbackSeed={name} sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-para-950/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${active + 1} sur ${list.length} de ${name}`}
          onClick={(e) => {
            // Fermer uniquement en cliquant sur le fond, pas sur l'image
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-xs font-medium text-white/70">
              {name} — {active + 1}/{list.length}
            </span>
            <button onClick={close} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg transition hover:bg-white/20">
              ✕
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              className={`absolute inset-0 grid place-items-center ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              aria-label={zoomed ? "Réduire le zoom" : "Agrandir la photo"}
            >
              <ProductImage
                src={list[active].url}
                alt={list[active].alt}
                fill
                sizes="100vw"
                className={`object-contain transition-transform duration-300 ${zoomed ? "scale-[2]" : "scale-100"}`}
              />
            </button>

            {list.length > 1 && (
              <>
                <button
                  onClick={prev}
                  aria-label="Image précédente"
                  className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  aria-label="Image suivante"
                  className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setZoomed((z) => !z)}
            className="mx-auto mb-5 rounded-full bg-white/10 px-5 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            {zoomed ? "Réduire le zoom" : "Zoomer"}
          </button>
        </div>
      )}
    </div>
  );
}
