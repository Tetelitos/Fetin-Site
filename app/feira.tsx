import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCameraPermissions } from "expo-camera";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";
import { QrScannerModal } from "@/components/tourism/qr-scanner-modal";
import { auth } from "@/src/firebaseConfig";
import { EventMap } from "@/src/components/event/EventMap";
import { EventTeamCard } from "@/src/components/event/EventTeamCard";
import { EventVisitFeedback } from "@/src/components/event/EventVisitFeedback";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import {
  EventServiceError,
  observarEquipesEvento,
  observarRankingEvento,
  observarVisitasEvento,
  registrarVisitaEvento,
} from "@/src/services/eventService";
import type {
  EventBuilding,
  EventFloor,
  EventRankingItem,
  EventTeam,
  EventVisit,
  EventVisitResult,
} from "@/src/types/event";

const BUILDINGS: { id: EventBuilding; label: string }[] = [
  { id: "predio-2", label: "Prédio II" },
  { id: "predio-3", label: "Prédio III" },
  { id: "predio-4", label: "Prédio IV" },
];

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const palette = {
  light: {
    background: "#f3f1ff",
    card: "#ffffff",
    text: "#17132d",
    secondary: "#665f80",
    border: "#ded8f2",
    selected: "#6d3ee8",
    selectedText: "#ffffff",
  },
  dark: {
    background: "#070618",
    card: "#11102a",
    text: "#f7f4ff",
    secondary: "#b8afd2",
    border: "#312b57",
    selected: "#8c62ff",
    selectedText: "#ffffff",
  },
};

