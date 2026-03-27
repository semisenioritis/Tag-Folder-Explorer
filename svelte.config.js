// svelte.config.js
import sveltePreprocess from 'svelte-preprocess';

export default {
  compilerOptions: {
    experimental: {
      async: true
    }
  },
  preprocess: sveltePreprocess()
};