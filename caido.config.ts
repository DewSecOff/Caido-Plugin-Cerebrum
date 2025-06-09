import { defineConfig } from '@caido-community/dev';
import vue from '@vitejs/plugin-vue';
import tailwindcss from "tailwindcss";
// @ts-expect-error no declared types at this time
import tailwindPrimeui from "tailwindcss-primeui";
import tailwindCaido from "@caido/tailwindcss";
import path from "path";
import prefixwrap from "postcss-prefixwrap";

// Unique ID for plugin (used as root CSS scope)
const id = "cerebrum";

export default defineConfig({
  id: "cerebrum",
  name: "Cerebrum",
  description: "A simple organizer-like plugin for Caido to help you manage, annotate, and sort HTTP requests.",
  version: "1.0.1",
  author: {
    name: "DewSecOff",
    email: "DewSecOff@protonmail.com",
    url: "https://your-portfolio.com",
  },
  plugins: [
    {
      kind: "backend",
      id: "backend",
      root: "packages/backend",
    },
    {
      kind: "frontend",
      id: "frontend",
      root: "packages/frontend",
      backend: {
        id: "backend",
      },
      vite: {
        plugins: [vue()],
        build: {
          rollupOptions: {
            external: [
              '@caido/frontend-sdk',
              "@codemirror/state",
              "@codemirror/view",
              "@codemirror/autocomplete",
              "@codemirror/commands",
              "@codemirror/lint",
              "@codemirror/search",
              "@codemirror/language",
              "@lezer/common",
              "@lezer/highlight",
              "@lezer/lr"
            ]
          }
        },
        resolve: {
          alias: [
            {
              find: "@",
              replacement: path.resolve(__dirname, "packages/frontend/src"),
            },
          ],
        },
        css: {
          postcss: {
            plugins: [
              prefixwrap(`#plugin--${id}`),
              tailwindcss({
                corePlugins: {
                  preflight: false,
                },
                content: [
                  './packages/frontend/src/**/*.{vue,ts}',
                  './node_modules/@caido/primevue/dist/primevue.mjs'
                ],
                darkMode: ["selector", '[data-mode="dark"]'],
                plugins: [
                  tailwindPrimeui,
                  tailwindCaido,
                ],
              }),
            ],
          },
        },
      },
    },
  ],
});
