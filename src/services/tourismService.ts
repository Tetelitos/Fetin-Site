import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Transaction,
  where,
} from "firebase/firestore";

import {
  CENTRO_SANTA_RITA,
  CORES_POR_TIPO,
  IMAGENS_POR_TIPO,
  PREMIOS_POR_TIPO,
  normalizarTipoPonto,
} from "@/src/data/routes";
import { db } from "@/src/firebaseConfig";
import { adicionarXpNaTransacao } from "@/src/services/rankingService";
import {
  HORARIO_ABERTURA_PADRAO,
  HORARIO_FECHAMENTO_PADRAO,
} from "@/src/utils/openingHours";
import type {
  Comentario,
  DadosLocal,
  Ponto,
  Rota,
  RotasPorId,
  TipoPonto,
  ValidacaoDetalhada,
} from "@/src/types/tourism";

type FirestoreRecord = Record<string, unknown>;

type CriarRotaPersonalizadaInput = {
  nome: string;
  tipo: string;
  descricao: string;
  createdBy: string;
  latitude?: number;
  longitude?: number;
};

const MAX_PONTOS_POR_PROVA_DE_ROTA = 8;
const DURACAO_VISITA_MS = 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is FirestoreRecord =>
  typeof value === "object" && value !== null;

const toText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
};

const getNomeUsuario = (userName?: string | null, userEmail?: string | null) => {
  if (typeof userName === "string" && userName.trim()) {
    return userName.trim();
  }

  if (typeof userEmail === "string" && userEmail.trim()) {
    return userEmail.split("@")[0];
  }

  return "Visitante";
};

const registrarProvasDeConclusaoDaRota = (
  transaction: Transaction,
  userId: string,
  routeId: string,
  rota: Rota
) => {
  const placeIds = rota.pontos.map((ponto) => ponto.id);

  for (
    let inicio = 0;
    inicio < placeIds.length;
    inicio += MAX_PONTOS_POR_PROVA_DE_ROTA
  ) {
    const segment = inicio / MAX_PONTOS_POR_PROVA_DE_ROTA + 1;
    const proofRef = doc(
      db,
      "ranking",
      userId,
      "xpEvents",
      `routeProof_${routeId}_${segment}`
    );

    transaction.set(proofRef, {
      kind: "routeCompletionProof",
      userId,
      routeId,
      segment,
      placeIds: placeIds.slice(
        inicio,
        inicio + MAX_PONTOS_POR_PROVA_DE_ROTA
      ),
      createdAt: serverTimestamp(),
    });
  }
};

const normalizarPonto = (
  routeDocId: string,
  ponto: unknown,
  index: number,
  fallback: {
    tipo: TipoPonto;
    titulo: string;
    descricao: string;
    latitude: number;
    longitude: number;
  }
): Ponto | null => {
  if (!isRecord(ponto)) return null;

  const tipo = normalizarTipoPonto(toText(ponto.tipo, fallback.tipo));
  const id = toText(ponto.id, `${routeDocId}-ponto-${index + 1}`);

  return {
    id,
    latitude: toNumber(ponto.latitude, fallback.latitude),
    longitude: toNumber(ponto.longitude, fallback.longitude),
    titulo: toText(ponto.titulo, fallback.titulo),
    tipo,
    descricao: toText(ponto.descricao, fallback.descricao),
    imagem: toText(ponto.imagem, IMAGENS_POR_TIPO[tipo]),
    qrCode: toText(ponto.qrCode, `turismo:${id}`),
    horarioAbertura: toText(
      ponto.horarioAbertura,
      HORARIO_ABERTURA_PADRAO
    ),
    horarioFechamento: toText(
      ponto.horarioFechamento,
      HORARIO_FECHAMENTO_PADRAO
    ),
  };
};

