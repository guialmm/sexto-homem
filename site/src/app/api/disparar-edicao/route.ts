// Starts the daily edition on time. GitHub's own schedule can run hours late under load
// (on 2026-11-10 it fired at 15h11 instead of 7h37), but a workflow_dispatch starts in
// seconds. Vercel Cron calls this route every morning (see vercel.json); GitHub's
// schedule stays as a backup, and the workflow never sends the same edition twice.
const WORKFLOW = "https://api.github.com/repos/guialmm/sexto-homem/actions/workflows/edicao.yml/dispatches";

export async function GET(request: Request) {
  // Vercel Cron sends "Authorization: Bearer $CRON_SECRET"; anyone else gets a 401.
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) return Response.json({ ok: false, erro: "GH_DISPATCH_TOKEN ausente" }, { status: 500 });

  const r = await fetch(WORKFLOW, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sexto-homem-cron",
    },
    body: JSON.stringify({ ref: "main" }),
    signal: AbortSignal.timeout(15000),
  });
  if (r.status !== 204) {
    // A failed cron shows up in Vercel's logs; GitHub's schedule still runs later.
    console.error("disparo da edição falhou", r.status, await r.text());
    return Response.json({ ok: false, status: r.status }, { status: 502 });
  }
  return Response.json({ ok: true });
}
