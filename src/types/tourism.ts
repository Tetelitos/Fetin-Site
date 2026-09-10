import type { MapCoordinate } from "@/src/types/tourismMap";

export type TipoPonto =
  | "tecnologia"
  | "religioso"
  | "cafe"
  | "gastronomia"
  | "outro";

export type Ponto = {
  id: string;
  latitude: number;
  longitude: number;
  titulo: string;
  tipo: TipoPonto;
  descricao: string;
  imagem: string;
  qrCode: string;
  horarioAbertura?: string;
  horarioFechamento?: string;
};

export type Rota = {
  nome: string;
  cor: string;
  premio: string;
  pontos: Ponto[];
  linhaManual?: MapCoordinate[];
  personalizada?: boolean;
};

export type RotasPorId = Record<string, Rota>;

export type Comentario = {
  id: string;
  userId: string;
  text: string;
  createdAt?: {
    seconds?: number;
  } | null;
};

export type DadosLocal = {
  notaSelecionada: number;
  mediaAvaliacoes: number;
  totalAvaliacoes: number;
  comentarios: Comentario[];
};

export type RankingItem = {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  photoURL?: string;
  points: number;
  placesVisited: number;
  routesCompleted: number;
  scanCount?: number;
  updatedAt?: {
    seconds?: number;
  } | null;
};

export type ValidacaoDetalhada = {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  placeTitle: string;
  placeId: string;
  routeId: string;
  validatedAt?: {
    seconds?: number;
  } | null;
};
