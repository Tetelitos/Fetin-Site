import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { auth, db } from "../src/firebaseConfig";

export default function Register() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const handleRegister = async () => {
    try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);

    await setDoc(
      doc(db, "users", userCredential.user.uid),
      {
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => undefined);

    alert("Usuário criado com sucesso!");
    router.replace("/");
  } catch (error: any) {
    alert(error.message);
  }
};

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          marginBottom: 20,
          textAlign: "center",
          color: "black",
        }}
      >
        Cadastro
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="gray"
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10,
          borderRadius: 5,
          color: "black",
        }}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Senha"
        placeholderTextColor="gray"
        secureTextEntry
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10,
          borderRadius: 5,
          color: "black",
        }}
        onChangeText={setSenha}
      />

      <Button title="Cadastrar" onPress={handleRegister} />

      <Text
        style={{
          marginTop: 20,
          textAlign: "center",
          color: "black",
        }}
      >
        Já tem conta?
      </Text>

      <Button
        title="Ir para Login"
        onPress={() => router.push("/login")}
      />
    </View>
  );
}
