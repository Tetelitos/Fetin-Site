import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { auth } from "../src/firebaseConfig";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      router.replace("/");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Não foi possível entrar.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white", justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 28, marginBottom: 20, textAlign: "center", color: "black" }}>
        Login
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="gray"
        style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 5, color: "black" }}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Senha"
        placeholderTextColor="gray"
        secureTextEntry
        style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 5, color: "black" }}
        onChangeText={setSenha}
      />

      <Button title="Entrar" onPress={handleLogin} />

      <Text style={{ marginTop: 20, textAlign: "center", color: "black" }}>
        Não tem conta?
      </Text>

      <Button title="Criar conta" onPress={() => router.push("/register")} />
    </View>
  );
}