export default function EventScreen() {
  const router = useRouter();
  const { colorScheme } = useAppTheme();
  const { user, loading } = useAuthUser();
  const colors = palette[colorScheme];
  const scanInProgressRef = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [building, setBuilding] = useState<EventBuilding>("predio-2");
  const [floor, setFloor] = useState<EventFloor>(null);
  const [selectedTeam, setSelectedTeam] = useState<EventTeam | null>(null);
  const [scannerTeam, setScannerTeam] = useState<EventTeam | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);
  const [teams, setTeams] = useState<EventTeam[]>([]);
  const [visits, setVisits] = useState<EventVisit[]>([]);
  const [ranking, setRanking] = useState<EventRankingItem[]>([]);
  const [feedbackResult, setFeedbackResult] = useState<EventVisitResult | null>(null);
  const [usingMocks, setUsingMocks] = useState(true);
  const [syncError, setSyncError] = useState(false);
  const visitedTeamIds = useMemo(
    () => new Set(visits.map((visit) => visit.teamId)),
    [visits]
  );
  const visibleTeams = useMemo(
    () =>
      teams.filter(
        (team) =>
          team.predio === building &&
          (building !== "predio-4" || team.andar === floor)
      ),
    [building, floor, teams]
  );
  const teamsVisited = teams.filter((team) => visitedTeamIds.has(team.id)).length;
  const progressPercentage =
    teams.length > 0 ? Math.round((teamsVisited / teams.length) * 100) : 0;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeTeams = observarEquipesEvento(
      (nextTeams, nextUsingMocks) => {
        setTeams(nextTeams);
        setUsingMocks(nextUsingMocks);
      },
      () => setSyncError(true)
    );
    const unsubscribeVisits = observarVisitasEvento(
      user.uid,
      (nextVisits) => {
        setVisits(nextVisits);
        setSyncError(false);
      },
      () => {
        setVisits([]);
        setSyncError(true);
      }
    );
    const unsubscribeRanking = observarRankingEvento(
      setRanking,
      () => {
        setRanking([]);
        setSyncError(true);
      }
    );

    return () => {
      unsubscribeTeams();
      unsubscribeVisits();
      unsubscribeRanking();
    };
  }, [user]);

  const selectBuilding = (nextBuilding: EventBuilding) => {
    setBuilding(nextBuilding);
    setFloor(nextBuilding === "predio-4" ? "terreo" : null);
    setSelectedTeam(null);
  };

  const openScanner = useCallback(
    async (team: EventTeam | null) => {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();

        if (!result.granted) {
          Alert.alert(
            "Permissão negada",
            "Permita o uso da câmera para visitar uma equipe."
          );
          return;
        }
      }

      setScannerTeam(team);
      setSelectedTeam(null);
      scanInProgressRef.current = false;
      setScannerActive(true);
      setScannerOpen(true);
    },
    [cameraPermission?.granted, requestCameraPermission]
  );

  const validateEventQrCode = useCallback(
    async (rawToken: string) => {
      if (!user || scanInProgressRef.current) return;

      scanInProgressRef.current = true;
      setScannerActive(false);
      setScannerOpen(false);

      const token = rawToken.trim();
      const identifiedTeam = teams.find((team) =>
        token.startsWith(`${team.qrPrefix}_`)
      );

      if (!identifiedTeam || (scannerTeam && scannerTeam.id !== identifiedTeam.id)) {
        Alert.alert(
          "QR Code inválido",
          scannerTeam
            ? "O código lido não pertence à equipe selecionada."
            : "O código não pertence a uma equipe ativa da mostra."
        );
        scanInProgressRef.current = false;
        return;
      }

      try {
        const result = await registrarVisitaEvento(user, identifiedTeam, token);
        setSelectedTeam(identifiedTeam);

        if (result.alreadyVisited) {
          Alert.alert(
            "Equipe já visitada",
            "Essa equipe já foi registrada anteriormente. Nenhum XP adicional foi concedido."
          );
        } else {
          setFeedbackResult(result);
        }
      } catch (error) {
        const title =
          error instanceof EventServiceError && error.code === "event/mock-team"
            ? "Equipe de demonstração"
            : "Erro ao registrar visita";
        Alert.alert(
          title,
          getErrorMessage(error, "Não foi possível registrar esta visita.")
        );
      } finally {
        scanInProgressRef.current = false;
      }
    },
    [scannerTeam, teams, user]
  );
  const feedbackPosition = feedbackResult
    ? ranking.filter((item) => item.points > feedbackResult.points).length + 1
    : 0;

  if (loading || !user) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.selected} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 36 }}
        style={{ flex: 1 }}
      >
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.secondary, fontWeight: "700" }}>
              Modo especial do campus
            </Text>
            <Text
              style={{ color: colors.text, fontSize: 26, fontWeight: "900" }}
            >
              Sapucaí Rotas - Fetin
            </Text>
          </View>

          <TouchableOpacity
            accessibilityLabel="Sair da conta"
            onPress={() => void signOut(auth)}
            style={{
              alignItems: "center",
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: 22,
              borderWidth: 1,
              height: 44,
              justifyContent: "center",
              width: 44,
            }}
          >
            <MaterialIcons color={colors.text} name="logout" size={22} />
          </TouchableOpacity>
        </View>

        <EventMap
          building={building}
          floor={floor}
          onSelectTeam={setSelectedTeam}
          selectedTeamId={selectedTeam?.id}
          teams={visibleTeams}
          visitedTeamIds={visitedTeamIds}
        />

        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: 16,
            borderWidth: 1,
            marginBottom: 16,
            padding: 14,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
            Escolha o prédio
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {BUILDINGS.map((item) => {
              const selected = item.id === building;

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => selectBuilding(item.id)}
                  style={{
                    alignItems: "center",
                    backgroundColor: selected ? colors.selected : colors.background,
                    borderColor: selected ? colors.selected : colors.border,
                    borderRadius: 12,
                    borderWidth: 1,
                    flex: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 11,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.selectedText : colors.text,
                      fontSize: 13,
                      fontWeight: "800",
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {building === "predio-4" ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              {[
                { id: "terreo" as const, label: "Térreo" },
                { id: "primeiro-piso" as const, label: "1º piso" },
              ].map((item) => {
                const selected = floor === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      setFloor(item.id);
                      setSelectedTeam(null);
                    }}
                    style={{
                      alignItems: "center",
                      backgroundColor: selected ? "#1f9d68" : colors.background,
                      borderColor: selected ? "#1f9d68" : colors.border,
                      borderRadius: 10,
                      borderWidth: 1,
                      flex: 1,
                      paddingVertical: 9,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#ffffff" : colors.text,
                        fontWeight: "800",
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: 16,
            borderWidth: 1,
            marginBottom: 16,
            marginTop: 16,
            padding: 14,
          }}
        >
          <Text style={{ color: colors.secondary, fontWeight: "700" }}>
            Progresso da mostra
          </Text>
          <Text
            style={{ color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 5 }}
          >
            {teamsVisited} de {teams.length} equipes visitadas
          </Text>
          <View
            style={{
              backgroundColor: colors.border,
              borderRadius: 5,
              height: 9,
              marginTop: 12,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                backgroundColor: "#1f9d68",
                height: "100%",
                width: `${progressPercentage}%`,
              }}
            />
          </View>
          <Text style={{ color: colors.secondary, fontSize: 12, marginTop: 7 }}>
            {progressPercentage}% concluído
          </Text>
        </View>

        {usingMocks || syncError ? (
          <View
            style={{
              backgroundColor: colorScheme === "dark" ? "#2b224b" : "#eee8ff",
              borderRadius: 12,
              marginBottom: 14,
              padding: 11,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 12, lineHeight: 17 }}>
              {usingMocks
                ? "Modo demonstração: cadastre eventTeams e publique as regras para validar visitas reais."
                : "A sincronização da mostra está temporariamente indisponível."}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => void openScanner(null)}
          style={{
            alignItems: "center",
            backgroundColor: colors.selected,
            borderRadius: 15,
            marginTop: 16,
            padding: 15,
          }}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "900" }}>
            Ler QR Code
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <EventTeamCard
        dark={colorScheme === "dark"}
        onClose={() => setSelectedTeam(null)}
        onScan={() => void openScanner(selectedTeam)}
        team={selectedTeam}
        visited={Boolean(selectedTeam && visitedTeamIds.has(selectedTeam.id))}
      />

      <QrScannerModal
        cameraPermission={cameraPermission}
        instruction={
          scannerTeam
            ? `Escaneie o QR Code da ${scannerTeam.nome}, mesa ${scannerTeam.mesa}.`
            : "Escaneie o QR Code de uma equipe ativa do Sapucaí Rotas - Fetin."
        }
        onClose={() => {
          setScannerOpen(false);
          setScannerActive(false);
          scanInProgressRef.current = false;
        }}
        onQrCodeRead={validateEventQrCode}
        onRequestPermission={requestCameraPermission}
        scannerAtivo={scannerActive}
        visible={scannerOpen}
      />

      <EventVisitFeedback
        dark={colorScheme === "dark"}
        onClose={() => {
          setSelectedTeam(feedbackResult?.team || null);
          setFeedbackResult(null);
        }}
        position={feedbackPosition}
        result={feedbackResult}
      />
    </SafeAreaView>
  );
}
