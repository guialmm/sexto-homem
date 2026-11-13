// Prints the n8n credentials for production (GitHub Actions): the same ids the
// workflow references, pointing to Neon and Brevo instead of docker-compose.
//
//   DATABASE_URL=… SMTP_LOGIN=… SMTP_CHAVE=… node scripts/credenciais-ci.mjs > credenciais.json
const faltando = ["DATABASE_URL", "SMTP_LOGIN", "SMTP_CHAVE"].filter((v) => !process.env[v]);
if (faltando.length) {
  console.error(`faltam variáveis: ${faltando.join(", ")}`);
  process.exit(1);
}

const banco = new URL(process.env.DATABASE_URL);
const credenciais = [
  {
    id: "pgSextoHomem0001",
    name: "Postgres · Sexto Homem",
    type: "postgres",
    data: {
      host: banco.hostname,
      port: Number(banco.port || 5432),
      database: decodeURIComponent(banco.pathname.slice(1)),
      user: decodeURIComponent(banco.username),
      password: decodeURIComponent(banco.password),
      ssl: "require", // Neon only accepts TLS
      allowUnauthorizedCerts: false,
      sshTunnel: false,
    },
  },
  {
    id: "smtpSextoHomem01",
    name: "SMTP · Sexto Homem",
    type: "smtp",
    data: {
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: 587,
      secure: false, // 587 starts in plain text and upgrades with STARTTLS (Gmail and Brevo alike)
      disableStartTls: false,
      user: process.env.SMTP_LOGIN,
      password: process.env.SMTP_CHAVE,
    },
  },
];
process.stdout.write(JSON.stringify(credenciais, null, 2));
