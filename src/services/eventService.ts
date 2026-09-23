import type { User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { EVENT_TEAM_MOCKS } from "@/src/data/eventTeams.mock";
import { db } from "@/src/firebaseConfig";
import type {
  EventBuilding,
  EventFloor,
  EventRankingItem,
  EventTeam,
  EventVisit,
  EventVisitResult,
} from "@/src/types/event";

export const EVENT_VISIT_POINTS = 100;

type FirestoreRecord = Record<string, unknown>;

export class EventServiceError extends Error {
  constructor(
    public readonly code: "event/mock-team" | "event/invalid-qr",
    message: string
  ) {
    super(message);
    this.name = "EventServiceError";
  }
}

const isRecord = (value: unknown): value is FirestoreRecord =>
  typeof value === "object" && value !== null;

const toText = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const toOptionalText = (value: unknown) => {
  const text = toText(value);
  return text || undefined;
};

const toNonNegativeInteger = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : fallback;

const toPercentage = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 50;

const toBuilding = (value: unknown): EventBuilding | null =>
  value === "predio-2" || value === "predio-3" || value === "predio-4"
    ? value
    : null;

const toFloor = (building: EventBuilding, value: unknown): EventFloor => {
  if (building !== "predio-4") return null;
  return value === "primeiro-piso" ? "primeiro-piso" : "terreo";
};

const getUserName = (user: User, existingName?: unknown) => {
  if (user.displayName?.trim()) return user.displayName.trim();

  const savedName = toOptionalText(existingName);
  if (savedName) return savedName;

  return user.email?.split("@")[0] || "Visitante";
};

const normalizeTeam = (
  teamId: string,
  data: FirestoreRecord
): EventTeam | null => {
  const building = toBuilding(data.predio);
  if (!building) return null;

  return {
    id: teamId,
    nome: toText(data.nome, "Equipe sem nome"),
    projeto: toText(data.projeto, "Projeto sem título"),
    descricao: toText(data.descricao, "Descrição ainda não informada."),
    curso: toText(data.curso),
    predio: building,
    andar: toFloor(building, data.andar),
    mesa: toText(data.mesa, "—"),
    x: toPercentage(data.x),
    y: toPercentage(data.y),
    qrPrefix: toText(data.qrPrefix),
    ativo: data.ativo === true,
  };
};

export const observarEquipesEvento = (
  onChange: (teams: EventTeam[], usingMocks: boolean) => void,
  onError?: (error: Error) => void
) =>
  onSnapshot(
    collection(db, "eventTeams"),
    (snapshot) => {
      const teams = snapshot.docs
        .map((teamDoc) => normalizeTeam(teamDoc.id, teamDoc.data()))
        .filter((team): team is EventTeam => team !== null && team.ativo);

      if (teams.length === 0) {
        onChange(EVENT_TEAM_MOCKS.filter((team) => team.ativo), true);
        return;
      }

      onChange(teams, false);
    },
    (error) => {
      onChange(EVENT_TEAM_MOCKS.filter((team) => team.ativo), true);
      onError?.(error);
    }
  );

export const observarVisitasEvento = (
  userId: string,
  onChange: (visits: EventVisit[]) => void,
  onError?: (error: Error) => void
) =>
  onSnapshot(
    query(collection(db, "eventVisits"), where("userId", "==", userId)),
    (snapshot) => {
      onChange(
        snapshot.docs.map((visitDoc) => {
          const data = visitDoc.data();

          return {
            id: visitDoc.id,
            userId: toText(data.userId),
            teamId: toText(data.teamId),
            points: toNonNegativeInteger(data.points),
            visitedAt: isRecord(data.visitedAt) ? data.visitedAt : null,
          };
        })
      );
    },
    (error) => onError?.(error)
  );

export const observarRankingEvento = (
  onChange: (ranking: EventRankingItem[]) => void,
  onError?: (error: Error) => void
) =>
  onSnapshot(
    collection(db, "eventRanking"),
    (snapshot) => {
      const ranking = snapshot.docs
        .map((rankingDoc): EventRankingItem => {
          const data = rankingDoc.data();
          const teamsVisited = toNonNegativeInteger(data.teamsVisited);

          return {
            id: rankingDoc.id,
            userId: toText(data.userId, rankingDoc.id),
            userName: toText(data.userName, "Visitante"),
            userEmail: toOptionalText(data.userEmail),
            photoURL: toOptionalText(data.photoURL),
            points: toNonNegativeInteger(
              data.points,
              teamsVisited * EVENT_VISIT_POINTS
            ),
            teamsVisited,
            updatedAt: isRecord(data.updatedAt) ? data.updatedAt : null,
          };
        })
        .filter((item) => item.points > 0)
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
        });

      onChange(ranking);
    },
    (error) => onError?.(error)
  );

