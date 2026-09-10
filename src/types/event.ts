export type EventBuilding = "predio-2" | "predio-3" | "predio-4";

export type EventFloor = "terreo" | "primeiro-piso" | null;

export type EventTeam = {
  id: string;
  nome: string;
  projeto: string;
  descricao: string;
  curso: string;
  predio: EventBuilding;
  andar: EventFloor;
  mesa: string;
  x: number;
  y: number;
  qrPrefix: string;
  ativo: boolean;
  isMock?: boolean;
};

export type EventVisit = {
  id: string;
  userId: string;
  teamId: string;
  points: number;
  visitedAt?: {
    seconds?: number;
  } | null;
};

export type EventRankingItem = {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  photoURL?: string;
  points: number;
  teamsVisited: number;
  updatedAt?: {
    seconds?: number;
  } | null;
};

export type EventVisitResult = {
  alreadyVisited: boolean;
  points: number;
  teamsVisited: number;
  team: EventTeam;
};
