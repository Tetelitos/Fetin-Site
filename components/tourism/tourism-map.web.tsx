import { forwardRef, useImperativeHandle } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

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

const mapPalettes = {
  light: {
    background: "#eef6f4",
    card: "#ffffff",
    selectedText: "#ffffff",
    text: "#111111",
    secondaryText: "#555555",
    border: "#d7e2df",
  },
  dark: {
    background: "#121719",
    card: "#1e262b",
    selectedText: "#ffffff",
    text: "#eef3f5",
    secondaryText: "#aebbc2",
    border: "#334148",
  },
};

export const TourismMap = forwardRef<TourismMapHandle, TourismMapProps>(
  function TourismMap(
    {
      mapAppearance,
      rota,
      pontos,
      pontoSelecionadoId,
      locaisVisitados,
      onSelecionarPonto,
    },
    ref
  ) {
    const palette = mapPalettes[mapAppearance];

    useImperativeHandle(ref, () => ({
      fitToCoordinates: () => undefined,
      animateToRegion: () => undefined,
    }));

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: palette.background,
          paddingTop: 140,
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            color: palette.text,
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 8,
          }}
        >
          {rota.nome}
        </Text>

        <Text style={{ color: palette.secondaryText, marginBottom: 16 }}>
          Visualização web dos pontos da rota
        </Text>

        <ScrollView>
          {pontos.map((ponto, index) => {
            const selecionado = pontoSelecionadoId === ponto.id;
            const visitado = locaisVisitados[ponto.id];

            return (
              <TouchableOpacity
                key={ponto.id}
                onPress={() => onSelecionarPonto(ponto)}
                style={{
                  backgroundColor: selecionado ? rota.cor : palette.card,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: visitado ? "#00a86b" : palette.border,
                }}
              >
                <Text
                  style={{
                    color: selecionado ? palette.selectedText : palette.text,
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  {index + 1}. {visitado ? "✓" : getIconePonto(ponto.tipo)}{" "}
                  {ponto.titulo}
                </Text>
                <Text
                  style={{
                    color: selecionado
                      ? palette.selectedText
                      : palette.secondaryText,
                  }}
                >
                  {ponto.latitude.toFixed(5)}, {ponto.longitude.toFixed(5)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }
);
