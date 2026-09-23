import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";
import { PROJECT_OWNER_UID } from "@/src/constants/project";
import { db } from "@/src/firebaseConfig";
import { useAuthUser } from "@/src/hooks/useAuthUser";

type AdminUser = {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
  disabled: boolean;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value || "Não informado";
};

export default function AdminScreen() {
  const router = useRouter();
  const { colorScheme } = useAppTheme();
  const { user, loading: authLoading } = useAuthUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const dark = colorScheme === "dark";
  const colors = {
    background: dark ? "#070618" : "#f3f1ff",
    card: dark ? "#11102a" : "#ffffff",
    text: dark ? "#f7f4ff" : "#17132d",
    secondary: dark ? "#b8afd2" : "#665f80",
    border: dark ? "#312b57" : "#ded8f2",
    primary: dark ? "#8c62ff" : "#6d3ee8",
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    if (!authLoading && user && user.uid !== PROJECT_OWNER_UID) router.replace("/");
  }, [authLoading, router, user]);

  const loadUsers = useCallback(async () => {
    if (!user || user.uid !== PROJECT_OWNER_UID) return;

    setLoading(true);
    setError("");
    const currentAccount: AdminUser = {
      uid: user.uid,
      displayName: user.displayName?.trim() || user.email?.split("@")[0] || "Administrador",
      email: user.email ?? "",
      phoneNumber: user.phoneNumber ?? "",
      createdAt: user.metadata.creationTime ?? "",
      disabled: false,
    };

    let adminApiError = "";

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error("A função administrativa ainda não está disponível nesta publicação.");
      }

      const data = (await response.json()) as { users?: AdminUser[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível consultar o Firebase Authentication.");
      }
      if (!Array.isArray(data.users)) {
        throw new Error("A função administrativa retornou uma resposta inválida.");
      }

      setUsers(data.users);
      setLoading(false);
      return;
    } catch (apiError) {
      adminApiError =
        apiError instanceof Error
          ? apiError.message
          : "Não foi possível consultar o Firebase Authentication.";
    }

    try {
      const snapshot = await getDocs(collection(db, "users"));
      const savedUsers: AdminUser[] = snapshot.docs.map((userDoc) => {
        const data = userDoc.data();
        return {
          uid: userDoc.id,
          displayName:
            (typeof data.displayName === "string" && data.displayName.trim()) ||
            (typeof data.email === "string" ? data.email.split("@")[0] : "Usuário"),
          email: typeof data.email === "string" ? data.email : "",
          phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : "",
          createdAt: "",
          disabled: false,
        };
      });
      const currentSaved = savedUsers.find((item) => item.uid === user.uid);
      const combined = currentSaved
        ? savedUsers.map((item) =>
            item.uid === user.uid
              ? {
                  ...item,
                  displayName: user.displayName?.trim() || item.displayName,
                  email: user.email || item.email,
                }
              : item
          )
        : [currentAccount, ...savedUsers];

      setUsers(combined.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR")));
    } catch {
      try {
        const ownProfile = await getDoc(doc(db, "users", user.uid));
        const data = ownProfile.data();
        setUsers([
          {
            ...currentAccount,
            displayName:
              user.displayName?.trim() ||
              (typeof data?.displayName === "string" ? data.displayName : currentAccount.displayName),
            phoneNumber:
              typeof data?.phoneNumber === "string" ? data.phoneNumber : currentAccount.phoneNumber,
          },
        ]);
      } catch {
        setUsers([currentAccount]);
      }
      setError(
        `${adminApiError} Publique as regras atualizadas do Firestore para listar os perfis salvos. ` +
          "Para incluir também contas antigas, configure FIREBASE_SERVICE_ACCOUNT_JSON no Vercel e publique novamente."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const deleteAccount = async (account: AdminUser) => {
    if (!user || account.uid === PROJECT_OWNER_UID) return;
    const confirmed =
      typeof window === "undefined" ||
      window.confirm(`Apagar definitivamente a conta de ${account.displayName}?`);
    if (!confirmed) return;

    setDeletingUid(account.uid);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin-users", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid: account.uid }),
      });
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("A exclusão de contas deve ser testada pelo site publicado no Vercel.");
      }
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Não foi possível apagar a conta.");
      setUsers((current) => current.filter((item) => item.uid !== account.uid));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível apagar a conta.");
    } finally {
      setDeletingUid(null);
    }
  };

  if (authLoading || !user || user.uid !== PROJECT_OWNER_UID) {
    return (
      <View style={{ alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 22 }}>
          <TouchableOpacity
            accessibilityLabel="Voltar"
            onPress={() => router.replace("/")}
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
            <MaterialIcons color={colors.text} name="arrow-back" size={23} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.secondary, fontWeight: "700" }}>Acesso restrito</Text>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900", marginTop: 3 }}>
              Usuários
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Atualizar lista"
            disabled={loading}
            onPress={() => void loadUsers()}
            style={{
              alignItems: "center",
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: 22,
              borderWidth: 1,
              height: 44,
              justifyContent: "center",
              opacity: loading ? 0.6 : 1,
              width: 44,
            }}
          >
            <MaterialIcons color={colors.text} name="refresh" size={23} />
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.secondary, marginBottom: 14 }}>
          {users.length} {users.length === 1 ? "conta cadastrada" : "contas cadastradas"}
        </Text>

        {error ? (
          <View style={{ backgroundColor: dark ? "#3a171d" : "#fff0f0", borderRadius: 12, marginBottom: 14, padding: 13 }}>
            <Text style={{ color: dark ? "#ffb4bc" : "#a6212c" }}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={{ alignItems: "center", padding: 40 }}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : users.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: 20 }}>
            <Text style={{ color: colors.secondary }}>Nenhum usuário encontrado.</Text>
          </View>
        ) : (
          users.map((account) => {
            const isOwner = account.uid === PROJECT_OWNER_UID;
            const deleting = deletingUid === account.uid;
            return (
              <View
                key={account.uid}
                style={{
                  backgroundColor: colors.card,
                  borderColor: isOwner ? colors.primary : colors.border,
                  borderRadius: 16,
                  borderWidth: isOwner ? 2 : 1,
                  marginBottom: 12,
                  padding: 16,
                }}
              >
                <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
                      {account.displayName}
                    </Text>
                    <Text style={{ color: colors.secondary, marginTop: 6 }}>{account.email || "Email não informado"}</Text>
                    <Text style={{ color: colors.secondary, marginTop: 4 }}>{formatPhone(account.phoneNumber)}</Text>
                    {isOwner ? (
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900", marginTop: 8 }}>
                        ADMINISTRADOR
                      </Text>
                    ) : null}
                  </View>
                  {!isOwner ? (
                    <TouchableOpacity
                      accessibilityLabel={`Apagar conta de ${account.displayName}`}
                      disabled={Boolean(deletingUid)}
                      onPress={() => void deleteAccount(account)}
                      style={{
                        alignItems: "center",
                        backgroundColor: dark ? "#4a1f25" : "#fff0f0",
                        borderRadius: 10,
                        minWidth: 44,
                        opacity: deletingUid && !deleting ? 0.45 : 1,
                        padding: 11,
                      }}
                    >
                      {deleting ? (
                        <ActivityIndicator color="#c73340" />
                      ) : (
                        <MaterialIcons color="#c73340" name="delete-outline" size={22} />
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