const normalizarRotaPersonalizada = (
  routeDocId: string,
  data: FirestoreRecord
): Rota => {
  const tipo = normalizarTipoPonto(toText(data.category, toText(data.tipo, "outro")));
  const nome = toText(data.nome, toText(data.title, "Rota personalizada"));
  const descricao = toText(
    data.description,
    toText(data.descricao, "Ponto turístico cadastrado pelo usuário.")
  );
  const latitude = toNumber(data.latitude, CENTRO_SANTA_RITA.latitude);
  const longitude = toNumber(data.longitude, CENTRO_SANTA_RITA.longitude);

  const fallbackPonto = {
    tipo,
    titulo: nome,
    descricao,
    latitude,
    longitude,
  };

  const pontos = Array.isArray(data.pontos)
    ? data.pontos
        .map((ponto, index) =>
          normalizarPonto(routeDocId, ponto, index, fallbackPonto)
        )
        .filter((ponto): ponto is Ponto => ponto !== null)
    : [];

  const pontoPrincipal: Ponto = {
    id: `${routeDocId}-principal`,
    latitude,
    longitude,
    titulo: nome,
    tipo,
    descricao,
    imagem: IMAGENS_POR_TIPO[tipo],
    qrCode: `turismo:${routeDocId}-principal`,
    horarioAbertura: HORARIO_ABERTURA_PADRAO,
    horarioFechamento: HORARIO_FECHAMENTO_PADRAO,
  };

  return {
    nome,
    cor: toText(data.cor, CORES_POR_TIPO[tipo]),
    premio: toText(data.premio, PREMIOS_POR_TIPO[tipo]),
    pontos: pontos.length > 0 ? pontos : [pontoPrincipal],
    personalizada: true,
  };
};

export const carregarRotasPersonalizadas = async (): Promise<RotasPorId> => {
  const routesSnap = await getDocs(collection(db, "routes"));
  const rotas: RotasPorId = {};

  routesSnap.forEach((routeDoc) => {
    const rota = normalizarRotaPersonalizada(routeDoc.id, routeDoc.data());
    rotas[`personalizada-${routeDoc.id}`] = rota;
  });

  return rotas;
};

export const observarValidacoesDetalhadas = (
  onChange: (validacoes: ValidacaoDetalhada[]) => void,
  onError?: (error: Error) => void
) =>
  onSnapshot(
    collection(db, "visits"),
    (visitsSnap) => {
      void Promise.all(
        visitsSnap.docs.map(async (visitDoc): Promise<ValidacaoDetalhada> => {
          const visitData = visitDoc.data();
          const userId = toText(visitData.userId, "");
          const userSnap = userId ? await getDoc(doc(db, "users", userId)) : null;
          const userData = userSnap?.data();
          const userEmail =
            typeof userData?.email === "string"
              ? userData.email
              : toText(visitData.userEmail, "");
          const userName = getNomeUsuario(
            typeof userData?.displayName === "string"
              ? userData.displayName
              : toText(visitData.userName, ""),
            userEmail
          );
          const userPhone =
            typeof userData?.phoneNumber === "string"
              ? userData.phoneNumber
              : undefined;

          return {
            id: visitDoc.id,
            userId,
            userName,
            userEmail: userEmail || undefined,
            userPhone,
            placeTitle: toText(visitData.placeTitle, "Local sem nome"),
            placeId: toText(visitData.placeId, ""),
            routeId: toText(visitData.routeId, ""),
            validatedAt: isRecord(visitData.validatedAt)
              ? visitData.validatedAt
              : null,
          };
        })
      )
        .then((validacoes) => {
          onChange(
            validacoes.sort(
              (a, b) =>
                (b.validatedAt?.seconds || 0) -
                (a.validatedAt?.seconds || 0)
            )
          );
        })
        .catch((error) => {
          onError?.(error instanceof Error ? error : new Error(String(error)));
        });
    },
    (error) => {
      onError?.(error);
    }
  );

