import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { EventTeam } from "@/src/types/event";

type EventTeamCardProps = {
  team: EventTeam | null;
  visited: boolean;
  dark: boolean;
  onClose: () => void;
  onScan: () => void;
};

const buildingNames = {
  "predio-2": "Prédio II",
  "predio-3": "Prédio III",
  "predio-4": "Prédio IV",
};

export function EventTeamCard({
  team,
  visited,
  dark,
  onClose,
  onScan,
}: EventTeamCardProps) {
  if (!team) return null;

  const colors = dark
    ? {
        card: "#12102b",
        text: "#f8f5ff",
        secondary: "#b8afd2",
        border: "#393161",
      }
    : {
        card: "#ffffff",
        text: "#19142d",
        secondary: "#665f80",
        border: "#ded8f2",
      };
  const floorLabel =
    team.andar === "terreo"
      ? " • Térreo"
      : team.andar === "primeiro-piso"
        ? " • 1º piso"
        : "";

  return (
    <Modal animationType="slide" transparent visible onRequestClose={onClose}>
      <View
        style={{
          backgroundColor: "rgba(0,0,0,0.62)",
          flex: 1,
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderWidth: 1,
            maxHeight: "82%",
            padding: 20,
            paddingBottom: 30,
          }}
        >
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: "#8c62ff", fontSize: 15, fontWeight: "900" }}>
              {team.nome.toUpperCase()}
            </Text>
            <TouchableOpacity
              accessibilityLabel="Fechar detalhes da equipe"
              onPress={onClose}
              style={{ padding: 4 }}
            >
              <MaterialIcons color={colors.text} name="close" size={27} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text
              style={{
                color: colors.text,
                fontSize: 24,
                fontWeight: "900",
                marginTop: 12,
              }}
            >
              {team.projeto}
            </Text>
            {team.curso.trim() ? (
              <Text style={{ color: colors.secondary, fontWeight: "700", marginTop: 7 }}>
                {team.curso}
              </Text>
            ) : null}
            <Text style={{ color: colors.secondary, marginTop: 10 }}>
              📍 {buildingNames[team.predio]}{floorLabel} • Mesa {team.mesa}
            </Text>
            <Text style={{ color: colors.text, lineHeight: 22, marginTop: 18 }}>
              {team.descricao}
            </Text>

            <View
              style={{
                backgroundColor: visited ? "#e6f8f0" : dark ? "#1c183d" : "#f2effb",
                borderRadius: 14,
                marginTop: 20,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: visited ? "#08764d" : colors.text,
                  fontWeight: "900",
                }}
              >
                {visited ? "✅ Visitado • +100 XP recebido" : "Ainda não visitado"}
              </Text>
            </View>

            {!visited ? (
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={onScan}
                style={{
                  alignItems: "center",
                  backgroundColor: "#7046ee",
                  borderRadius: 14,
                  flexDirection: "row",
                  gap: 9,
                  justifyContent: "center",
                  marginTop: 18,
                  padding: 15,
                }}
              >
                <MaterialIcons color="#ffffff" name="qr-code-scanner" size={23} />
                <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>
                  Ler QR Code
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
