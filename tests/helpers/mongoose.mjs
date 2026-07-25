import { createRequire } from "node:module";

// mongoose v9 is CommonJS. Bundlers detect its named exports, but bare Node's
// cjs-module-lexer misses `models` (a defined getter), so `import { models }`
// fails. Load the CJS module and re-export the names the app uses explicitly.
const require = createRequire(import.meta.url);
const mongoose = require("mongoose");

export default mongoose;
export const { Schema, model, models, isValidObjectId } = mongoose;
