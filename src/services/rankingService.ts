import type { User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Transaction,
} from "firebase/firestore";

import { db } from "@/src/firebaseConfig";
import type { RankingItem } from "@/src/types/tourism";

export const XP_POR_ACAO = {
  visita: 100,
  avaliacao: 20,
  rotaCompleta: 500,
} as const;

export type AcaoXp = keyof typeof XP_POR_ACAO;

type FirestoreRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is FirestoreRecord =>
  typeof value === "object" && value !== null;

const toText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const toOptionalText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const toNonNegativeInteger = (value: unknown, fallback = 0) => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
};

const getNomeUsuario = (user: User, existingName?: unknown) => {
  if (user.displayName?.trim()) return user.displayName.trim();

  const savedName = toOptionalText(existingName);
  if (savedName) return savedName;

  if (user.email?.trim()) return user.email.split("@")[0];

  return "Visitante";
};

const getLegacyScanCount = (data: FirestoreRecord) =>
  toNonNegativeInteger(data.scanCount);

const getRankingPoints = (data: FirestoreRecord) => {
  const scanCount = getLegacyScanCount(data);
  return toNonNegativeInteger(data.points, scanCount * XP_POR_ACAO.visita);
};

const getPlacesVisited = (data: FirestoreRecord) =>
  toNonNegativeInteger(data.placesVisited, getLegacyScanCount(data));

const getRoutesCompleted = (data: FirestoreRecord) =>
  toNonNegativeInteger(data.routesCompleted);

export const adicionarXpNaTransacao = async (
  transaction: Transaction,
  user: User,
  acao: AcaoXp,
  targetId: string
) => {
  const rankingRef = doc(db, "ranking", user.uid);
  const xpEventRef = doc(
    db,
    "ranking",
    user.uid,
    "xpEvents",
    `${acao}_${targetId}`
  );
  const xpEventSnapshot = await transaction.get(xpEventRef);

  if (xpEventSnapshot.exists()) return false;

  const rankingSnapshot = await transaction.get(rankingRef);
  const currentData = rankingSnapshot.exists()
    ? (rankingSnapshot.data() as FirestoreRecord)
    : {};
  const currentPoints = getRankingPoints(currentData);
  const currentPlacesVisited = getPlacesVisited(currentData);
  const currentRoutesCompleted = getRoutesCompleted(currentData);
  const currentScanCount = getLegacyScanCount(currentData);
  const nextPoints = currentPoints + XP_POR_ACAO[acao];
  const nextPlacesVisited =
    currentPlacesVisited + (acao === "visita" ? 1 : 0);
  const nextRoutesCompleted =
    currentRoutesCompleted + (acao === "rotaCompleta" ? 1 : 0);
  const nextScanCount = currentScanCount + (acao === "visita" ? 1 : 0);
  const photoURL = user.photoURL?.trim() || toOptionalText(currentData.photoURL);
  const userEmail = user.email?.trim() || toOptionalText(currentData.userEmail);

  const rankingUpdate: FirestoreRecord = {
    userId: user.uid,
    userName: getNomeUsuario(user, currentData.userName),
    userEmail: userEmail ?? null,
    points: nextPoints,
    placesVisited: nextPlacesVisited,
    routesCompleted: nextRoutesCompleted,
    lastXpEventId: xpEventRef.id,
    updatedAt: serverTimestamp(),
  };

  if (photoURL) {
    rankingUpdate.photoURL = photoURL;
  }

  if (acao === "visita") {
    // Mantido para clientes antigos que ainda leem o contador de scans.
    rankingUpdate.scanCount = nextScanCount;
    rankingUpdate.lastScannedAt = serverTimestamp();
  }

  transaction.set(xpEventRef, {
    userId: user.uid,
    type: acao,
    targetId,
    points: XP_POR_ACAO[acao],
    pointsBefore: currentPoints,
    pointsAfter: nextPoints,
    placesBefore: currentPlacesVisited,
    placesAfter: nextPlacesVisited,
    routesBefore: currentRoutesCompleted,
    routesAfter: nextRoutesCompleted,
    scanCountBefore: currentScanCount,
    scanCountAfter: nextScanCount,
    createdAt: serverTimestamp(),
  });
  transaction.set(rankingRef, rankingUpdate, { merge: true });

  return true;
};

export const sincronizarPerfilRanking = async (user: User) =>
  runTransaction(db, async (transaction) => {
    const rankingRef = doc(db, "ranking", user.uid);
    const rankingSnapshot = await transaction.get(rankingRef);

    if (!rankingSnapshot.exists()) return false;

    const currentData = rankingSnapshot.data() as FirestoreRecord;
    const photoURL = user.photoURL?.trim() || toOptionalText(currentData.photoURL);

    transaction.set(
      rankingRef,
      {
        userId: user.uid,
        userName: getNomeUsuario(user, currentData.userName),
        userEmail: user.email?.trim() || null,
        ...(photoURL ? { photoURL } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return true;
  });

export const observarRanking = (
  onChange: (ranking: RankingItem[]) => void,
  onError?: (error: Error) => void
) =>
  onSnapshot(
    collection(db, "ranking"),
    (rankingSnapshot) => {
      const ranking = rankingSnapshot.docs
        .map((rankingDoc): RankingItem => {
          const data = rankingDoc.data() as FirestoreRecord;
          const userEmail = toOptionalText(data.userEmail);
          const fallbackName = userEmail?.split("@")[0] || "Visitante";

          return {
            id: rankingDoc.id,
            userId: toText(data.userId, rankingDoc.id),
            userName: toText(data.userName, fallbackName),
            userEmail,
            photoURL: toOptionalText(data.photoURL),
            points: getRankingPoints(data),
            placesVisited: getPlacesVisited(data),
            routesCompleted: getRoutesCompleted(data),
            scanCount: getLegacyScanCount(data),
            updatedAt: isRecord(data.updatedAt) ? data.updatedAt : null,
          };
        })
        .filter((item) => item.points > 0)
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.routesCompleted !== a.routesCompleted) {
            return b.routesCompleted - a.routesCompleted;
          }
          if (b.placesVisited !== a.placesVisited) {
            return b.placesVisited - a.placesVisited;
          }

          return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
        });

      onChange(ranking);
    },
    (error) => {
      onError?.(error);
    }
  );
