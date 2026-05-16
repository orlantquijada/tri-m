import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export const base = defineConfig({
  extends: [core],
  rules: {
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
  },
});
