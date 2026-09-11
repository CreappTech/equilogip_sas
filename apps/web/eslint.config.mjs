import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Template TailAdmin vendido (heredado); vive bajo src/. El patrón
    // recursivo cubre cualquier profundidad.
    "**/nextjs-admin-dashboard-main-template/**",
  ]),
]);

export default eslintConfig;
