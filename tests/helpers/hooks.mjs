import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const isFile = (p) => existsSync(p) && statSync(p).isFile();

// Resolver hook so plain `node --test` can import the app's server modules:
//  - maps the `@/*` tsconfig alias to src/*
//  - fills in the extension Next/Turbopack would otherwise infer
//  - redirects `server-only`/`client-only` (which throw outside a bundler) to a stub
const SRC = path.resolve(process.cwd(), "src");
const stub = (rel) => pathToFileURL(path.resolve(process.cwd(), rel)).href;
const EMPTY = stub("tests/helpers/empty.mjs");
const NEXT_SERVER = stub("tests/helpers/next-server.mjs");
const MONGOOSE = stub("tests/helpers/mongoose.mjs");

export async function resolve(specifier, context, next) {
  if (specifier === "server-only" || specifier === "client-only")
    return { url: EMPTY, shortCircuit: true };

  if (specifier === "next/server") return { url: NEXT_SERVER, shortCircuit: true };

  // Re-export shim so bare Node sees all of mongoose's named exports.
  if (specifier === "mongoose") return { url: MONGOOSE, shortCircuit: true };

  if (specifier.startsWith("@/")) {
    const base = path.join(SRC, specifier.slice(2));
    // Filenames like `user.model` carry a dot, so extname can't decide whether
    // an extension is present — probe candidates by existence instead.
    const target =
      [base, `${base}.js`, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.js")].find(
        isFile
      ) ?? base;
    return next(pathToFileURL(target).href, context);
  }

  return next(specifier, context);
}
