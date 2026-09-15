"use client";

/**
 * Boundary d'erreur racine : capture tout échec non récupérable au niveau
 * du layout <html>. Doit contenir ses propres <html>/<body> (Next.js 15).
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "1.5rem", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0b2e26" }}>
              Une erreur est survenue
            </h1>
            <p style={{ color: "#475569", marginTop: "0.5rem" }}>
              Veuillez réessayer ou revenir à l&apos;accueil dans quelques instants.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "1rem",
                background: "#0f766e",
                color: "#fff",
                border: "none",
                borderRadius: "999px",
                padding: "0.75rem 1.5rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}