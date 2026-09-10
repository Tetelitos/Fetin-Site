import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { Ponto, Rota } from "@/src/types/tourism";

type RoutePointListProps = {
  aberta: boolean;
  rota: Rota;
  pontos: Ponto[];
  pontoSelecionadoId: string | null;
  locaisVisitados: Record<string, boolean>;
  onToggle: () => void;
  onSelecionarPonto: (ponto: Ponto) => void;
};

export function RoutePointList({
  aberta,
  rota,
  pontos,
  pontoSelecionadoId,
  locaisVisitados,
  onToggle,
  onSelecionarPonto,
}: RoutePointListProps) {
  return (
    <>
      <TouchableOpacity
        onPress={onToggle}
        style={{
          position: "absolute",
          bottom: aberta ? 260 : 30,
          right: 16,
          backgroundColor: rota.cor,
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: 30,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          {aberta ? "Fechar lista" : "Abrir lista"}
        </Text>
      </TouchableOpacity>

      {aberta && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "white",
            padding: 16,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: 250,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: 10,
              color: "black",
            }}
          >
            {rota.nome}
          </Text>

          <ScrollView>
            {pontos.map((ponto, index) => (
              <TouchableOpacity
                key={ponto.id}
                onPress={() => onSelecionarPonto(ponto)}
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#eee",
                }}
              >
                <Text
                  style={{
                    color: pontoSelecionadoId === ponto.id ? rota.cor : "black",
                    fontSize: 15,
                    fontWeight:
                      pontoSelecionadoId === ponto.id ? "bold" : "normal",
                  }}
                >
                  {index + 1}. {ponto.titulo}{" "}
                  {locaisVisitados[ponto.id] ? "✅" : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}
