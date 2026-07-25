import { register } from "node:module";

// Loaded via `--import` so the resolve hook is active before any test file
// imports an `@/`-aliased app module.
register("./hooks.mjs", import.meta.url);
