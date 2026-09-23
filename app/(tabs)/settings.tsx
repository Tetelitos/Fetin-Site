import { useRouter } from "expo-router";
import { reload, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAppTheme, type ThemeMode } from "@/hooks/use-app-theme";
import { PROJECT_OWNER_UID } from "@/src/constants/project";
import { auth, db } from "@/src/firebaseConfig";
import { useAuthUser } from "@/src/hooks/useAuthUser";
import { sincronizarPerfilRankingEvento } from "@/src/services/eventService";
import { sincronizarPerfilRanking } from "@/src/services/rankingService";
import { limparHistoricoUsuario } from "@/src/services/tourismService";

const themeOptions: { label: string; mode: ThemeMode }[] = [
  { label: "Claro", mode: "light" },
  { label: "Escuro", mode: "dark" },
];

const colors = {
  light: {
    background: "#f6f7f8",
    card: "#ffffff",
    text: "#111111",
    secondaryText: "#666666",
    mutedText: "#7a7f85",
    border: "#e7e9ec",
    separator: "#eeeeee",
    primary: "#111111",
    primaryText: "#ffffff",
    avatarBackground: "#111111",
    danger: "#b42318",
    dangerText: "#ffffff",
    segmentBackground: "#eef0f2",
    segmentSelected: "#ffffff",
    segmentSelectedText: "#111111",
    switchTrack: "#111111",
  },
  dark: {
    background: "#101416",
    card: "#1a2023",
    text: "#f4f6f7",
    secondaryText: "#b4bdc4",
    mutedText: "#8b969e",
    border: "#2a3338",
    separator: "#2a3338",
    primary: "#f4f6f7",
    primaryText: "#101416",
    avatarBackground: "#f4f6f7",
    danger: "#f97066",
    dangerText: "#101416",
    segmentBackground: "#11181b",
    segmentSelected: "#2a3338",
    segmentSelectedText: "#f4f6f7",
    switchTrack: "#8fd3ff",
  },
};

const getInitials = (name?: string | null, email?: string | null) => {
  const value = name?.trim() || email?.trim();
  if (!value) return "U";
  return value.slice(0, 1).toUpperCase();
};

const getFallbackName = (email?: string | null) => {
  if (!email) return "Usuario";
  return email.split("@")[0];
};

