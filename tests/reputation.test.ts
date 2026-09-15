import { describe, expect, it } from "vitest";
import { canonicalUrl, classifySentiment, normalizeCandidates, safePublicHttpUrl } from "@/lib/reputation/normalize";
import { confidenceForSources, percentages, reputationLabel } from "@/lib/reputation/scoring";

describe("réputation web", () => {
  it("rejette les schémas dangereux et les hôtes privés", () => {
    expect(safePublicHttpUrl("file:///etc/passwd")).toBeNull();
    expect(safePublicHttpUrl("http://127.0.0.1:3000/admin")).toBeNull();
    expect(safePublicHttpUrl("http://192.168.1.2/source")).toBeNull();
    expect(safePublicHttpUrl("https://example.com/review")).not.toBeNull();
  });

  it("canonicalise et déduplique les URLs et contenus miroirs", () => {
    const sources = normalizeCandidates([
      { url: "https://www.example.com/review/?utm_source=x", title: "Avis", excerpt: "Texture agréable" },
      { url: "https://example.com/review#comment", title: "Avis", excerpt: "Texture agréable" },
      { url: "https://other.example/review", title: "Autre avis", excerpt: "Efficace" },
    ]);
    expect(sources).toHaveLength(2);
    expect(canonicalUrl(sources[0].url)).toBe(sources[0].url);
  });

  it("classifie le sentiment avec un fallback déterministe", () => {
    expect(classifySentiment("Texture agréable et hydratante, je recommande")).toBe("POSITIVE");
    expect(classifySentiment("Prix cher et expérience décevante")).toBe("NEGATIVE");
    expect(classifySentiment("Informations générales sur le produit")).toBe("NEUTRAL");
  });

  it("calcule des pourcentages qui totalisent 100", () => {
    const sources = normalizeCandidates([
      { url: "https://a.example/1", excerpt: "Efficace" },
      { url: "https://b.example/2", excerpt: "Neutre" },
      { url: "https://c.example/3", excerpt: "Prix cher et décevant" },
    ]);
    const values = percentages(sources);
    expect(values.positive + values.neutral + values.negative).toBe(100);
  });

  it("ne donne pas une confiance élevée avec une seule source", () => {
    const sources = normalizeCandidates([{ url: "https://a.example/1", excerpt: "Efficace" }]);
    expect(confidenceForSources(sources)).toBe("LOW");
    expect(reputationLabel(sources)).toBe("Peu documentée");
  });

  it("atteint la confiance moyenne avec trois domaines indépendants", () => {
    const sources = normalizeCandidates([
      { url: "https://a.example/1", excerpt: "Efficace" },
      { url: "https://b.example/2", excerpt: "Très agréable" },
      { url: "https://c.example/3", excerpt: "Neutre" },
    ]);
    expect(confidenceForSources(sources)).toBe("MEDIUM");
    expect(reputationLabel(sources)).toBe("Positive");
  });
});
