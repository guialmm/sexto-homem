// Loads a Code-node file outside n8n: without $input the file exports its functions.
import { readFileSync } from "node:fs";

// n8n runs Code nodes inside an async function, so the n8n branch may use top-level
// await; the test branch never awaits, so the exports are set synchronously.
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

export function carregar(nome) {
  const fonte = readFileSync(new URL(`../workflows/codigo/${nome}.js`, import.meta.url), "utf8");
  const modulo = { exports: {} };
  new AsyncFunction("module", fonte)(modulo);
  return modulo.exports;
}
