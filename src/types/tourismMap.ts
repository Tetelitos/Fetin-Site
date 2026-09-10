export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type TourismMapHandle = {
  fitToCoordinates: (coordinates: MapCoordinate[], options?: unknown) => void;
  animateToRegion: (region: MapRegion, duration?: number) => void;
};
