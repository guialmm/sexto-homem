import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { carregar } from "./carregar.mjs";

const { lerRelatorio } = carregar("lesoes");
// Text of the real report published on 2026-10-21 at 09:45 ET, as pdf extraction returns it.
const relatorio = lerRelatorio(readFileSync(new URL("./lesoes-2026-10-21.txt", import.meta.url), "utf8"));

test("players land on the right team with a translated status", () => {
  assert.deepEqual(relatorio.ATL[0], { jogador: "Mouhamed Gueye", status: "fora", motivo: "Left Foot Fracture" });
  assert.equal(relatorio.MIL[0].status, "provável");
  assert.ok(relatorio.WSH.some((j) => j.jogador === "AJ Dybantsa"));
});

test("two-way players sent to the G League are not news", () => {
  const todos = Object.values(relatorio).flat();
  assert.ok(!todos.some((j) => /G League|Two-Way/.test(j.motivo)));
  assert.ok(!todos.some((j) => j.jogador === "RayJ Dennis"));
});

test("the page header repeated after a page break never leaks into a reason", () => {
  const todos = Object.values(relatorio).flat();
  assert.ok(!todos.some((j) => /Injury Report|Page \d|Game Date|\(ET\)/.test(j.motivo)), JSON.stringify(todos.filter((j) => /Injury Report|Page|ET/.test(j.motivo))));
  assert.equal(relatorio.CHA.find((j) => j.jogador === "Kon Knueppel").motivo, "Left Hamstring Strain");
});

test("words split across lines are rejoined", () => {
  const r = lerRelatorio("10/22/2026 08:00 (ET) OKC@DAL Oklahoma City Thunder Gilgeous- Alexander, Shai Questionable Injury/Illness - Left Ankle Sprain");
  assert.deepEqual(r.OKC, [{ jogador: "Shai Gilgeous-Alexander", status: "questionável", motivo: "Left Ankle Sprain" }]);
});

test("suffixes like Jr. stay with the last name", () => {
  const r = lerRelatorio("Miami Heat Jaquez Jr., Jaime Out Injury/Illness - Right Knee Soreness");
  assert.equal(r.MIA[0].jogador, "Jaime Jaquez Jr.");
});

test("an empty or missing report gives no teams", () => {
  assert.deepEqual(lerRelatorio(""), {});
  assert.deepEqual(lerRelatorio(undefined), {});
});
