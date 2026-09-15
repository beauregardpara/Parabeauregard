"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Barre de progression de lecture fixée en haut de page. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      el.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="scroll-progress" aria-hidden />;
}

/** Compteur animé déclenché à l'apparition. */
export function CountUp({
  to,
  suffix = "",
  duration = 1600,
  decimals = 0,
}: {
  to: number;
  suffix?: string;
  duration?: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setValue(to);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(to * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref}>
      {value.toLocaleString("fr-FR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/** Révèle son contenu avec un fondu + translation au scroll. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3 | 4;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          observer.disconnect();
        }
      },
      // Déclenchement anticipé : l'élément finit son apparition AVANT d'être
      // réellement à l'écran. Sans cette marge, une carte pouvait encore se
      // déplacer au moment où l'utilisateur la touchait.
      { threshold: 0, rootMargin: "0px 0px 20% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${delay ? `reveal-d${delay}` : ""} ${className}`}>
      {children}
    </div>
  );
}

/** Effet d'inclinaison 3D suivant le pointeur + reflet lumineux. */
export function TiltCard({
  children,
  className = "",
  intensity = 10,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Inutile et source de jank sur écran tactile / scénario réduit : on désactive le tilt.
    if (!finePointer || reducedMotion) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (py - 0.5) * -2 * intensity;
      const ry = (px - 0.5) * 2 * intensity;
      el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
      el.classList.add("tilt-active");
      el.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
    };

    const onLeave = () => {
      el.style.transform = "";
      el.classList.remove("tilt-active");
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [intensity]);

  return (
    <div className={`scene`}>
      <div ref={ref} className={`tilt relative ${className}`}>
        {children}
        <div className="glare" aria-hidden />
      </div>
    </div>
  );
}

/** Parallaxe légère de la souris pour les éléments du hero. */
export function useMouseParallax(strength = 18) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * strength;
        const y = (e.clientY / window.innerHeight - 0.5) * strength;
        el.querySelectorAll<HTMLElement>("[data-parallax]").forEach((child) => {
          const depth = parseFloat(child.dataset.parallax || "1");
          child.style.transform = `translate3d(${(-x * depth).toFixed(1)}px, ${(-y * depth).toFixed(1)}px, 0)`;
        });
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [strength]);

  return ref;
}
