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
    // Local/generated outputs used in this repo:
    "dist/**",
    "tmp/**",
    "coverage/**",
    ".turbo/**",
    ".cache/**",
    "**/.cache/**",
    "tsconfig.tsbuildinfo",
    "public/opencv.js",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
