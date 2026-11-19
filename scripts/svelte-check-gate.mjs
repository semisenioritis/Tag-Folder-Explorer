// Runs svelte-check and fails only if the error count exceeds the recorded baseline.
// Lower BASELINE_ERRORS as errors are fixed. Remove this script once it reaches 0.
import { spawnSync } from "child_process";

const BASELINE_ERRORS = 7;

const result = spawnSync(
process.execPath,
["node_modules/svelte-check/bin/svelte-check", "--tsconfig", "tsconfig.json", "--output", "machine"],
{ encoding: "utf8" },
);

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const match = output.match(/COMPLETED \d+ FILES (\d+) ERRORS (\d+) WARNINGS/);

if (!match) {
console.error(output);
console.error("svelte-check gate: could not read the svelte-check summary.");
process.exit(1);
}

const errors = Number(match[1]);
const warnings = Number(match[2]);
console.log(`svelte-check: ${errors} errors, ${warnings} warnings (baseline ${BASELINE_ERRORS} errors)`);

if (errors > BASELINE_ERRORS) {
console.error(output);
console.error("svelte-check gate: more errors than the baseline.");
process.exit(1);
}