import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";

const PROJECT_OWNER_UID = "AyqcaBcvGKdm0sVWonLVPv4MAjP2";

type AdminUserResponse = {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  disabled: boolean;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

const getAdminApp = () => {
  if (getApps().length > 0) return getApp();

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON não configurada.");
  }

  const serviceAccount = JSON.parse(rawServiceAccount) as {
    project_id?: string;
    client_email?: string;
    private_key?: string;
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  };
  const projectId = serviceAccount.project_id ?? serviceAccount.projectId;
  const clientEmail = serviceAccount.client_email ?? serviceAccount.clientEmail;
  const privateKey = (serviceAccount.private_key ?? serviceAccount.privateKey)?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Credencial administrativa do Firebase inválida.");
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
};

const authorizeOwner = async (request: Request) => {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!token) throw new Error("unauthorized");

  const decoded = await getAuth(getAdminApp()).verifyIdToken(token, true);
  if (decoded.uid !== PROJECT_OWNER_UID) throw new Error("forbidden");
  return decoded;
};

const deleteDocuments = async (references: DocumentReference[]) => {
  const firestore = getFirestore(getAdminApp());

  for (let index = 0; index < references.length; index += 400) {
    const batch = firestore.batch();
    references.slice(index, index + 400).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
};

const deleteUserData = async (uid: string) => {
  const firestore = getFirestore(getAdminApp());
  const collections = [
    "visits",
    "rewards",
    "ratings",
    "comments",
    "eventVisits",
    "eventVisitProofs",
  ];
  const snapshots = await Promise.all(
    collections.map((name) => firestore.collection(name).where("userId", "==", uid).get())
  );
  const xpEvents = await firestore.collection("ranking").doc(uid).collection("xpEvents").get();
  const references = snapshots.flatMap((snapshot) => snapshot.docs.map((item) => item.ref));

  references.push(...xpEvents.docs.map((item) => item.ref));
  references.push(
    firestore.collection("users").doc(uid),
    firestore.collection("ranking").doc(uid),
    firestore.collection("eventRanking").doc(uid)
  );

  await deleteDocuments(references);
};

const listUsers = async () => {
  const adminApp = getAdminApp();
  const auth = getAuth(adminApp);
  const firestore = getFirestore(adminApp);
  const users: AdminUserResponse[] = [];
  let pageToken: string | undefined;

  do {
    const page = await auth.listUsers(500, pageToken);
    const profileRefs = page.users.map((user) => firestore.collection("users").doc(user.uid));
    const profiles = profileRefs.length > 0 ? await firestore.getAll(...profileRefs) : [];

    page.users.forEach((user, index) => {
      const profile = profiles[index]?.data();
      const email = user.email ?? (typeof profile?.email === "string" ? profile.email : "");
      const displayName =
        user.displayName ||
        (typeof profile?.displayName === "string" ? profile.displayName : "") ||
        email.split("@")[0];

      users.push({
        uid: user.uid,
        displayName: displayName || email.split("@")[0] || "Usuário",
        email,
        phoneNumber:
          (typeof profile?.phoneNumber === "string" ? profile.phoneNumber : "") ||
          user.phoneNumber ||
          "",
        createdAt: user.metadata.creationTime,
        disabled: user.disabled,
      });
    });

    pageToken = page.pageToken;
  } while (pageToken);

  return users.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));
};

export default {
  async fetch(request: Request) {
    try {
      await authorizeOwner(request);

      if (request.method === "GET") {
        return json({ users: await listUsers() });
      }

      if (request.method === "DELETE") {
        const body = (await request.json().catch(() => null)) as { uid?: unknown } | null;
        const uid = typeof body?.uid === "string" ? body.uid.trim() : "";

        if (!uid) return json({ error: "Usuário inválido." }, 400);
        if (uid === PROJECT_OWNER_UID) {
          return json({ error: "A conta administradora não pode ser apagada pelo painel." }, 400);
        }

        await getAuth(getAdminApp()).deleteUser(uid);
        await deleteUserData(uid).catch((error) => {
          console.error("Conta apagada, mas a limpeza de dados falhou.", error);
        });

        return json({ ok: true });
      }

      return json({ error: "Método não permitido." }, 405);
    } catch (error) {
      if (error instanceof Error && error.message === "unauthorized") {
        return json({ error: "Faça login para continuar." }, 401);
      }
      if (error instanceof Error && error.message === "forbidden") {
        return json({ error: "Acesso restrito ao administrador." }, 403);
      }

      console.error(error);
      return json({ error: "Não foi possível concluir a operação administrativa." }, 500);
    }
  },
};