export const limparHistoricoUsuario = async (userId: string) => {
  const [visitsSnap, rewardsSnap, xpEventsSnap, eventVisitsSnap, eventProofsSnap] =
    await Promise.all([
    getDocs(query(collection(db, "visits"), where("userId", "==", userId))),
    getDocs(query(collection(db, "rewards"), where("userId", "==", userId))),
    getDocs(collection(db, "ranking", userId, "xpEvents")),
    getDocs(query(collection(db, "eventVisits"), where("userId", "==", userId))),
    getDocs(query(collection(db, "eventVisitProofs"), where("userId", "==", userId))),
  ]);

  await Promise.all([
    deleteDoc(doc(db, "ranking", userId)),
    deleteDoc(doc(db, "eventRanking", userId)),
    ...visitsSnap.docs.map((visitDoc) => deleteDoc(visitDoc.ref)),
    ...rewardsSnap.docs.map((rewardDoc) => deleteDoc(rewardDoc.ref)),
    ...xpEventsSnap.docs.map((eventDoc) => deleteDoc(eventDoc.ref)),
    ...eventVisitsSnap.docs.map((visitDoc) => deleteDoc(visitDoc.ref)),
    ...eventProofsSnap.docs.map((proofDoc) => deleteDoc(proofDoc.ref)),
  ]);
};

export const criarRotaPersonalizada = async ({
  nome,
  tipo,
  descricao,
  createdBy,
  latitude = CENTRO_SANTA_RITA.latitude,
  longitude = CENTRO_SANTA_RITA.longitude,
}: CriarRotaPersonalizadaInput) => {
  const tipoNormalizado = normalizarTipoPonto(tipo);
  const routeRef = doc(collection(db, "routes"));
  const pontoId = `${routeRef.id}-principal`;

  await setDoc(routeRef, {
    title: nome,
    category: tipoNormalizado,
    description: descricao,
    nome,
    cor: CORES_POR_TIPO[tipoNormalizado],
    premio: PREMIOS_POR_TIPO[tipoNormalizado],
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    latitude,
    longitude,
    pontos: [
      {
        id: pontoId,
        latitude,
        longitude,
        titulo: nome,
        tipo: tipoNormalizado,
        descricao,
        imagem: IMAGENS_POR_TIPO[tipoNormalizado],
        qrCode: `turismo:${pontoId}`,
        horarioAbertura: HORARIO_ABERTURA_PADRAO,
        horarioFechamento: HORARIO_FECHAMENTO_PADRAO,
      },
    ],
  });

  return routeRef.id;
};

export const carregarDadosDoLocal = async (
  placeId: string,
  userId?: string | null
): Promise<DadosLocal> => {
  const ratingsQuery = query(
    collection(db, "ratings"),
    where("placeId", "==", placeId)
  );

  const ratingsSnap = await getDocs(ratingsQuery);

  let soma = 0;
  let total = 0;
  let minhaNota = 0;

  ratingsSnap.forEach((ratingDoc) => {
    const data = ratingDoc.data();

    if (typeof data.rating === "number") {
      soma += data.rating;
      total += 1;
    }

    if (userId && data.userId === userId && typeof data.rating === "number") {
      minhaNota = data.rating;
    }
  });

  const commentsQuery = query(
    collection(db, "comments"),
    where("placeId", "==", placeId)
  );

  const commentsSnap = await getDocs(commentsQuery);
  const comentarios: Comentario[] = [];

  commentsSnap.forEach((commentDoc) => {
    const data = commentDoc.data();

    comentarios.push({
      id: commentDoc.id,
      userId: toText(data.userId, ""),
      text: toText(data.text, ""),
      createdAt: isRecord(data.createdAt) ? data.createdAt : null,
    });
  });

  comentarios.sort((a, b) => {
    const aSeconds = a.createdAt?.seconds || 0;
    const bSeconds = b.createdAt?.seconds || 0;
    return bSeconds - aSeconds;
  });

  return {
    notaSelecionada: minhaNota,
    totalAvaliacoes: total,
    mediaAvaliacoes: total > 0 ? soma / total : 0,
    comentarios,
  };
};

