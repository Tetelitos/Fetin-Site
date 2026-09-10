import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from "@firebase/auth";
import type { FirebaseApp } from "firebase/app";

export const initializeFirebaseAuth = (app: FirebaseApp): Auth => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh pode tentar inicializar o Auth mais de uma vez.
    return getAuth(app);
  }
};
