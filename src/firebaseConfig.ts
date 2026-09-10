import { decode } from "base-64";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import { initializeFirebaseAuth } from "@/src/firebaseAuth";

// O Firebase Storage precisa de um decodificador Base64 compatível com Expo.
globalThis.atob = decode;

const firebaseConfig = {
  apiKey: "AIzaSyD4rPZK6KdyUvdqUNgybBGtlG1PaJy3RRc",
  authDomain: "turismo-app-dc382.firebaseapp.com",
  projectId: "turismo-app-dc382",
  storageBucket: "turismo-app-dc382.firebasestorage.app",
  messagingSenderId: "603141136894",
  appId: "1:603141136894:web:5e8add25623525213360af",
};
const app = initializeApp(firebaseConfig);

export const auth = initializeFirebaseAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
