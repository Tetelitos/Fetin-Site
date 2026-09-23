import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";

import { auth } from "../src/firebaseConfig";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);

  const handleLogin = async () => {
    setEntrando(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
      router.replace("/");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setEntrando(false);
    }
  };

  const inputStyle = {
    borderColor: "#d8d4e8",
    borderRadius: 10,
    borderWidth: 1,
    color: "#17132d",
    marginBottom: 12,
    padding: 13,
  } as const;

  return (
    <View
      style={{
        backgroundColor: "#f3f1ff",
        flex: 1,
        justifyContent: "center",
        padding: 20,
      }}
    >
      <View
        style={{
          alignSelf: "center",
          backgroundColor: "white",
          borderColor: "#ded8f2",
          borderRadius: 18,
          borderWidth: 1,
          maxWidth: 440,
          padding: 24,
          width: "100%",
        }}
      >
        <Text style={{ color: "#17132d", fontSize: 28, fontWeight: "900", marginBottom: 6 }}>
          Entrar
        </Text>
        <Text style={{ color: "#665f80", marginBottom: 20 }}>
          Acesse sua conta para continuar no Sapucaí Rotas - Fetin.
        </Text>

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#817a96"
          style={inputStyle}
          value={email}
        />
        <TextInput
          autoComplete="current-password"
          onChangeText={setSenha}
          onSubmitEditing={() => void handleLogin()}
          placeholder="Senha"
          placeholderTextColor="#817a96"
          secureTextEntry
          style={inputStyle}
          value={senha}
        />

        <TouchableOpacity
          disabled={entrando}
          onPress={() => void handleLogin()}
          style={{
            alignItems: "center",
            backgroundColor: "#6d3ee8",
            borderRadius: 10,
            opacity: entrando ? 0.65 : 1,
            padding: 14,
          }}
        >
          {entrando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "900" }}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/register")} style={{ padding: 14 }}>
          <Text style={{ color: "#6d3ee8", fontWeight: "800", textAlign: "center" }}>
            Criar uma conta
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
