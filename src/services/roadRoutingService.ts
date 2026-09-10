import type { MapCoordinate } from "@/src/types/tourismMap";

export type TravelMode = "driving" | "walking" | "bicycling";

type OsrmRouteResponse = {
  code?: string;
  message?: string;
  routes?: {
    geometry?: {
      coordinates?: [number, number][];
    };
  }[];
};

const ROUTING_SERVERS: Record<TravelMode, string> = {
  driving: "https://routing.openstreetmap.de/routed-car",
  walking: "https://routing.openstreetmap.de/routed-foot",
  bicycling: "https://routing.openstreetmap.de/routed-bike",
};

const toCoordinateParam = (coordinate: MapCoordinate) =>
  `${coordinate.longitude},${coordinate.latitude}`;

export async function buscarRotaPorRuas(
  coordenadasDaRota: MapCoordinate[],
  travelMode: TravelMode = "driving"
): Promise<MapCoordinate[]> {
  if (coordenadasDaRota.length < 2) return coordenadasDaRota;

  const coordinates = coordenadasDaRota.map(toCoordinateParam).join(";");
  const url =
    `${ROUTING_SERVERS[travelMode]}/route/v1/driving/${coordinates}` +
    "?overview=full&geometries=geojson&steps=false&continue_straight=false";
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Não foi possível acessar o serviço gratuito de rotas (${response.status}).`
    );
  }

  const data = (await response.json()) as OsrmRouteResponse;
  const routeCoordinates = data.routes?.[0]?.geometry?.coordinates;

  if (data.code !== "Ok" || !routeCoordinates?.length) {
    throw new Error(
      data.message || "Nenhum caminho foi encontrado para esse modo de viagem."
    );
  }

  return routeCoordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
}
