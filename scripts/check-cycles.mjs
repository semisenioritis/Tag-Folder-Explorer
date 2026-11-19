// Reports runtime import cycles under src/ (TypeScript and Svelte files).
// `import type` statements are erased at build time, so they do not count.
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join, dirname, resolve, relative } from "path";

const root = resolve("src");
const files = [];
(function walk(dir) {
for (const name of readdirSync(dir)) {
const p = join(dir, name);
if (statSync(p).isDirectory()) walk(p);
else if (/\.(ts|svelte)$/.test(name)) files.push(p);
}
})(root);

function resolveImport(from, spec) {
if (!spec.startsWith(".")) return null;
const base = resolve(dirname(from), spec);
for (const candidate of [base, `${base}.ts`, `${base}.svelte`, join(base, "index.ts")]) {
if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
}
return null;
}

const importRe = /^\s*(import|export)\s+(type\s+)?([^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm;
const graph = new Map();
for (const file of files) {
let text = readFileSync(file, "utf8");
if (file.endsWith(".svelte")) {
const m = text.match(/<script[^>]*>([\s\S]*?)<\/script>/);
text = m ? m[1] : "";
}
text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const deps = new Set();
for (const m of text.matchAll(importRe)) {
if (m[2]) continue; // import type
// `import { type A } from` still keeps the import at runtime only if a value is used; treat as runtime.
const target = resolveImport(file, m[4]);
if (target) deps.add(target);
}
graph.set(file, [...deps]);
}

const cycles = [];
const state = new Map();
const stack = [];
function visit(node) {
state.set(node, 1);
stack.push(node);
for (const next of graph.get(node) ?? []) {
if (state.get(next) === 1) cycles.push([...stack.slice(stack.indexOf(next)), next]);
else if (!state.has(next)) visit(next);
}
stack.pop();
state.set(node, 2);
}
for (const f of files) if (!state.has(f)) visit(f);

if (cycles.length) {
console.error(`Found ${cycles.length} import cycle(s):`);
for (const c of cycles) console.error("  " + c.map((p) => relative(root, p)).join(" -> "));
process.exit(1);
}
console.log(`No import cycles (${files.length} files checked).`);