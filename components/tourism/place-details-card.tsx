import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { Comentario, Ponto, Rota } from "@/src/types/tourism";
import { obterStatusFuncionamento } from "@/src/utils/openingHours";

type PlaceDetailsCardProps = {
  local: Ponto;
  rota: Rota;
  visitado: boolean;
  notaSelecionada: number;
  mediaAvaliacoes: number;
  totalAvaliacoes: number;
  comentarios: Comentario[];
  novoComentario: string;
  onNovoComentarioChange: (text: string) => void;
  onAvaliar: (nota: number) => void;
  onEnviarComentario: () => void;
  onAbrirNoMaps: () => void;
  onValidarVisita: () => void;
  onClose: () => void;
};

export function PlaceDetailsCard({
  local,
  rota,
  visitado,
  notaSelecionada,
  mediaAvaliacoes,
  totalAvaliacoes,
  comentarios,
  novoComentario,
  onNovoComentarioChange,
  onAvaliar,
  onEnviarComentario,
  onAbrirNoMaps,
  onValidarVisita,
  onClose,
}: PlaceDetailsCardProps) {
  const [agora, setAgora] = useState(() => new Date());
  const funcionamento = obterStatusFuncionamento(
    agora,
    local.horarioAbertura,
    local.horarioFechamento
  );

  useEffect(() => {
    setAgora(new Date());
    const timer = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [local.id]);

  return (
    <View
      style={{
        position: "absolute",
        bottom: 24,
        left: 16,
        right: 16,
        backgroundColor: "white",
        padding: 16,
        borderRadius: 20,
        maxHeight: 520,
      }}
    >
      <TouchableOpacity
        accessibilityLabel="Fechar detalhes e voltar ao mapa"
        accessibilityRole="button"
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        onPress={onClose}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.72)",
          elevation: 8,
          zIndex: 10,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 30,
            fontWeight: "400",
            lineHeight: 32,
          }}
        >
          ×
        </Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: local.imagem }}
          style={{
            width: "100%",
            height: 150,
            borderRadius: 12,
            marginBottom: 10,
          }}
        />

        <Text style={{ fontSize: 22, fontWeight: "bold", color: "black" }}>
          {local.titulo}
        </Text>

        <Text style={{ color: "gray", marginTop: 4 }}>{rota.nome}</Text>

        <Text style={{ color: "black", marginTop: 8 }}>{local.descricao}</Text>

        <Text
          style={{
            color: funcionamento.aberto ? "#159447" : "#777777",
            fontSize: 16,
            fontWeight: "bold",
            marginTop: 12,
          }}
        >
          {funcionamento.aberto ? "Aberto" : "Fechado"} · {funcionamento.horarioAbertura}–{funcionamento.horarioFechamento}
        </Text>

        <Text style={{ color: "#f5a623", marginTop: 10, fontSize: 16 }}>
          Média: {mediaAvaliacoes ? mediaAvaliacoes.toFixed(1) : "Sem notas"} ⭐ (
          {totalAvaliacoes})
        </Text>

        <Text style={{ color: "black", marginTop: 12, fontWeight: "bold" }}>
          Sua avaliação:
        </Text>

        <View style={{ flexDirection: "row", marginTop: 6, marginBottom: 12 }}>
          {[1, 2, 3, 4, 5].map((estrela) => (
            <TouchableOpacity key={estrela} onPress={() => onAvaliar(estrela)}>
              <Text style={{ fontSize: 30, marginRight: 6 }}>
                {estrela <= notaSelecionada ? "⭐" : "☆"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={onAbrirNoMaps}
          style={{
            backgroundColor: rota.cor,
            padding: 12,
            borderRadius: 12,
            marginTop: 4,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Abrir no Google Maps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onValidarVisita}
          style={{
            backgroundColor: visitado ? "#00a86b" : "#111",
            padding: 12,
            borderRadius: 12,
            marginTop: 10,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {visitado ? "Visita validada ✅" : "Validar visita por QR Code"}
          </Text>
        </TouchableOpacity>

        <Text style={{ color: "black", marginTop: 16, fontWeight: "bold" }}>
          Comentários
        </Text>

        <TextInput
          placeholder="Escreva um comentário..."
          placeholderTextColor="gray"
          value={novoComentario}
          onChangeText={onNovoComentarioChange}
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 12,
            padding: 10,
            color: "black",
            marginTop: 8,
            minHeight: 70,
          }}
        />

        <TouchableOpacity
          onPress={onEnviarComentario}
          style={{
            backgroundColor: "#eee",
            padding: 10,
            borderRadius: 10,
            marginTop: 8,
          }}
        >
          <Text style={{ textAlign: "center", color: "black" }}>
            Enviar comentário
          </Text>
        </TouchableOpacity>

        {comentarios.length === 0 ? (
          <Text style={{ color: "gray", marginTop: 10 }}>
            Ainda não há comentários.
          </Text>
        ) : (
          comentarios.map((comentario) => (
            <View
              key={comentario.id}
              style={{
                borderTopWidth: 1,
                borderTopColor: "#eee",
                paddingTop: 8,
                marginTop: 8,
              }}
            >
              <Text style={{ color: "black" }}>{comentario.text}</Text>
            </View>
          ))
        )}

        <TouchableOpacity
          accessibilityLabel="Voltar ao mapa"
          accessibilityRole="button"
          onPress={onClose}
          style={{
            borderColor: "#d5d5d5",
            borderRadius: 12,
            borderWidth: 1,
            marginTop: 16,
            padding: 12,
          }}
        >
          <Text style={{ color: "black", textAlign: "center", fontWeight: "700" }}>
            Voltar ao mapa
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
