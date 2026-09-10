import { Text, TouchableOpacity, View } from "react-native";

import type { RotasPorId } from "@/src/types/tourism";

type RouteSelectorProps = {
  rotas: RotasPorId;
  rotaAtual: string;
  onChangeRota: (rotaId: string) => void;
};

export function RouteSelector({
  rotas,
  rotaAtual,
  onChangeRota,
}: RouteSelectorProps) {
  return (
    <View
      style={{
        position: "absolute",
        top: 50,
        left: 12,
        maxWidth: 180,
      }}
    >
      {Object.entries(rotas).map(([key, rota]) => (
        <TouchableOpacity
          key={key}
          onPress={() => onChangeRota(key)}
          style={{
            backgroundColor: rotaAtual === key ? rota.cor : "white",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 20,
            marginBottom: 8,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: rotaAtual === key ? "white" : "black",
              fontWeight: "bold",
            }}
          >
            {rota.personalizada ? rota.nome : key}
          </Text>
        </TouchableOpacity>
      ))}

    </View>
  );
}
