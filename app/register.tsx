import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, deleteUser, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";

import { auth, db } from "../src/firebaseConfig";

const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 11);

const formatPhone = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export default function Register() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  const handleRegister = async () => {
    const nomeNormalizado = nome.trim();
    const emailNormalizado = email.trim().toLowerCase();
    const telefoneDigitos = onlyDigits(telefone);

    if (!nomeNormalizado) {
      alert("Digite seu nome.");
      return;
    }

    if (!/^[1-9]{2}\d{8,9}$/.test(telefoneDigitos)) {
      alert("Digite um telefone válido com DDD, usando 10 ou 11 números.");
      return;
    }

    setSalvando(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        emailNormalizado,
        senha
      );
      const phoneNumber = `+55${telefoneDigitos}`;

      try {
        await updateProfile(userCredential.user, { displayName: nomeNormalizado });
        await setDoc(doc(db, "users", userCredential.user.uid), {
          displayName: nomeNormalizado,
          email: emailNormalizado,
          phoneNumber,
          createdAt: serverTimestamp(),
        });
      } catch (profileError) {
        await deleteUser(userCredential.user).catch(() => undefined);
        throw profileError;
      }

      alert("Usuário criado com sucesso!");
      router.replace("/");
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setSalvando(false);
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
          Criar conta
        </Text>
        <Text style={{ color: "#665f80", marginBottom: 20 }}>
          Cadastre seus dados para participar do Sapucaí Rotas - Fetin.
        </Text>

        <TextInput
          autoComplete="name"
          onChangeText={setNome}
          placeholder="Nome completo"
          placeholderTextColor="#817a96"
          style={inputStyle}
          value={nome}
        />
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
          autoComplete="tel"
          keyboardType="phone-pad"
          maxLength={15}
          onChangeText={(value) => setTelefone(formatPhone(value))}
          placeholder="Telefone com DDD"
          placeholderTextColor="#817a96"
          style={inputStyle}
          value={telefone}
        />
        <TextInput
          autoComplete="new-password"
          onChangeText={setSenha}
          placeholder="Senha"
          placeholderTextColor="#817a96"
          secureTextEntry
          style={inputStyle}
          value={senha}
        />

        <TouchableOpacity
          disabled={salvando}
          onPress={() => void handleRegister()}
          style={{
            alignItems: "center",
            backgroundColor: "#6d3ee8",
            borderRadius: 10,
            opacity: salvando ? 0.65 : 1,
            padding: 14,
          }}
        >
          {salvando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "900" }}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/login")} style={{ padding: 14 }}>
          <Text style={{ color: "#6d3ee8", fontWeight: "800", textAlign: "center" }}>
            Já tenho uma conta
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
