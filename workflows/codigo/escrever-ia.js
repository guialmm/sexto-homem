// Asks Gemini for the edition's prose. The free tier is generous but bursty:
// a model may answer 503 at peak hours, and each one allows ~20 requests a day.
// So: try the models in order, wait and retry overloaded ones, skip a model whose
// daily quota is gone. If all fail, pass the error on: the edition goes out
// without commentary rather than not at all.
const MODELOS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-flash-lite-latest"];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const pedido = $input.first().json.requisicao;
const tentativas = [];
for (let rodada = 0; rodada < 3; rodada++) {
  for (const modelo of MODELOS) {
    if (tentativas.some((t) => t.modelo === modelo && t.semCota)) continue;
    try {
      const resposta = await this.helpers.httpRequest({
        method: "POST",
        url: `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        headers: { "x-goog-api-key": $env.GEMINI_API_KEY },
        body: pedido,
        json: true,
        timeout: 90000,
      });
      return [{ json: { ...resposta, modelo, tentativas } }];
    } catch (erro) {
      const status = erro.httpCode ?? erro.response?.status ?? erro.status;
      const texto = JSON.stringify(erro.response?.data ?? erro.message ?? "");
      tentativas.push({ modelo, status, semCota: status == 429 && texto.includes("PerDay") });
    }
  }
  await espera(15000 * (rodada + 1));
}
return [{ json: { error: { message: "todos os modelos do Gemini falharam" }, tentativas } }];