export const carregarVisitasDaRota = async (userId: string, pontos: Ponto[]) => {
  const resultado: Record<string, boolean> = {};

  await Promise.all(
    pontos.map(async (ponto) => {
      const visitRef = doc(db, "visits", `${userId}_${ponto.id}`);
      const visitSnap = await getDoc(visitRef);
      resultado[ponto.id] = visitSnap.exists();
    })
  );

  return resultado;
};

export const avaliarLocal = async (
  user: User,
  routeId: string,
  ponto: Ponto,
  nota: number
) => {
  const ratingRef = doc(db, "ratings", `${user.uid}_${ponto.id}`);

  return runTransaction(db, async (transaction) => {
    const ratingSnapshot = await transaction.get(ratingRef);
    const primeiraAvaliacao = !ratingSnapshot.exists();

    if (primeiraAvaliacao) {
      await adicionarXpNaTransacao(
        transaction,
        user,
        "avaliacao",
        ponto.id
      );
    }

    transaction.set(
      ratingRef,
      {
        userId: user.uid,
        placeId: ponto.id,
        placeTitle: ponto.titulo,
        routeId,
        rating: nota,
        ...(primeiraAvaliacao ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return primeiraAvaliacao;
  });
};

export const enviarComentario = async (
  userId: string,
  routeId: string,
  ponto: Ponto,
  text: string
) => {
  await addDoc(collection(db, "comments"), {
    userId,
    placeId: ponto.id,
    placeTitle: ponto.titulo,
    routeId,
    text,
    createdAt: serverTimestamp(),
  });
};

export const validarVisita = async (
  user: User,
  routeId: string,
  ponto: Ponto
) => {
  const visitRef = doc(db, "visits", `${user.uid}_${ponto.id}`);

  return runTransaction(db, async (transaction) => {
    const visitSnap = await transaction.get(visitRef);

    if (visitSnap.exists()) {
      const validatedAt = visitSnap.data().validatedAt as
        | { toMillis?: () => number }
        | undefined;
      const ultimaValidacao = validatedAt?.toMillis?.() ?? Date.now();

      if (Date.now() - ultimaValidacao < DURACAO_VISITA_MS) {
        return false;
      }

      transaction.update(visitRef, { validatedAt: serverTimestamp() });
      return true;
    }

    await adicionarXpNaTransacao(transaction, user, "visita", ponto.id);

    transaction.set(visitRef, {
      userId: user.uid,
      placeId: ponto.id,
      placeTitle: ponto.titulo,
      routeId,
      validatedAt: serverTimestamp(),
    });

    return true;
  });
};

export const concederPremioSeRotaCompleta = async (
  user: User,
  routeId: string,
  rota: Rota
) => {
  if (rota.pontos.length === 0) return false;

  const rewardRef = doc(db, "rewards", `${user.uid}_${routeId}`);

  return runTransaction(db, async (transaction) => {
    const visitSnapshots = [];

    for (const ponto of rota.pontos) {
      const visitRef = doc(db, "visits", `${user.uid}_${ponto.id}`);
      visitSnapshots.push(await transaction.get(visitRef));
    }

    const rewardSnapshot = await transaction.get(rewardRef);
    const rotaCompleta = visitSnapshots.every((snapshot) => snapshot.exists());

    if (!rotaCompleta || rewardSnapshot.exists()) return false;

    await adicionarXpNaTransacao(
      transaction,
      user,
      "rotaCompleta",
      routeId
    );

    registrarProvasDeConclusaoDaRota(transaction, user.uid, routeId, rota);

    transaction.set(rewardRef, {
      userId: user.uid,
      routeId,
      routeName: rota.nome,
      prize: rota.premio,
      status: "earned",
      earnedAt: serverTimestamp(),
    });

    return true;
  });
};
