import { defineConfig } from "oxlint";
import { react } from "oxlint-config";

export default defineConfig({
  extends: [react],
  overrides: [
    {
      files: ["src/components/ui/**"],
      rules: {
        "eslint/complexity": "off",
        "eslint/eqeqeq": "off",
        "eslint/no-eq-null": "off",
        "eslint/no-negated-condition": "off",
        "eslint/no-nested-ternary": "off",
        "eslint/no-param-reassign": "off",
        "eslint/no-shadow": "off",
        "eslint/no-use-before-define": "off",
        "jsx-a11y/anchor-has-content": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/label-has-associated-control": "off",
        "jsx-a11y/no-noninteractive-element-interactions": "off",
        "jsx-a11y/prefer-tag-over-role": "off",
        "typescript/no-non-null-assertion": "off",
        "unicorn/no-document-cookie": "off",
        "unicorn/no-negated-condition": "off",
      },
    },
  ],
});
