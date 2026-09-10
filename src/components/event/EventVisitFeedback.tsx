import { Modal, Text, TouchableOpacity, View } from "react-native";

import type { EventVisitResult } from "@/src/types/event";

type EventVisitFeedbackProps = {
  result: EventVisitResult | null;
  position: number;
  dark: boolean;
  onClose: () => void;
};

export function EventVisitFeedback({
  result,
  position,
  dark,
  onClose,
}: EventVisitFeedbackProps) {
  if (!result) return null;

  const card = dark ? "#12102b" : "#ffffff";
  const text = dark ? "#f8f5ff" : "#19142d";
  const secondary = dark ? "#b8afd2" : "#665f80";

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.68)",
          flex: 1,
          justifyContent: "center",
          padding: 22,
        }}
      >
        <View style={{ backgroundColor: card, borderRadius: 24, padding: 22, width: "100%" }}>
          <Text style={{ color: "#159363", fontSize: 21, fontWeight: "900", textAlign: "center" }}>
            ✅ EQUIPE VISITADA!
          </Text>
          <Text style={{ color: text, fontSize: 22, fontWeight: "900", marginTop: 18, textAlign: "center" }}>
            {result.team.projeto}
          </Text>
          <Text style={{ color: "#7046ee", fontSize: 30, fontWeight: "900", marginTop: 16, textAlign: "center" }}>
            +100 XP
          </Text>
          <Text style={{ color: secondary, marginTop: 16, textAlign: "center" }}>
            {result.teamsVisited} equipes visitadas
          </Text>
          <Text style={{ color: text, fontSize: 17, fontWeight: "800", marginTop: 8, textAlign: "center" }}>
            Agora você está em {position}º lugar!
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{ alignItems: "center", backgroundColor: "#7046ee", borderRadius: 14, marginTop: 22, padding: 15 }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              Voltar para o mapa
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