export const sincronizarPerfilRankingEvento = async (user: User) => {
  const rankingRef = doc(db, "eventRanking", user.uid);

  await runTransaction(db, async (transaction) => {
    const rankingSnapshot = await transaction.get(rankingRef);

    if (!rankingSnapshot.exists()) return;

    const rankingData = rankingSnapshot.data() as FirestoreRecord;
    const photoURL = user.photoURL?.trim();

    transaction.update(rankingRef, {
      userId: user.uid,
      userName: getUserName(user, rankingData.userName),
      userEmail: user.email?.trim() || null,
      ...(photoURL ? { photoURL } : {}),
      updatedAt: serverTimestamp(),
    });
  });
};

export const registrarVisitaEvento = async (
  user: User,
  team: EventTeam,
  qrToken: string
): Promise<EventVisitResult> => {
  if (team.isMock) {
    throw new EventServiceError(
      "event/mock-team",
      "Esta equipe é apenas uma demonstração local. Cadastre-a no Firestore antes de validar o QR Code."
    );
  }

  const normalizedToken = qrToken.trim();
  if (!normalizedToken.startsWith(`${team.qrPrefix}_`)) {
    throw new EventServiceError(
      "event/invalid-qr",
      "O QR Code não pertence à equipe selecionada."
    );
  }

  const documentId = `${user.uid}_${team.id}`;
  const visitRef = doc(db, "eventVisits", documentId);
  const proofRef = doc(db, "eventVisitProofs", documentId);
  const rankingRef = doc(db, "eventRanking", user.uid);

  return runTransaction(db, async (transaction) => {
    const visitSnapshot = await transaction.get(visitRef);
    const rankingSnapshot = await transaction.get(rankingRef);
    const rankingData = rankingSnapshot.exists()
      ? (rankingSnapshot.data() as FirestoreRecord)
      : {};
    const currentTeamsVisited = toNonNegativeInteger(rankingData.teamsVisited);
    const currentPoints = toNonNegativeInteger(
      rankingData.points,
      currentTeamsVisited * EVENT_VISIT_POINTS
    );

    if (visitSnapshot.exists()) {
      return {
        alreadyVisited: true,
        points: currentPoints,
        teamsVisited: currentTeamsVisited,
        team,
      };
    }

    const nextTeamsVisited = currentTeamsVisited + 1;
    const nextPoints = currentPoints + EVENT_VISIT_POINTS;
    const photoURL = user.photoURL?.trim() || toOptionalText(rankingData.photoURL);

    transaction.set(proofRef, {
      userId: user.uid,
      teamId: team.id,
      qrToken: normalizedToken,
      createdAt: serverTimestamp(),
    });
    transaction.set(visitRef, {
      userId: user.uid,
      teamId: team.id,
      points: EVENT_VISIT_POINTS,
      visitedAt: serverTimestamp(),
    });
    transaction.set(
      rankingRef,
      {
        userId: user.uid,
        userName: getUserName(user, rankingData.userName),
        userEmail: user.email?.trim() || null,
        ...(photoURL ? { photoURL } : {}),
        points: nextPoints,
        teamsVisited: nextTeamsVisited,
        lastVisitId: visitRef.id,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      alreadyVisited: false,
      points: nextPoints,
      teamsVisited: nextTeamsVisited,
      team,
    };
  });
};
