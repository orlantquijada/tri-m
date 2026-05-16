import { defineConfig } from "oxlint";
import reactPreset from "ultracite/oxlint/react";
import remix from "ultracite/oxlint/remix";
import vitest from "ultracite/oxlint/vitest";

import { base } from "./base.ts";

export const react = defineConfig({
  extends: [base, reactPreset, remix, vitest],
});
