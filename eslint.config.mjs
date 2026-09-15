import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "test-results/**",
      "playwright-report/**",
      "public/**",
      "docs/**",
      "prisma/**",
      "scripts/**",
      "para-beauregard-mockup/**",
      "next-env.d.ts",
      "test-scraper.cjs",
    ],
  },
  {
    rules: {
      // Contenu éditorial en français : les apostrophes sont légitimes en JSX
      // (le HTML rendu reste correct ; l'échappement systématique dégraderait le texte).
      "react/no-unescaped-entities": "off",
    },
  },
  {
    files: ["tests/**"],
    rules: {
      // Mocks vitest en style CommonJS volontaire.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default config;