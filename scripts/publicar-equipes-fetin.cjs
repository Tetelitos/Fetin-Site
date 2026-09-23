const fs = require("node:fs");
const path = require("node:path");
const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const [serviceAccountPath, manifestPath] = process.argv.slice(2);

if (!serviceAccountPath || !manifestPath) {
  console.error(
    "Uso: node scripts/publicar-equipes-fetin.cjs <chave-firebase.json> <manifesto-privado.json>"
  );
  process.exit(1);
}

const readJson = (filePath) =>
  JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));

const serviceAccount = readJson(serviceAccountPath);
const manifest = readJson(manifestPath);

if (manifest.projectId !== "turismo-app-dc382") {
  throw new Error("O manifesto não pertence ao projeto turismo-app-dc382.");
}

if (!Array.isArray(manifest.entries) || manifest.entries.length !== 10) {
  throw new Error("O manifesto precisa conter exatamente 10 equipes.");
}

const ids = new Set();
for (const entry of manifest.entries) {
  const { team, token } = entry;
  if (!team?.id || ids.has(team.id)) throw new Error("ID de equipe ausente ou duplicado.");
  if (typeof token !== "string" || !token.startsWith(`${team.qrPrefix}_`)) {
    throw new Error(`Token inválido para ${team.id}.`);
  }
  ids.add(team.id);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const firestore = getFirestore(app);
const batch = firestore.batch();
const updatedAt = Timestamp.now();

for (const { team, token } of manifest.entries) {
  batch.set(firestore.collection("eventTeams").doc(team.id), team);
  batch.set(firestore.collection("eventQrTokens").doc(team.id), {
    teamId: team.id,
    token,
    updatedAt,
  });
}

batch
  .commit()
  .then(() => {
    console.log("10 equipes e 10 tokens publicados com sucesso.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Não foi possível publicar as equipes e os tokens.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
