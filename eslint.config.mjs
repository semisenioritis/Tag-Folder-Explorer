// @ts-check
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import svelte from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";

// Report-only for now: findings are tracked in docs/lint-backlog.md.
export default defineConfig([
globalIgnores(["node_modules", "dist", "main.js", "esbuild.config.mjs", "version-bump.mjs", "scripts", "docs", "codebase_plan"]),
...obsidianmd.configs.recommended,
{
languageOptions: {
parserOptions: {
// The classic "project" setting is used because the project service crashes
// with the pinned TypeScript 5.0 once many files are linted in one run.
project: ["./tsconfig.json"],
tsconfigRootDir: import.meta.dirname,
},
},
},
...svelte.configs["flat/recommended"],
{
files: ["**/*.svelte"],
languageOptions: {
parserOptions: {
parser: tseslint.parser,
extraFileExtensions: [".svelte"],
},
},
},
]);