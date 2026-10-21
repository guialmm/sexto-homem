// Loads a Code-node file outside n8n: without $input the file exports its functions.
import { readFileSync } from "node:fs";

export function carregar(nome) {
  const fonte = readFileSync(new URL(`../workflows/codigo/${nome}.js`, import.meta.url), "utf8");
  const modulo = { exports: {} };
  new Function("module", fonte)(modulo);
  return modulo.exports;
}
