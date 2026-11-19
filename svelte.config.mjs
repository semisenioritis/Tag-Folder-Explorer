// Shared Svelte compiler options. Imported by esbuild.config.mjs and read by svelte-check.
import sveltePreprocess from "svelte-preprocess";

export default {
compilerOptions: {
experimental: {
async: true,
},
},
preprocess: sveltePreprocess(),
};