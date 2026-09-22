import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCkT8uAVMgFfkMEQLI82ZYcmMrQJwra92Q",
  authDomain: "naxchat-27309.firebaseapp.com",
  projectId: "naxchat-27309",
  storageBucket: "naxchat-27309.firebasestorage.app",
  messagingSenderId: "138730719673",
  appId: "1:138730719673:web:7761e0c196d563f5164e68"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