export default function SettingsTab() {
  const router = useRouter();
  const { colorScheme, setThemeMode, themeMode } = useAppTheme();
  const { user, loading } = useAuthUser();
  const [notificacoes, setNotificacoes] = useState(true);
  const [validacaoRapida, setValidacaoRapida] = useState(true);
  const [historicoLimpando, setHistoricoLimpando] = useState(false);
  const [nomeSalvando, setNomeSalvando] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const palette = colors[colorScheme];
  const isProjectOwner = user?.uid === PROJECT_OWNER_UID;
  const profileName = displayName.trim() || getFallbackName(user?.email);

  const initials = useMemo(
    () => getInitials(displayName, user?.email),
    [displayName, user?.email]
  );

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) {
      setProfilePhotoUri(null);
      return;
    }

    let active = true;

    const loadPersistedProfile = async () => {
      let photoURL = user.photoURL;

      try {
        await reload(user);
        photoURL = user.photoURL;

        const profileSnapshot = await getDoc(doc(db, "users", user.uid));
        const persistedPhotoURL = profileSnapshot.data()?.photoURL;

        if (typeof persistedPhotoURL === "string" && persistedPhotoURL.trim()) {
          photoURL = persistedPhotoURL;
        }
      } catch {
        // Mantém a foto disponível no Auth quando a leitura do Firestore falhar.
      }

      if (active) {
        setProfilePhotoUri(photoURL ?? null);
      }
    };

    void loadPersistedProfile();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    setDisplayName(user?.displayName || getFallbackName(user?.email));
  }, [user?.displayName, user?.email]);

  const handleSaveDisplayName = async () => {
    if (!user) return;

    const nome = displayName.trim();

    if (!nome) {
      Alert.alert("Nome vazio", "Digite um nome para salvar no perfil.");
      return;
    }

    setNomeSalvando(true);

    try {
      await updateProfile(user, { displayName: nome });
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: nome,
          email: user.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await Promise.allSettled([
        sincronizarPerfilRanking(user),
        sincronizarPerfilRankingEvento(user),
      ]);
      setDisplayName(nome);
      Alert.alert("Nome atualizado", "Seu nome foi salvo no perfil.");
    } catch (error) {
      Alert.alert(
        "Erro ao salvar nome",
        error instanceof Error ? error.message : "Nao foi possivel salvar seu nome."
      );
    } finally {
      setNomeSalvando(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      Alert.alert(
        "Erro ao sair",
        error instanceof Error ? error.message : "Não foi possível encerrar a sessão."
      );
    }
  };

  const limparHistorico = async () => {
    if (!user) return;

    setHistoricoLimpando(true);

    try {
      await limparHistoricoUsuario(user.uid);
      Alert.alert("Historico apagado", "Suas visitas e ranking foram zerados.");
    } catch (error) {
      Alert.alert(
        "Erro ao apagar historico",
        error instanceof Error ? error.message : "Nao foi possivel apagar seu historico."
      );
    } finally {
      setHistoricoLimpando(false);
    }
  };

  const handleClearHistory = () => {
    if (!isProjectOwner) return;

    Alert.alert(
      "Apagar historico?",
      "Isso remove suas visitas validadas, recompensas e sua pontuacao no ranking.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => {
            void limparHistorico();
          },
        },
      ]
    );
  };

  if (loading || !user) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: palette.background,
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 20, paddingTop: 64, paddingBottom: 32 }}
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: palette.mutedText, fontWeight: "700" }}>
          Conta e preferências
        </Text>
        <Text
          style={{
            color: palette.text,
            fontSize: 30,
            fontWeight: "bold",
            marginTop: 6,
          }}
        >
          Configurações
        </Text>
      </View>

      <View
        style={{
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderRadius: 8,
          borderWidth: 1,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: palette.text,
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 16,
          }}
        >
          Perfil
        </Text>

        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <View
            style={{
              width: 86,
              height: 86,
              borderRadius: 43,
              backgroundColor: palette.avatarBackground,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            {profilePhotoUri ? (
              <Image
                source={{ uri: profilePhotoUri }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <Text
                style={{
                  color: colorScheme === "dark" ? palette.primaryText : "white",
                  fontSize: 34,
                  fontWeight: "bold",
                }}
              >
                {initials}
              </Text>
            )}
          </View>

          <Text style={{ color: palette.text, fontSize: 22, fontWeight: "bold" }}>
            {profileName}
          </Text>
          <Text style={{ color: palette.secondaryText, marginTop: 4 }}>{user.email}</Text>

        </View>

        <View style={{ paddingVertical: 10 }}>
          <Text style={{ color: palette.secondaryText, marginBottom: 6 }}>
            Nome
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Digite seu nome"
            placeholderTextColor={palette.mutedText}
            style={{
              borderColor: palette.border,
              borderRadius: 8,
              borderWidth: 1,
              color: palette.text,
              padding: 12,
            }}
          />

          <TouchableOpacity
            onPress={handleSaveDisplayName}
            activeOpacity={0.85}
            disabled={nomeSalvando}
            style={{
              alignItems: "center",
              backgroundColor: palette.primary,
              borderRadius: 8,
              marginTop: 10,
              opacity: nomeSalvando ? 0.7 : 1,
              padding: 12,
            }}
          >
            <Text style={{ color: palette.primaryText, fontWeight: "bold" }}>
              {nomeSalvando ? "Salvando..." : "Salvar nome"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingVertical: 10 }}>
          <Text style={{ color: palette.secondaryText, marginBottom: 4 }}>Email</Text>
          <Text style={{ color: palette.text, fontWeight: "600" }}>{user.email}</Text>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: palette.separator,
            marginVertical: 6,
          }}
        />

        <View style={{ paddingVertical: 10 }}>
          <Text style={{ color: palette.secondaryText, marginBottom: 4 }}>
            ID do usuário
          </Text>
          <Text selectable style={{ color: palette.text, fontWeight: "600" }}>
            {user.uid}
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderRadius: 8,
          borderWidth: 1,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: palette.text,
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          Preferências
        </Text>

        <View style={{ paddingVertical: 10 }}>
          <Text style={{ color: palette.text, fontWeight: "600" }}>Aparência</Text>
          <Text style={{ color: palette.secondaryText, marginTop: 2 }}>
            Escolha entre modo claro e modo escuro.
          </Text>

          <View
            style={{
              flexDirection: "row",
              backgroundColor: palette.segmentBackground,
              borderRadius: 8,
              padding: 4,
              marginTop: 12,
            }}
          >
            {themeOptions.map((option) => {
              const selected = themeMode === option.mode;

              return (
                <TouchableOpacity
                  key={option.mode}
                  activeOpacity={0.85}
                  onPress={() => setThemeMode(option.mode)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    borderRadius: 6,
                    backgroundColor: selected ? palette.segmentSelected : "transparent",
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      color: selected
                        ? palette.segmentSelectedText
                        : palette.secondaryText,
                      fontWeight: "700",
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: palette.separator,
            marginVertical: 6,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: palette.text, fontWeight: "600" }}>
              Notificações da mostra
            </Text>
            <Text style={{ color: palette.secondaryText, marginTop: 2 }}>
              Avisos de progresso e recompensas.
            </Text>
          </View>
          <Switch
            value={notificacoes}
            onValueChange={setNotificacoes}
            trackColor={{ true: palette.switchTrack }}
          />
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: palette.separator,
            marginVertical: 6,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: palette.text, fontWeight: "600" }}>
              Validação rápida
            </Text>
            <Text style={{ color: palette.secondaryText, marginTop: 2 }}>
              Mantém o leitor de QR pronto ao abrir o scanner.
            </Text>
          </View>
          <Switch
            value={validacaoRapida}
            onValueChange={setValidacaoRapida}
            trackColor={{ true: palette.switchTrack }}
          />
        </View>

        {isProjectOwner ? (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: palette.separator,
                marginVertical: 6,
              }}
            />

            <View style={{ paddingVertical: 10 }}>
              <Text style={{ color: palette.text, fontWeight: "600" }}>
                Historico de visitas
              </Text>
              <Text style={{ color: palette.secondaryText, marginTop: 2 }}>
                Remove suas visitas validadas e zera sua posicao no ranking.
              </Text>

              <TouchableOpacity
                onPress={handleClearHistory}
                activeOpacity={0.85}
                disabled={historicoLimpando}
                style={{
                  alignItems: "center",
                  backgroundColor: palette.danger,
                  borderRadius: 8,
                  marginTop: 12,
                  opacity: historicoLimpando ? 0.7 : 1,
                  padding: 12,
                }}
              >
                <Text style={{ color: palette.dangerText, fontWeight: "bold" }}>
                  {historicoLimpando ? "Apagando..." : "Apagar historico"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>

      {isProjectOwner ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/admin")}
          style={{
            alignItems: "center",
            backgroundColor: palette.card,
            borderColor: palette.border,
            borderRadius: 8,
            borderWidth: 1,
            marginBottom: 12,
            padding: 14,
          }}
        >
          <Text style={{ color: palette.text, fontWeight: "bold" }}>
            Gerenciar usuários
          </Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.85}
        style={{
          backgroundColor: palette.primary,
          padding: 14,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: palette.primaryText, fontWeight: "bold" }}>
          Sair da conta
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
