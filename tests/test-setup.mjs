import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const resolved = require.resolve("server-only");

if (!require.cache[resolved]) {
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
    children: [],
    path: resolved,
    paths: []
  };
}
