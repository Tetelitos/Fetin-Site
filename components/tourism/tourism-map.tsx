import { forwardRef, useImperativeHandle, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Polyline, type MapStyleElement } from "react-native-maps";

import type { TourismMapHandle } from "@/src/types/tourismMap";
import type { Ponto, Rota } from "@/src/types/tourism";
import { getIconePonto } from "@/src/utils/placeIcons";

type TourismMapProps = {
  mapAppearance: "light" | "dark";
  rota: Rota;
  rotaAtual: string;
  pontos: Ponto[];
  rotaCircular: {
    latitude: number;
    longitude: number;
  }[];
  pontoSelecionadoId: string | null;
  locaisVisitados: Record<string, boolean>;
  onSelecionarPonto: (ponto: Ponto) => void;
};

const darkMapStyle: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#1d2428" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#d8e0e4" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#121719" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#3a464d" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#222b2f" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#253136" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1d3a31" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38454c" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#182024" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#4a5860" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2a3439" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#102f44" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9fc4d8" }],
  },
];

export const TourismMap = forwardRef<TourismMapHandle, TourismMapProps>(
  function TourismMap(
    {
      mapAppearance,
      rota,
      rotaAtual,
      pontos,
      rotaCircular,
      pontoSelecionadoId,
      locaisVisitados,
      onSelecionarPonto,
    },
    ref
  ) {
    const nativeMapRef = useRef<MapView | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        fitToCoordinates: (coordinates, options) => {
          nativeMapRef.current?.fitToCoordinates(
            coordinates,
            options as Parameters<MapView["fitToCoordinates"]>[1]
          );
        },
        animateToRegion: (region, duration) => {
          nativeMapRef.current?.animateToRegion(region, duration);
        },
      }),
      []
    );

    return (
      <MapView
        ref={nativeMapRef}
        customMapStyle={mapAppearance === "dark" ? darkMapStyle : []}
        style={{ flex: 1 }}
        userInterfaceStyle={mapAppearance}
        initialRegion={{
          latitude: -22.2521,
          longitude: -45.7033,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {rotaCircular.length > 1 && (
          <Polyline
            coordinates={rotaCircular}
            strokeColor={rota.cor}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {pontos.map((ponto) => {
          const selecionado = pontoSelecionadoId === ponto.id;
          const visitado = locaisVisitados[ponto.id];

          return (
            <Marker
              key={`${rotaAtual}-${ponto.id}`}
              coordinate={{
                latitude: ponto.latitude,
                longitude: ponto.longitude,
              }}
              onPress={() => {
                setTimeout(() => onSelecionarPonto(ponto), 100);
              }}
            >
              <View
                style={{
                  backgroundColor: selecionado ? "red" : rota.cor,
                  width: selecionado ? 48 : 36,
                  height: selecionado ? 48 : 36,
                  borderRadius: selecionado ? 24 : 18,
                  borderWidth: 3,
                  borderColor: visitado ? "#00d26a" : "white",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: selecionado ? 20 : 17 }}>
                  {visitado ? "✅" : getIconePonto(ponto.tipo)}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>
    );
  }
);
